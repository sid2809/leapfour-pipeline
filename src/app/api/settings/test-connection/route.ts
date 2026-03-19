import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSetting, getSettingWithEnvFallback } from '@/lib/settings';
import { SETTINGS_KEYS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { service } = await request.json();

    if (service === 'outscraper') {
      const apiKey = await getSettingWithEnvFallback(
        SETTINGS_KEYS.OUTSCRAPER_API_KEY,
        'OUTSCRAPER_API_KEY'
      );
      if (!apiKey) {
        return NextResponse.json({ success: false, error: 'API key not configured' });
      }
      // Outscraper: GET /profile to test key validity
      const res = await fetch('https://api.app.outscraper.com/profile', {
        headers: { 'X-API-KEY': apiKey },
      });
      if (!res.ok) {
        return NextResponse.json({ success: false, error: `Outscraper returned ${res.status}` });
      }
      const data = await res.json();
      return NextResponse.json({ success: true, message: `Connected. Balance: $${data?.balance || 'unknown'}` });
    }

    if (service === 'dataforseo') {
      const login = await getSettingWithEnvFallback(SETTINGS_KEYS.DATAFORSEO_LOGIN, 'DATAFORSEO_LOGIN');
      const password = await getSettingWithEnvFallback(SETTINGS_KEYS.DATAFORSEO_PASSWORD, 'DATAFORSEO_PASSWORD');
      if (!login || !password) {
        return NextResponse.json({ success: false, error: 'DataForSEO credentials not configured' });
      }
      const authStr = Buffer.from(`${login}:${password}`).toString('base64');
      // Test with a location lookup
      const res = await fetch(
        'https://api.dataforseo.com/v3/serp/google/locations?limit=1&country=US',
        { headers: { Authorization: `Basic ${authStr}`, 'Content-Type': 'application/json' } }
      );
      if (!res.ok) {
        return NextResponse.json({ success: false, error: `DataForSEO returned ${res.status}` });
      }
      return NextResponse.json({ success: true, message: 'Connected successfully' });
    }

    if (service === 'pagespeed') {
      const apiKey = await getSettingWithEnvFallback(SETTINGS_KEYS.PAGESPEED_API_KEY, 'PAGESPEED_API_KEY');
      if (!apiKey) {
        return NextResponse.json({ success: false, error: 'API key not configured' });
      }
      // Test with google.com
      const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://google.com&category=performance&strategy=mobile&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        return NextResponse.json({ success: false, error: `PageSpeed API returned ${res.status}` });
      }
      return NextResponse.json({ success: true, message: 'Connected successfully' });
    }

    if (service === 'instantly') {
      const apiKey = await getSettingWithEnvFallback(SETTINGS_KEYS.INSTANTLY_API_KEY, 'INSTANTLY_API_KEY');
      if (!apiKey) {
        return NextResponse.json({ success: false, error: 'API key not configured' });
      }
      const res = await fetch('https://api.instantly.ai/api/v2/campaigns?limit=1', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return NextResponse.json({ success: false, error: `Instantly returned ${res.status}` });
      }
      return NextResponse.json({ success: true, message: 'Connected successfully' });
    }

    return NextResponse.json({ error: 'Unknown service' }, { status: 400 });
  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    });
  }
}
