// POST /api/campaigns/[id]/push-instantly — Push a category to Instantly
// Body: { category: "SLOW-SITE" }

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { pushCategoryToInstantly } from '@/lib/instantly';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;

  // Verify ownership
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  const body = await request.json();
  const { category } = body;

  if (!category) {
    return NextResponse.json({ error: 'category is required' }, { status: 400 });
  }

  try {
    const result = await pushCategoryToInstantly(id, category);

    return NextResponse.json({
      success: true,
      instantlyCampaignId: result.instantlyCampaignId,
      leadsAdded: result.leadsAdded,
      message: `Pushed ${result.leadsAdded} leads to Instantly campaign.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Push to Instantly failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
