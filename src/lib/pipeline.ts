// ============================================================
// Pipeline Orchestrator
// Coordinates: scrape complete → filter → enrich → categorize
// ============================================================

import { prisma } from './db';
import { processOutscraperResult } from './cleaning';

export async function processScrapedResults(
  campaignId: string,
  rawResults: Record<string, unknown>[]
): Promise<{
  totalScraped: number;
  totalFiltered: number;
  totalFilteredNoSite: number;
  totalParked: number;
}> {
  let totalScraped = 0;
  let totalFiltered = 0;
  let totalFilteredNoSite = 0;
  let totalParked = 0;

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'FILTERING' },
  });

  const seenEmails = new Set<string>();
  const seenPlaceIds = new Set<string>();

  for (const raw of rawResults) {
    try {
      const cleaned = processOutscraperResult(raw);

      if (cleaned.email && seenEmails.has(cleaned.email)) continue;
      if (cleaned.email) seenEmails.add(cleaned.email);

      if (cleaned.googlePlaceId && seenPlaceIds.has(cleaned.googlePlaceId)) continue;
      if (cleaned.googlePlaceId) seenPlaceIds.add(cleaned.googlePlaceId);

      await prisma.lead.create({
        data: {
          campaignId,
          status: cleaned.status,
          businessName: cleaned.businessName,
          businessNameRaw: cleaned.businessNameRaw,
          contactName: cleaned.contactName,
          firstName: cleaned.firstName,
          email: cleaned.email,
          email2: cleaned.email2,
          email3: cleaned.email3,
          emailType: cleaned.emailType,
          phone: cleaned.phone,
          website: cleaned.website,
          websiteRaw: cleaned.websiteRaw,
          websiteDisplay: cleaned.websiteDisplay,
          address: cleaned.address,
          city: cleaned.city,
          country: cleaned.country,
          googleRating: cleaned.googleRating,
          reviewCount: cleaned.reviewCount,
          reviewsPerScore: cleaned.reviewsPerScore || undefined,
          businessHours: cleaned.businessHours || undefined,
          businessCategory: cleaned.businessCategory,
          isVerified: cleaned.isVerified,
          googleMapsUrl: cleaned.googleMapsUrl,
          googlePlaceId: cleaned.googlePlaceId,
          facebookUrl: cleaned.facebookUrl,
          instagramUrl: cleaned.instagramUrl,
          linkedinUrl: cleaned.linkedinUrl,
        },
      });

      totalScraped++;
      if (cleaned.status === 'FILTERED') totalFiltered++;
      else if (cleaned.status === 'FILTERED_NO_SITE') totalFilteredNoSite++;
      else if (cleaned.status === 'PARKED') totalParked++;
    } catch (err) {
      console.error('Error processing lead:', err);
    }
  }

  let nextStatus: string;
  if (totalFiltered > 0) {
    nextStatus = 'ENRICHING';
  } else if (totalFilteredNoSite > 0) {
    nextStatus = 'ENRICHING';
  } else {
    nextStatus = 'READY';
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      totalScraped,
      totalFiltered: totalFiltered + totalFilteredNoSite,
      totalParked,
      status: nextStatus,
    },
  });

  await prisma.jobLog.create({
    data: {
      campaignId,
      action: 'FILTER_COMPLETE',
      details: { totalScraped, totalFiltered, totalFilteredNoSite, totalParked },
    },
  });

  return { totalScraped, totalFiltered, totalFilteredNoSite, totalParked };
}

export async function getCampaignStats(campaignId: string) {
  const [campaign, statusCounts, categoryCounts] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true, name: true, status: true,
        totalScraped: true, totalFiltered: true, totalParked: true,
        totalEnriched: true, totalFailed: true,
        pipelineStartedAt: true, createdAt: true,
      },
    }),
    prisma.lead.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: true,
    }),
    prisma.lead.groupBy({
      by: ['category'],
      where: { campaignId, category: { not: null } },
      _count: true,
    }),
  ]);

  if (!campaign) return null;

  const byStatus: Record<string, number> = {};
  for (const row of statusCounts) {
    byStatus[row.status] = row._count;
  }

  const byCategory: Record<string, number> = {};
  for (const row of categoryCounts) {
    if (row.category) byCategory[row.category] = row._count;
  }

  const totalLeads = Object.values(byStatus).reduce((a, b) => a + b, 0);

  return {
    ...campaign,
    totalLeads,
    byStatus,
    byCategory,
    totalExported: byStatus['EXPORTED'] || 0,
    totalReady: byStatus['READY'] || 0,
    totalCategorized: byStatus['CATEGORIZED'] || 0,
    totalSkipped: byStatus['SKIPPED'] || 0,
  };
}

export async function handleScrapeComplete(
  campaignId: string,
  rawResults: Record<string, unknown>[]
): Promise<void> {
  await prisma.jobLog.create({
    data: {
      campaignId,
      action: 'SCRAPE_COMPLETE',
      details: { resultCount: rawResults.length },
    },
  });

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      outscraperRaw: JSON.parse(JSON.stringify(rawResults)),
    },
  });

  await processScrapedResults(campaignId, rawResults);
}
