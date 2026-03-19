import { prisma } from './db';
import { getSettings } from './settings';
import { SETTINGS_KEYS } from './constants';
import { normalizeDomain, fuzzyNameMatch } from './cleaning';

const BASE_URL = 'https://api.dataforseo.com/v3';
const CACHE_DURATION_HOURS = 72;

export interface LocalPackItem {
  title: string;
  domain: string | null;
  rating: number | null;
  reviewsCount: number | null;
  phone: string | null;
  address: string | null;
}

export interface PaidItem {
  title: string;
  domain: string | null;
}

export interface SerpData {
  localPack: LocalPackItem[];
  paidResults: PaidItem[];
  localPackExists: boolean;
}

export interface LeadSerpMatch {
  inLocalPack: boolean;
  localPackPosition: number | null;
  localPackExists: boolean;
  hasPaidAds: boolean;
  competitor1Name: string | null;
  competitor1Rating: number | null;
  competitor1Reviews: number | null;
  competitor2Name: string | null;
  competitor2Rating: number | null;
  competitor2Reviews: number | null;
  competitor3Name: string | null;
  competitor3Rating: number | null;
  competitor3Reviews: number | null;
}

async function getAuth(): Promise<string> {
  const settings = await getSettings([SETTINGS_KEYS.DATAFORSEO_LOGIN, SETTINGS_KEYS.DATAFORSEO_PASSWORD]);
  const login = settings[SETTINGS_KEYS.DATAFORSEO_LOGIN];
  const password = settings[SETTINGS_KEYS.DATAFORSEO_PASSWORD];
  if (!login || !password) throw new Error('DataForSEO credentials not configured. Go to Settings to add them.');
  return Buffer.from(`${login}:${password}`).toString('base64');
}

export async function getSerpData(serpKeyword: string, city: string, stateRegion: string | null, country: string): Promise<SerpData> {
  const cacheKey = [serpKeyword, city, stateRegion || '', country].map(s => s.toLowerCase().trim()).join('_').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  const cached = await prisma.serpCache.findFirst({ where: { cacheKey, expiresAt: { gt: new Date() } } });
  if (cached) {
    return {
      localPack: (cached.localPack as unknown as LocalPackItem[]) || [],
      paidResults: (cached.paidResults as unknown as PaidItem[]) || [],
      localPackExists: Array.isArray(cached.localPack) && (cached.localPack as unknown[]).length > 0,
    };
  }

  const auth = await getAuth();
  const locationName = stateRegion ? `${city},${stateRegion},${country}` : `${city},${country}`;

  const body = [{ keyword: serpKeyword, location_name: locationName, language_code: 'en', device: 'mobile', os: 'android' }];

  const response = await fetch(`${BASE_URL}/serp/google/organic/live/advanced`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DataForSEO API error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  const task = data.tasks?.[0];
  if (!task || task.status_code !== 20000) throw new Error(`DataForSEO task error: ${task?.status_message || 'Unknown error'}`);

  const items = task.result?.[0]?.items || [];
  const localPack: LocalPackItem[] = [];
  const paidResults: PaidItem[] = [];

  for (const item of items) {
    if (item.type === 'local_pack') {
      for (const pi of (item.items || [])) {
        localPack.push({ title: pi.title || '', domain: pi.domain || null, rating: pi.rating?.value || null, reviewsCount: pi.rating?.votes_count || null, phone: pi.phone || null, address: pi.address || null });
      }
    }
    if (item.type === 'paid') {
      paidResults.push({ title: item.title || '', domain: item.domain || null });
    }
  }

  const serpData: SerpData = { localPack, paidResults, localPackExists: localPack.length > 0 };

  await prisma.serpCache.upsert({
    where: { cacheKey },
    update: { keyword: serpKeyword, locationName, response: JSON.parse(JSON.stringify(items)), localPack: JSON.parse(JSON.stringify(localPack)), paidResults: JSON.parse(JSON.stringify(paidResults)), fetchedAt: new Date(), expiresAt: new Date(Date.now() + CACHE_DURATION_HOURS * 60 * 60 * 1000) },
    create: { cacheKey, keyword: serpKeyword, locationName, response: JSON.parse(JSON.stringify(items)), localPack: JSON.parse(JSON.stringify(localPack)), paidResults: JSON.parse(JSON.stringify(paidResults)), fetchedAt: new Date(), expiresAt: new Date(Date.now() + CACHE_DURATION_HOURS * 60 * 60 * 1000) },
  });

  return serpData;
}

export function matchLeadAgainstSerp(leadWebsite: string | null, leadBusinessName: string, serpData: SerpData): LeadSerpMatch {
  const result: LeadSerpMatch = { inLocalPack: false, localPackPosition: null, localPackExists: serpData.localPackExists, hasPaidAds: false, competitor1Name: null, competitor1Rating: null, competitor1Reviews: null, competitor2Name: null, competitor2Rating: null, competitor2Reviews: null, competitor3Name: null, competitor3Rating: null, competitor3Reviews: null };

  if (!serpData.localPackExists) return result;

  const leadDomain = normalizeDomain(leadWebsite);

  for (let i = 0; i < serpData.localPack.length; i++) {
    const item = serpData.localPack[i];
    const itemDomain = normalizeDomain(item.domain);
    let matched = false;
    if (leadDomain && itemDomain && leadDomain === itemDomain) matched = true;
    if (!matched && fuzzyNameMatch(leadBusinessName, item.title)) matched = true;
    if (matched) { result.inLocalPack = true; result.localPackPosition = i + 1; break; }
  }

  const competitors = serpData.localPack.filter((_, i) => !(result.inLocalPack && result.localPackPosition === i + 1));
  if (competitors[0]) { result.competitor1Name = competitors[0].title; result.competitor1Rating = competitors[0].rating; result.competitor1Reviews = competitors[0].reviewsCount; }
  if (competitors[1]) { result.competitor2Name = competitors[1].title; result.competitor2Rating = competitors[1].rating; result.competitor2Reviews = competitors[1].reviewsCount; }
  if (competitors[2]) { result.competitor3Name = competitors[2].title; result.competitor3Rating = competitors[2].rating; result.competitor3Reviews = competitors[2].reviewsCount; }

  for (const item of serpData.paidResults) {
    const itemDomain = normalizeDomain(item.domain);
    if (leadDomain && itemDomain && leadDomain === itemDomain) { result.hasPaidAds = true; break; }
    if (fuzzyNameMatch(leadBusinessName, item.title)) { result.hasPaidAds = true; break; }
  }

  return result;
}

export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await getAuth();
    const response = await fetch(`${BASE_URL}/appendix/user_data`, { method: 'GET', headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' } });
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: message };
  }
}
