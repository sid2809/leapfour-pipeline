// POST /api/templates/preview — render a template with a real lead's data
// Body: { templateId: string, leadId: string }

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { SETTINGS_KEYS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { templateId, leadId } = body;

  if (!templateId || !leadId) {
    return NextResponse.json({ error: 'templateId and leadId are required' }, { status: 400 });
  }

  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      campaign: { userId: user.id },
    },
    include: { campaign: { select: { niche: true, city: true, country: true, serpKeyword: true } } },
  });
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const settings = await getSettings([
    SETTINGS_KEYS.SENDER_NAME,
    SETTINGS_KEYS.SENDER_TITLE,
    SETTINGS_KEYS.PHYSICAL_ADDRESS,
  ]);

  // Build greeting
  let greeting = 'Hi there,';
  if (lead.firstName) greeting = `Hi ${lead.firstName},`;
  else if (lead.businessName) greeting = `Hi ${lead.businessName} team,`;

  // Build variable map
  const vars: Record<string, string> = {
    Greeting: greeting,
    CompanyName: lead.businessName || 'your business',
    FirstName: lead.firstName || '',
    Email: lead.email || '',
    Phone: lead.phone || '',
    Website: lead.websiteDisplay || '',
    City: lead.city || lead.campaign.city || '',
    Country: lead.country || lead.campaign.country || '',
    Niche: lead.campaign.niche || '',
    Rating: lead.googleRating != null ? Number(lead.googleRating).toFixed(1) : 'your current',
    ReviewCount: lead.reviewCount != null ? String(lead.reviewCount) : 'your',
    AvgRating: lead.batchAvgRating != null ? Number(lead.batchAvgRating).toFixed(1) : '',
    AvgReviews: lead.batchAvgReviews != null ? String(lead.batchAvgReviews) : '',
    PageSpeed: lead.pagespeedScore != null ? String(lead.pagespeedScore) : '',
    LoadTime: lead.pagespeedLoadTime != null ? Number(lead.pagespeedLoadTime).toFixed(1) : '',
    MobileScore: lead.pagespeedMobile || '',
    InLocalPack: lead.inLocalPack != null ? (lead.inLocalPack ? 'Yes' : 'No') : '',
    SearchTerm: lead.campaign.serpKeyword || lead.campaign.niche || '',
    Competitor1: lead.competitor1Name || 'your top competitor',
    Competitor2: lead.competitor2Name || 'other local competitors',
    Comp1Rating: lead.competitor1Rating != null ? Number(lead.competitor1Rating).toFixed(1) : '',
    Comp1Reviews: lead.competitor1Reviews != null ? String(lead.competitor1Reviews) : '',
    SenderName: settings[SETTINGS_KEYS.SENDER_NAME] || '',
    SenderTitle: settings[SETTINGS_KEYS.SENDER_TITLE] || '',
    PhysicalAddress: settings[SETTINGS_KEYS.PHYSICAL_ADDRESS] || '',
    Personalization: '',
  };

  // Replace variables in subject and body
  function renderTemplate(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return vars[varName] !== undefined ? vars[varName] : match;
    });
  }

  const renderedSubject = renderTemplate(template.subject);
  const renderedBody = renderTemplate(template.body);

  // Find variables that weren't replaced (missing data)
  const missingInSubject = [...renderedSubject.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
  const missingInBody = [...renderedBody.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
  const missingVars = [...new Set([...missingInSubject, ...missingInBody])];

  return NextResponse.json({
    subject: renderedSubject,
    body: renderedBody,
    missingVars,
    lead: {
      id: lead.id,
      businessName: lead.businessName,
      email: lead.email,
      category: lead.category,
    },
  });
}
