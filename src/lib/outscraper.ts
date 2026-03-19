// ============================================================
// Outscraper API Client
// Handles: start async scrape, poll job status, parse results
// ============================================================

import { getSetting } from './settings';
import { SETTINGS_KEYS } from './constants';

const BASE_URL = 'https://api.app.outscraper.com';

export interface OutscraperStartResult {
  requestId: string;
}

export interface OutscraperPollResult {
  status: 'Pending' | 'Running' | 'Success' | 'Error';
  data: Record<string, unknown>[] | null;
  errorMessage?: string;
}

async function getApiKey(): Promise<string> {
  const key = await getSetting(SETTINGS_KEYS.OUTSCRAPER_API_KEY);
  if (!key) throw new Error('Outscraper API key not configured. Go to Settings to add it.');
  return key;
}

export async function startScrape(
  query: string,
  limit: number,
  region: string = 'US'
): Promise<OutscraperStartResult> {
  const apiKey = await getApiKey();

  const params = new URLSearchParams({
    query,
    limit: String(limit),
    language: 'en',
    region: region.toUpperCase(),
    async: 'true',
    dropDuplicates: 'true',
  });
  params.append('enrichment', 'domains_service');

  const response = await fetch(`${BASE_URL}/maps/search-v3?${params}`, {
    method: 'GET',
    headers: {
      'X-API-KEY': apiKey,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Outscraper API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  const requestId = data.id || data.request_id;
  if (!requestId) {
    throw new Error('No request ID returned. Outscraper may have returned sync results.');
  }

  return { requestId };
}

export async function pollScrapeStatus(requestId: string): Promise<OutscraperPollResult> {
  const apiKey = await getApiKey();

  const response = await fetch(`${BASE_URL}/requests/${requestId}`, {
    method: 'GET',
    headers: {
      'X-API-KEY': apiKey,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Outscraper poll error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const status = data.status || 'Pending';

  if (status === 'Success') {
    let results: Record<string, unknown>[] = [];
    if (Array.isArray(data.data)) {
      if (Array.isArray(data.data[0])) {
        results = data.data[0];
      } else {
        results = data.data;
      }
    }

    return { status: 'Success', data: results };
  }

  if (status === 'Error') {
    return {
      status: 'Error',
      data: null,
      errorMessage: data.error || data.message || 'Unknown Outscraper error',
    };
  }

  return { status: status as 'Pending' | 'Running', data: null };
}

export async function testConnection(): Promise<{ ok: boolean; balance?: string; error?: string }> {
  try {
    const apiKey = await getApiKey();

    const response = await fetch(`${BASE_URL}/billing`, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return {
      ok: true,
      balance: data.balance != null ? `$${data.balance}` : '$unknown',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: message };
  }
}

export function buildSearchQuery(
  niche: string,
  city: string,
  stateRegion: string | null,
  country: string
): string {
  if (stateRegion) {
    return `${niche} in ${city}, ${stateRegion}, ${country}`;
  }
  return `${niche} in ${city}, ${country}`;
}
