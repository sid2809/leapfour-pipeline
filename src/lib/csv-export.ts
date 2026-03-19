// ============================================================
// CSV Export — generates Instantly-ready CSVs per category
// ============================================================

import { prisma } from './db';
import { getSettings } from './settings';
import { SETTINGS_KEYS } from './constants';

interface LeadRow {
  Email: string;
  Greeting: string;
  CompanyName: string;
  Website: string;
  Phone: string;
  City: string;
  Country: string;
  Niche: string;
  Rating: string;
  ReviewCount: string;
  AvgRating: string;
  AvgReviews: string;
  PageSpeed: string;
  LoadTime: string;
  MobileScore: string;
  InLocalPack: string;
  SearchTerm: string;
  Competitor1: string;
  Competitor2: string;
  Comp1Rating: string;
  Comp1Reviews: string;
  SenderName: string;
  PhysicalAddress: string;
  Personalization: string;
}

function buildGreeting(firstName: string | null, businessName: string | null): string {
  if (firstName) return `Hi ${firstName},`;
  if (businessName) return `Hi ${businessName} team,`;
  return 'Hi there,';
}

function escCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

function rowToCsv(row: LeadRow): string {
  return Object.values(row).map(v => escCsv(v)).join(',');
}

const CSV_HEADERS = [
  'Email', 'Greeting', 'CompanyName', 'Website', 'Phone', 'City', 'Country',
  'Niche', 'Rating', 'ReviewCount', 'AvgRating', 'AvgReviews', 'PageSpeed',
  'LoadTime', 'MobileScore', 'InLocalPack', 'SearchTerm', 'Competitor1',
  'Competitor2', 'Comp1Rating', 'Comp1Reviews', 'SenderName', 'PhysicalAddress',
  'Personalization',
];

/**
 * Generate CSV content for a specific category in a campaign.
 * Returns UTF-8 CSV string ready for Instantly upload.
 */
export async function generateCategoryCsv(
  campaignId: string,
  category: string
): Promise<{ csv: string; count: number; filename: string }> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { name: true, niche: true, city: true, country: true, serpKeyword: true },
  });

  if (!campaign) throw new Error('Campaign not found');

  const settings = await getSettings([
    SETTINGS_KEYS.SENDER_NAME,
    SETTINGS_KEYS.PHYSICAL_ADDRESS,
  ]);

  const senderName = settings[SETTINGS_KEYS.SENDER_NAME] || '';
  const physicalAddress = settings[SETTINGS_KEYS.PHYSICAL_ADDRESS] || '';

  const leads = await prisma.lead.findMany({
    where: {
      campaignId,
      category,
      status: { in: ['READY', 'EXPORTED'] },
    },
    select: {
      id: true, email: true, firstName: true, businessName: true, websiteDisplay: true,
      phone: true, city: true, country: true, googleRating: true, reviewCount: true,
      batchAvgRating: true, batchAvgReviews: true, pagespeedScore: true,
      pagespeedLoadTime: true, pagespeedMobile: true, inLocalPack: true,
      competitor1Name: true, competitor2Name: true, competitor1Rating: true,
      competitor1Reviews: true,
    },
  });

  const rows: string[] = [CSV_HEADERS.join(',')];

  for (const lead of leads) {
    const row: LeadRow = {
      Email: lead.email || '',
      Greeting: buildGreeting(lead.firstName, lead.businessName),
      CompanyName: lead.businessName || '',
      Website: lead.websiteDisplay || '',
      Phone: lead.phone || '',
      City: lead.city || campaign.city,
      Country: lead.country || campaign.country,
      Niche: campaign.niche,
      Rating: lead.googleRating != null ? Number(lead.googleRating).toFixed(1) : '',
      ReviewCount: lead.reviewCount != null ? String(lead.reviewCount) : '',
      AvgRating: lead.batchAvgRating != null ? Number(lead.batchAvgRating).toFixed(1) : '',
      AvgReviews: lead.batchAvgReviews != null ? String(lead.batchAvgReviews) : '',
      PageSpeed: lead.pagespeedScore != null ? String(lead.pagespeedScore) : '',
      LoadTime: lead.pagespeedLoadTime != null ? Number(lead.pagespeedLoadTime).toFixed(1) : '',
      MobileScore: lead.pagespeedMobile || '',
      InLocalPack: lead.inLocalPack != null ? (lead.inLocalPack ? 'Yes' : 'No') : '',
      SearchTerm: campaign.serpKeyword || campaign.niche,
      Competitor1: lead.competitor1Name || '',
      Competitor2: lead.competitor2Name || '',
      Comp1Rating: lead.competitor1Rating != null ? Number(lead.competitor1Rating).toFixed(1) : '',
      Comp1Reviews: lead.competitor1Reviews != null ? String(lead.competitor1Reviews) : '',
      SenderName: senderName,
      PhysicalAddress: physicalAddress,
      Personalization: '',
    };
    rows.push(rowToCsv(row));
  }

  // Mark leads as exported
  await prisma.lead.updateMany({
    where: { campaignId, category, status: 'READY' },
    data: { status: 'EXPORTED', exportedAt: new Date() },
  });

  const safeName = campaign.name.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_');
  const filename = `${safeName}_${category}.csv`;

  return { csv: rows.join('\n'), count: leads.length, filename };
}

/**
 * Get all categories with READY lead counts for a campaign.
 */
export async function getExportableCategories(campaignId: string): Promise<{ category: string; count: number }[]> {
  const counts = await prisma.lead.groupBy({
    by: ['category'],
    where: {
      campaignId,
      category: { not: null },
      status: { in: ['READY', 'EXPORTED'] },
    },
    _count: true,
  });

  return counts
    .filter(c => c.category !== null)
    .map(c => ({ category: c.category!, count: c._count }));
}
