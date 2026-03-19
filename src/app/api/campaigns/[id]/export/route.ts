// GET /api/campaigns/[id]/export?category=SLOW-SITE — Download CSV for a category
// GET /api/campaigns/[id]/export — List exportable categories

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { generateCategoryCsv, getExportableCategories } from '@/lib/csv-export';

export async function GET(
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

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  // If no category specified, return list of exportable categories
  if (!category) {
    const categories = await getExportableCategories(id);
    return NextResponse.json({ categories });
  }

  // Generate CSV for specific category
  try {
    const { csv, count, filename } = await generateCategoryCsv(id, category);

    if (count === 0) {
      return NextResponse.json({ error: `No leads found for category ${category}` }, { status: 404 });
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
