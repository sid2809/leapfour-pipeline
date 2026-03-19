import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [totalCampaigns, leadsAgg, parkedAgg, totalReady] = await Promise.all([
    prisma.campaign.count({ where: { userId: user.id } }),
    prisma.campaign.aggregate({ where: { userId: user.id }, _sum: { totalFiltered: true } }),
    prisma.campaign.aggregate({ where: { userId: user.id }, _sum: { totalParked: true } }),
    prisma.lead.count({
      where: {
        campaign: { userId: user.id },
        status: { in: ['READY', 'EXPORTED'] },
      },
    }),
  ]);

  return NextResponse.json({
    totalCampaigns,
    totalLeads: leadsAgg._sum.totalFiltered || 0,
    totalReady,
    totalParked: parkedAgg._sum.totalParked || 0,
  });
}
