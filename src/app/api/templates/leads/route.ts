// GET /api/templates/leads — get leads for preview dropdown
// Returns a small list of leads from recent campaigns for the template preview picker

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get recent leads with email (across all campaigns, limit 50)
  const leads = await prisma.lead.findMany({
    where: {
      campaign: { userId: user.id },
      email: { not: null },
      status: { in: ['READY', 'EXPORTED', 'ENRICHED', 'CATEGORIZED'] },
    },
    select: {
      id: true,
      businessName: true,
      email: true,
      category: true,
      campaign: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ leads });
}
