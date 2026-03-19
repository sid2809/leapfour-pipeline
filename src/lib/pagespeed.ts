import { getSetting } from './settings';
import { SETTINGS_KEYS } from './constants';

const BASE_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

export interface PageSpeedResult {
  score: number;
  mobile: string;
  loadTime: number;
  lcp: number;
  inp: number;
  cls: number;
  issues: string[];
}

async function getApiKey(): Promise<string> {
  const key = await getSetting(SETTINGS_KEYS.PAGESPEED_API_KEY);
  if (!key) throw new Error('PageSpeed API key not configured. Go to Settings to add it.');
  return key;
}

export async function runPageSpeed(websiteUrl: string): Promise<PageSpeedResult> {
  const apiKey = await getApiKey();

  const params = new URLSearchParams({
    url: websiteUrl,
    category: 'performance',
    strategy: 'mobile',
    key: apiKey,
  });

  const response = await fetch(`${BASE_URL}?${params}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PageSpeed API error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  const lighthouse = data.lighthouseResult;
  if (!lighthouse) throw new Error('PageSpeed returned no lighthouse results');

  const rawScore = lighthouse.categories?.performance?.score;
  const score = rawScore != null ? Math.round(rawScore * 100) : 0;

  let mobile = 'poor';
  if (score >= 90) mobile = 'good';
  else if (score >= 50) mobile = 'needs-improvement';

  const speedIndex = lighthouse.audits?.['speed-index']?.numericValue || 0;
  const lcp = lighthouse.audits?.['largest-contentful-paint']?.numericValue || 0;
  const inp = lighthouse.audits?.['interactive']?.numericValue || 0;
  const cls = lighthouse.audits?.['cumulative-layout-shift']?.numericValue || 0;

  const issues: string[] = [];
  if (lighthouse.audits) {
    for (const [, audit] of Object.entries(lighthouse.audits) as [string, Record<string, unknown>][]) {
      if (audit.score != null && typeof audit.score === 'number' && audit.score < 0.5 && audit.title && typeof audit.title === 'string' && issues.length < 5) {
        issues.push(audit.title);
      }
    }
  }

  return {
    score,
    mobile,
    loadTime: Math.round(speedIndex / 100) / 10,
    lcp: Math.round(lcp / 100) / 10,
    inp: Math.round(inp / 100) / 10,
    cls: Math.round(cls * 1000) / 1000,
    issues,
  };
}

export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const apiKey = await getApiKey();
    const params = new URLSearchParams({ url: 'https://www.google.com', category: 'performance', strategy: 'mobile', key: apiKey });
    const response = await fetch(`${BASE_URL}?${params}`, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: message };
  }
}
