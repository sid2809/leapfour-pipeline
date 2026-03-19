// GET /api/templates — list all templates grouped by category
// POST /api/templates — create a new template

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const templates = await prisma.template.findMany({
    orderBy: [{ category: 'asc' }, { sequenceNumber: 'asc' }],
  });

  // Group by category
  const grouped: Record<string, typeof templates> = {};
  for (const t of templates) {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  }

  return NextResponse.json({ templates, grouped });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { category, sequenceNumber, subject, body: templateBody } = body;

  if (!category || !sequenceNumber || !subject || !templateBody) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const template = await prisma.template.create({
    data: { category, sequenceNumber, subject, body: templateBody },
  });

  return NextResponse.json({ template });
}
