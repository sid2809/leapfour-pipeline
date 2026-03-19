// ============================================================
// GET /api/campaigns/[id]/leads — Paginated, filterable, sortable lead list
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const { searchParams } = new URL(request.url);

  // Verify campaign belongs to this user
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  // Pagination (cap limit at 100)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50));
  const skip = (page - 1) * limit;

  const category = searchParams.get('category');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const emailType = searchParams.get('emailType');

  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';

  const where: Record<string, unknown> = { campaignId: id };

  if (status) {
    where.status = status;
  } else {
    where.status = { notIn: ['PARKED'] };
  }

  if (category) where.category = category;
  if (emailType) where.emailType = emailType;

  if (search) {
    where.OR = [
      { businessName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const allowedSorts = [
    'createdAt', 'businessName', 'email', 'googleRating',
    'reviewCount', 'pagespeedScore', 'category', 'status',
  ];
  const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'createdAt';

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { [safeSortBy]: sortDir },
      skip,
      take: limit,
      select: {
        id: true, status: true, businessName: true, email: true, emailType: true,
        phone: true, websiteDisplay: true, city: true, googleRating: true,
        reviewCount: true, pagespeedScore: true, pagespeedMobile: true,
        inLocalPack: true, hasPaidAds: true, category: true,
        competitor1Name: true, errorMessage: true, createdAt: true,
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({
    leads,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
