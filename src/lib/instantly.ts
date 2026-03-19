// ============================================================
// Instantly.ai API Client (v2)
// Creates campaigns, adds leads with custom variables
// ============================================================

import { prisma } from './db';
import { getSetting, getSettings } from './settings';
import { SETTINGS_KEYS } from './constants';

const BASE_URL = 'https://api.instantly.ai/api/v2';

async function getApiKey(): Promise<string> {
  const key = await getSetting(SETTINGS_KEYS.INSTANTLY_API_KEY);
  if (!key) throw new Error('Instantly API key not configured. Go to Settings to add it.');
  return key;
}

function buildGreeting(firstName: string | null, businessName: string | null): string {
  if (firstName) return `Hi ${firstName},`;
  if (businessName) return `Hi ${businessName} team,`;
  return 'Hi there,';
}

/**
 * Create an Instantly campaign and add leads for a specific category.
 * Returns the Instantly campaign ID.
 */
export async function pushCategoryToInstantly(
  campaignId: string,
  category: string
): Promise<{ instantlyCampaignId: string; leadsAdded: number }> {
  const apiKey = await getApiKey();

  // Get campaign + leads
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
      email: { not: null },
    },
    select: {
      id: true, email: true, firstName: true, businessName: true, websiteDisplay: true,
      website: true, phone: true, city: true, country: true, googleRating: true,
      reviewCount: true, batchAvgRating: true, batchAvgReviews: true,
      pagespeedScore: true, pagespeedLoadTime: true, pagespeedMobile: true,
      inLocalPack: true, competitor1Name: true, competitor2Name: true,
      competitor1Rating: true, competitor1Reviews: true,
    },
  });

  if (leads.length === 0) throw new Error(`No leads found for category ${category}`);

  // Step 1: Create Instantly campaign
  const campaignName = `${category} — ${campaign.niche} ${campaign.city} — ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;

  const createRes = await fetch(`${BASE_URL}/campaigns`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: campaignName,
      campaign_schedule: {
        schedules: [{
          name: 'Default',
          timing: { from: '08:00', to: '18:00' },
          days: { 1: true, 2: true, 3: true, 4: true, 5: true },
          timezone: 'America/Chicago',
        }],
      },
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Instantly create campaign failed (${createRes.status}): ${errText.slice(0, 200)}`);
  }

  const instantlyCampaign = await createRes.json();
  const instantlyCampaignId = instantlyCampaign.id;

  let totalAdded = 0;

  for (const lead of leads) {
    const leadPayload = {
      email: lead.email,
      first_name: lead.firstName || '',
      company_name: lead.businessName || '',
      website: lead.websiteDisplay || '',
      phone: lead.phone || '',
      campaign: instantlyCampaignId,
      payload: {
        Greeting: buildGreeting(lead.firstName, lead.businessName),
        CompanyName: lead.businessName || '',
        Website: lead.websiteDisplay || '',
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
      },
    };

    try {
      const addRes = await fetch(`${BASE_URL}/leads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadPayload),
      });

      if (!addRes.ok) {
        console.error(`Failed to add lead ${lead.email}: ${addRes.status}`);
        continue;
      }
      totalAdded++;
    } catch (err) {
      console.error(`Failed to add lead ${lead.email}:`, err);
    }

    // Small delay to avoid rate limiting
    if (leads.length > 10) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Mark leads as exported
  const leadIds = leads.map(l => l.id);
  await prisma.lead.updateMany({
    where: { id: { in: leadIds } },
    data: {
      status: 'EXPORTED',
      exportedAt: new Date(),
      instantlyCampaign: instantlyCampaignId,
    },
  });

  // Log
  await prisma.jobLog.create({
    data: {
      campaignId,
      action: 'EXPORT',
      details: {
        method: 'instantly_api',
        category,
        instantlyCampaignId,
        leadsAdded: totalAdded,
      },
    },
  });

  return { instantlyCampaignId, leadsAdded: totalAdded };
}

/**
 * Test Instantly API connection
 */
export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const apiKey = await getApiKey();
    const res = await fetch(`${BASE_URL}/campaigns?limit=1`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: message };
  }
}
