import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { categorizeCampaign } from '@/lib/scoring';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const campaign = await prisma.campaign.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  const eligibleCount = await prisma.lead.count({ where: { campaignId: id, status: { in: ['ENRICHED', 'FILTERED_NO_SITE', 'CATEGORIZED', 'READY'] } } });
  if (eligibleCount === 0) return NextResponse.json({ error: 'No leads to categorize.' }, { status: 400 });

  try {
    const result = await categorizeCampaign(id);
    return NextResponse.json({ success: true, totalCategorized: result.totalCategorized, byCategory: result.byCategory });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Categorization failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
