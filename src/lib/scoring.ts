import { prisma } from './db';
import { getScoringThresholds } from './settings';

interface LeadForScoring {
  id: string;
  status: string;
  website: string | null;
  googleRating: unknown;
  reviewCount: number | null;
  pagespeedScore: number | null;
  pagespeedLoadTime: unknown;
  pagespeedMobile: string | null;
  inLocalPack: boolean | null;
  localPackExists: boolean | null;
  hasPaidAds: boolean | null;
}

interface Scores {
  invisible: number;
  reviews: number;
  slowsite: number;
  nowebsite: number;
  strongnoads: number;
}

export async function calculateBenchmarks(campaignId: string): Promise<{ avgRating: number; avgReviews: number }> {
  const leads = await prisma.lead.findMany({
    where: { campaignId, status: { in: ['ENRICHED', 'FILTERED_NO_SITE'] } },
    select: { googleRating: true, reviewCount: true },
  });

  if (leads.length === 0) return { avgRating: 4.0, avgReviews: 20 };

  const ratings = leads.map(l => l.googleRating != null ? Number(l.googleRating) : null).filter((r): r is number => r !== null && r > 0);
  const reviews = leads.map(l => l.reviewCount).filter((r): r is number => r !== null);

  const avgRating = ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 4.0;
  const avgReviews = reviews.length > 0 ? Math.round(reviews.reduce((a, b) => a + b, 0) / reviews.length) : 20;

  return { avgRating, avgReviews };
}

function scoreLead(lead: LeadForScoring, thresholds: Awaited<ReturnType<typeof getScoringThresholds>>, avgRating: number, avgReviews: number): { category: string; scores: Scores } {
  const scores: Scores = { invisible: 0, reviews: 0, slowsite: 0, nowebsite: 0, strongnoads: 0 };

  if (!lead.website) { scores.nowebsite = 100; return { category: 'NO-WEBSITE', scores }; }

  const rating = lead.googleRating != null ? Number(lead.googleRating) : null;
  const reviewCount = lead.reviewCount || 0;
  const pagespeedScore = lead.pagespeedScore;
  const loadTime = lead.pagespeedLoadTime != null ? Number(lead.pagespeedLoadTime) : null;

  // INVISIBLE
  if (lead.localPackExists !== false) {
    if (lead.inLocalPack === false) scores.invisible += 80;
    if (pagespeedScore != null && pagespeedScore < thresholds.pagespeedThreshold) scores.invisible += 10;
    if (reviewCount < avgReviews) scores.invisible += 10;
  }

  // REVIEWS-WEAK
  if (rating != null) {
    if (rating < thresholds.ratingThreshold) scores.reviews += 50;
    if (reviewCount < thresholds.countThreshold) scores.reviews += 30;
    if (rating < avgRating) scores.reviews += 20;
    const gap = avgRating - rating;
    if (gap > 0) scores.reviews += Math.min(Math.round(gap * 20), 40);
  }

  // SLOW-SITE
  if (pagespeedScore != null) {
    if (pagespeedScore < 30) scores.slowsite += 70;
    else if (pagespeedScore < thresholds.pagespeedThreshold) scores.slowsite += 40;
    if (loadTime != null && loadTime > 5) scores.slowsite += 20;
    if (lead.pagespeedMobile === 'poor') scores.slowsite += 10;
  }

  // STRONG-BUT-NO-ADS
  if (lead.hasPaidAds !== true && lead.hasPaidAds !== null) {
    if (lead.inLocalPack === true) scores.strongnoads += 30;
    if (rating != null && rating >= thresholds.strongRatingThreshold) scores.strongnoads += 30;
    if (reviewCount >= thresholds.strongReviewsThreshold) scores.strongnoads += 20;
    if (pagespeedScore != null && pagespeedScore >= 60) scores.strongnoads += 20;
    if (scores.invisible >= 40 || scores.reviews >= 40 || scores.slowsite >= 40) scores.strongnoads = 0;
  }

  const ranked = [
    { category: 'INVISIBLE', score: scores.invisible },
    { category: 'REVIEWS-WEAK', score: scores.reviews },
    { category: 'SLOW-SITE', score: scores.slowsite },
    { category: 'STRONG-BUT-NO-ADS', score: scores.strongnoads },
  ];
  ranked.sort((a, b) => b.score - a.score);

  if (ranked[0].score < 10) return { category: 'UNCATEGORIZED', scores };
  return { category: ranked[0].category, scores };
}

export async function categorizeCampaign(campaignId: string): Promise<{ totalCategorized: number; byCategory: Record<string, number> }> {
  await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'CATEGORIZING' } });

  const thresholds = await getScoringThresholds();
  const { avgRating, avgReviews } = await calculateBenchmarks(campaignId);

  const leads = await prisma.lead.findMany({
    where: { campaignId, status: { in: ['ENRICHED', 'FILTERED_NO_SITE', 'CATEGORIZED', 'READY'] } },
    select: { id: true, status: true, website: true, googleRating: true, reviewCount: true, pagespeedScore: true, pagespeedLoadTime: true, pagespeedMobile: true, inLocalPack: true, localPackExists: true, hasPaidAds: true },
  });

  const byCategory: Record<string, number> = {};
  let totalCategorized = 0;

  for (const lead of leads) {
    const { category, scores } = scoreLead(lead, thresholds, avgRating, avgReviews);

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        category, scoreInvisible: scores.invisible, scoreReviews: scores.reviews,
        scoreSlowsite: scores.slowsite, scoreNowebsite: scores.nowebsite, scoreStrongnoads: scores.strongnoads,
        batchAvgRating: avgRating, batchAvgReviews: avgReviews, status: 'READY',
      },
    });

    byCategory[category] = (byCategory[category] || 0) + 1;
    totalCategorized++;
  }

  await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'READY' } });
  await prisma.jobLog.create({ data: { campaignId, action: 'CATEGORIZE', details: { totalCategorized, byCategory, avgRating, avgReviews } } });

  return { totalCategorized, byCategory };
}
