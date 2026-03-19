import { prisma } from './db';
import { runPageSpeed } from './pagespeed';
import { getSerpData, matchLeadAgainstSerp } from './dataforseo';
import { categorizeCampaign } from './scoring';

const CONCURRENCY = 5;

async function enrichLeadPageSpeed(leadId: string, websiteUrl: string): Promise<boolean> {
  try {
    await prisma.lead.update({ where: { id: leadId }, data: { status: 'ENRICHING_PAGESPEED' } });
    const result = await runPageSpeed(websiteUrl);
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        pagespeedScore: result.score, pagespeedMobile: result.mobile, pagespeedLoadTime: result.loadTime,
        pagespeedLcp: result.lcp, pagespeedInp: result.inp, pagespeedCls: result.cls,
        pagespeedIssues: result.issues, pagespeedFetchedAt: new Date(), status: 'ENRICHING_SERP',
      },
    });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PageSpeed failed';
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: 'FAILED_PAGESPEED', errorMessage: message.slice(0, 500), errorStep: 'PAGESPEED', lastErrorAt: new Date() },
    });
    return false;
  }
}

async function processInBatches<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  async function worker() { while (queue.length > 0) { const item = queue.shift(); if (item) await fn(item); } }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
}

export async function enrichCampaign(campaignId: string): Promise<{ enriched: number; failed: number; categorized: number }> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, serpKeyword: true, city: true, stateRegion: true, country: true },
  });
  if (!campaign) throw new Error('Campaign not found');

  // Race condition guard: atomically claim enrichment
  const claimed = await prisma.campaign.updateMany({
    where: { id: campaignId, status: { in: ['ENRICHING', 'FILTERING'] } },
    data: { status: 'ENRICHING' },
  });
  if (claimed.count === 0) {
    const current = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true } });
    if (current?.status === 'READY' || current?.status === 'CATEGORIZING') return { enriched: 0, failed: 0, categorized: 0 };
    throw new Error('Campaign is not in a state that allows enrichment');
  }

  const leads = await prisma.lead.findMany({
    where: { campaignId, status: { in: ['FILTERED', 'ENRICHING_SERP'] } },
    select: { id: true, website: true, businessName: true },
  });

  let enriched = 0;
  let failed = 0;

  // Step 1: PageSpeed (5 concurrent)
  await processInBatches(leads, CONCURRENCY, async (lead) => {
    if (!lead.website) { failed++; return; }
    const success = await enrichLeadPageSpeed(lead.id, lead.website);
    if (success) enriched++;
    else failed++;
  });

  // Step 2: SERP data (1 call, cached)
  let serpData;
  try {
    serpData = await getSerpData(campaign.serpKeyword, campaign.city, campaign.stateRegion, campaign.country);
  } catch (err) {
    console.error('SERP fetch failed:', err);
    serpData = null;
  }

  // Step 3: Match leads against SERP
  if (serpData) {
    const serpLeads = await prisma.lead.findMany({
      where: { campaignId, status: 'ENRICHING_SERP' },
      select: { id: true, website: true, businessName: true },
    });

    for (const lead of serpLeads) {
      try {
        const match = matchLeadAgainstSerp(lead.website, lead.businessName || '', serpData);
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            inLocalPack: match.inLocalPack, localPackPosition: match.localPackPosition,
            localPackExists: match.localPackExists, hasPaidAds: match.hasPaidAds,
            competitor1Name: match.competitor1Name, competitor1Rating: match.competitor1Rating, competitor1Reviews: match.competitor1Reviews,
            competitor2Name: match.competitor2Name, competitor2Rating: match.competitor2Rating, competitor2Reviews: match.competitor2Reviews,
            competitor3Name: match.competitor3Name, competitor3Rating: match.competitor3Rating, competitor3Reviews: match.competitor3Reviews,
            searchQueryUsed: campaign.serpKeyword,
            searchLocation: `${campaign.city}, ${campaign.stateRegion || ''}, ${campaign.country}`.replace(', ,', ','),
            serpFetchedAt: new Date(), status: 'ENRICHED',
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'SERP match failed';
        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: 'FAILED_SERP', errorMessage: message.slice(0, 500), errorStep: 'SERP', lastErrorAt: new Date() },
        });
        failed++;
        enriched--;
      }
    }
  } else {
    await prisma.lead.updateMany({ where: { campaignId, status: 'ENRICHING_SERP' }, data: { status: 'ENRICHED' } });
  }

  await prisma.campaign.update({ where: { id: campaignId }, data: { totalEnriched: enriched, totalFailed: failed } });
  await prisma.jobLog.create({ data: { campaignId, action: 'ENRICH_PAGESPEED', details: { enriched, failed } } });

  // Step 4: Categorize
  const { totalCategorized } = await categorizeCampaign(campaignId);
  return { enriched, failed, categorized: totalCategorized };
}
