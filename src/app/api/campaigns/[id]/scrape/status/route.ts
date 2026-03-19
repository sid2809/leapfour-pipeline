// ============================================================
// GET /api/campaigns/[id]/scrape/status — Poll Outscraper job
// Has race condition guard to prevent double-processing
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { pollScrapeStatus } from '@/lib/outscraper';
import { handleScrapeComplete } from '@/lib/pipeline';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: user.id },
    select: { id: true, status: true, outscraperId: true, totalScraped: true, totalFiltered: true, totalParked: true },
  });

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  if (campaign.status !== 'SCRAPING') {
    return NextResponse.json({
      campaignStatus: campaign.status,
      scrapeStatus: campaign.status === 'FAILED' ? 'Error' : 'Complete',
      totalScraped: campaign.totalScraped, totalFiltered: campaign.totalFiltered, totalParked: campaign.totalParked,
    });
  }

  if (!campaign.outscraperId) {
    return NextResponse.json({ campaignStatus: campaign.status, scrapeStatus: 'Error', error: 'No Outscraper request ID found' });
  }

  try {
    const result = await pollScrapeStatus(campaign.outscraperId);

    if (result.status === 'Success' && result.data) {
      // Race condition guard: atomically claim processing
      const claimed = await prisma.campaign.updateMany({
        where: { id: campaign.id, status: 'SCRAPING' },
        data: { status: 'FILTERING' },
      });

      if (claimed.count === 0) {
        const current = await prisma.campaign.findUnique({
          where: { id: campaign.id },
          select: { status: true, totalScraped: true, totalFiltered: true, totalParked: true },
        });
        return NextResponse.json({
          campaignStatus: current?.status || 'FILTERING', scrapeStatus: 'Success',
          totalScraped: current?.totalScraped || 0, totalFiltered: current?.totalFiltered || 0,
          totalParked: current?.totalParked || 0, message: 'Scrape complete. Processing already in progress.',
        });
      }

      await handleScrapeComplete(campaign.id, result.data);

      const final = await prisma.campaign.findUnique({
        where: { id: campaign.id },
        select: { status: true, totalScraped: true, totalFiltered: true, totalParked: true },
      });

      return NextResponse.json({
        campaignStatus: final?.status || 'ENRICHING', scrapeStatus: 'Success',
        totalScraped: final?.totalScraped || 0, totalFiltered: final?.totalFiltered || 0,
        totalParked: final?.totalParked || 0,
        message: `Scrape complete. ${result.data.length} businesses found.`,
      });
    }

    if (result.status === 'Error') {
      await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'FAILED' } });
      await prisma.jobLog.create({
        data: { campaignId: campaign.id, action: 'ERROR', details: { step: 'SCRAPE', error: result.errorMessage } },
      });
      return NextResponse.json({ campaignStatus: 'FAILED', scrapeStatus: 'Error', error: result.errorMessage || 'Outscraper scrape failed' });
    }

    return NextResponse.json({
      campaignStatus: 'SCRAPING', scrapeStatus: result.status,
      message: 'Outscraper is working... estimated 15-25 minutes for large queries.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to poll Outscraper';
    return NextResponse.json({ campaignStatus: 'SCRAPING', scrapeStatus: 'Error', error: message }, { status: 500 });
  }
}
