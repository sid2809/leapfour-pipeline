// ============================================================
// GET  /api/campaigns       — list all campaigns (paginated)
// POST /api/campaigns       — create campaign + trigger scrape
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { startScrape, buildSearchQuery } from '@/lib/outscraper';
import { getScoringThresholds } from '@/lib/settings';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true, name: true, niche: true, city: true, country: true,
        status: true, leadTarget: true, totalScraped: true, totalFiltered: true,
        totalParked: true, totalEnriched: true, totalFailed: true,
        createdAt: true, updatedAt: true,
      },
    }),
    prisma.campaign.count({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    campaigns,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const {
    name, niche, city, country, stateRegion, leadTarget,
    searchQueryOverride, serpKeywordOverride, overscrapeMultOverride, isTest,
  } = body;

  if (!name || !niche || !city || !country || !leadTarget) {
    return NextResponse.json(
      { error: 'Missing required fields: name, niche, city, country, leadTarget' },
      { status: 400 }
    );
  }

  const searchQuery = searchQueryOverride || buildSearchQuery(niche, city, stateRegion, country);
  const serpKeyword = serpKeywordOverride || niche;

  const thresholds = await getScoringThresholds();
  const overscrapeMult = overscrapeMultOverride
    ? parseFloat(overscrapeMultOverride)
    : thresholds.overscrapeMultiplier;

  const campaign = await prisma.campaign.create({
    data: {
      userId: user.id, name, niche, searchQuery, serpKeyword,
      city, country, stateRegion: stateRegion || null,
      leadTarget: parseInt(leadTarget), overscrapeMult,
      isTest: isTest || false, status: 'SCRAPING', pipelineStartedAt: new Date(),
    },
  });

  // Test mode caps at 10 businesses
  let scrapeLimit = Math.ceil(parseInt(leadTarget) * overscrapeMult);
  if (isTest) scrapeLimit = Math.min(scrapeLimit, 10);
  const regionCode = extractRegionCode(country);

  try {
    const { requestId } = await startScrape(searchQuery, scrapeLimit, regionCode);

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { outscraperId: requestId },
    });

    await prisma.jobLog.create({
      data: {
        campaignId: campaign.id,
        action: 'SCRAPE_START',
        details: { query: searchQuery, limit: scrapeLimit, region: regionCode, outscraperId: requestId },
      },
    });

    return NextResponse.json({
      campaign: { id: campaign.id, name: campaign.name, status: 'SCRAPING', outscraperId: requestId },
      message: 'Campaign created. Outscraper scrape started.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to start scrape';
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'FAILED' } });
    await prisma.jobLog.create({
      data: { campaignId: campaign.id, action: 'ERROR', details: { step: 'SCRAPE_START', error: message } },
    });

    return NextResponse.json(
      { campaign: { id: campaign.id, name: campaign.name, status: 'FAILED' }, error: message },
      { status: 500 }
    );
  }
}

function extractRegionCode(country: string): string {
  const map: Record<string, string> = {
    'US': 'US', 'USA': 'US', 'United States': 'US',
    'UK': 'GB', 'United Kingdom': 'GB',
    'India': 'IN', 'Australia': 'AU', 'Canada': 'CA', 'Germany': 'DE', 'France': 'FR',
  };
  const mapped = map[country];
  if (mapped) return mapped;
  if (country.length === 2) return country.toUpperCase();
  return 'US';
}
