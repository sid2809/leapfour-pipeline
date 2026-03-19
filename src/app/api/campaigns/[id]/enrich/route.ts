import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { enrichCampaign } from '@/lib/enrichment';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const campaign = await prisma.campaign.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  const filteredCount = await prisma.lead.count({ where: { campaignId: id, status: { in: ['FILTERED', 'ENRICHING_SERP'] } } });
  if (filteredCount === 0) return NextResponse.json({ error: 'No leads to enrich.' }, { status: 400 });

  try {
    const result = await enrichCampaign(id);
    return NextResponse.json({ success: true, enriched: result.enriched, failed: result.failed, categorized: result.categorized });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Enrichment failed';
    await prisma.campaign.update({ where: { id }, data: { status: 'FAILED' } });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
