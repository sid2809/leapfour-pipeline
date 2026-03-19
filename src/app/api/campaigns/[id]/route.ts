// ============================================================
// GET    /api/campaigns/[id]  — campaign detail + stats
// PATCH  /api/campaigns/[id]  — edit name only
// DELETE /api/campaigns/[id]  — delete campaign + cascade leads
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getCampaignStats } from '@/lib/pipeline';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;

  const stats = await getCampaignStats(id);
  if (!stats) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  const campaign = await prisma.campaign.findUnique({
    where: { id, userId: user.id },
    select: {
      id: true, name: true, niche: true, searchQuery: true, serpKeyword: true,
      city: true, country: true, stateRegion: true, leadTarget: true,
      overscrapeMult: true, isTest: true, status: true, exportStatus: true,
      outscraperId: true, totalScraped: true, totalFiltered: true, totalParked: true,
      totalEnriched: true, totalFailed: true, pipelineStartedAt: true,
      createdAt: true, updatedAt: true,
    },
  });

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  return NextResponse.json({
    ...campaign,
    stats: {
      byStatus: stats.byStatus, byCategory: stats.byCategory,
      totalLeads: stats.totalLeads, totalExported: stats.totalExported,
      totalReady: stats.totalReady, totalCategorized: stats.totalCategorized,
      totalSkipped: stats.totalSkipped,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const body = await request.json();
  const { name } = body;
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const campaign = await prisma.campaign.updateMany({
    where: { id, userId: user.id },
    data: { name },
  });

  if (campaign.count === 0) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;

  const campaign = await prisma.campaign.findFirst({ where: { id, userId: user.id } });
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ success: true, message: 'Campaign deleted' });
}
