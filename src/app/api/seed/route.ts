import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const seedKey = request.headers.get('x-seed-key');
  if (!seedKey || seedKey !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Create default user
    const email = process.env.AUTH_EMAIL || 'siddharthim1996@gmail.com';
    const password = process.env.AUTH_PASSWORD || 'leapfour2026';
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash },
      create: { email, passwordHash },
    });

    // 2. Seed default settings
    const defaultSettings: Record<string, string> = {
      outscraper_api_key: '',
      dataforseo_login: '',
      dataforseo_password: '',
      pagespeed_api_key: '',
      sender_name: '',
      sender_title: '',
      physical_address: '',
      company_legal_name: 'Leapfour Media',
      scoring_reviews_rating_threshold: '4.0',
      scoring_reviews_count_threshold: '15',
      scoring_pagespeed_threshold: '50',
      scoring_strong_rating_threshold: '4.3',
      scoring_strong_reviews_threshold: '30',
      overscrape_multiplier: '2.5',
    };

    let settingsCount = 0;
    for (const [key, value] of Object.entries(defaultSettings)) {
      await prisma.setting.upsert({
        where: { key },
        update: {},
        create: { key, value },
      });
      settingsCount++;
    }

    // 3. Seed 30 starter email templates
    const templates = [
      // ---- INVISIBLE (6 emails) ----
      {
        category: 'INVISIBLE', sequenceNumber: 1,
        subject: 'Quick question about {{CompanyName}} on Google',
        body: `{{Greeting}}\n\nI was researching {{Niche}} companies in {{City}} and noticed something that might be costing you customers.\n\nWhen someone searches "{{SearchTerm}}" on Google in {{City}}, the top results that show up on the map are {{Competitor1}} and {{Competitor2}}. {{CompanyName}} doesn't appear in that section.\n\nThat map listing (Google calls it the Local Pack) is where most people click when they need a local service — especially on their phone. Not showing up there means potential customers in {{City}} are finding your competitors first.\n\nThis is usually fixable. Would it be worth a quick conversation about what's keeping {{CompanyName}} out of those top spots?\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'INVISIBLE', sequenceNumber: 2,
        subject: 'Re: Quick question about {{CompanyName}} on Google',
        body: `{{Greeting}}\n\nJust a quick follow-up. I wanted to share what typically causes a local business to not show up in Google's map results:\n\n- Incomplete or unverified Google Business Profile\n- Inconsistent business name/address across directories\n- Few or no recent customer reviews\n- Website not optimized for local search terms\n\nMost of these are straightforward fixes that start showing results within a few weeks.\n\nHappy to walk through which ones might apply to {{CompanyName}} if you're interested.\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'INVISIBLE', sequenceNumber: 3,
        subject: 'How a {{Niche}} company got on Google\'s map',
        body: `{{Greeting}}\n\nWanted to share a quick example. We recently worked with a {{Niche}} business that had the same problem — great service, but invisible on Google Maps.\n\nAfter optimizing their online presence and running targeted local campaigns, they went from not appearing at all to showing up in the top 3 results for their main service keywords. Calls from Google increased significantly within the first month.\n\nIf that sounds relevant, I'm happy to explain what we'd do specifically for {{CompanyName}}.\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'INVISIBLE', sequenceNumber: 4,
        subject: 'Worth 10 minutes?',
        body: `{{Greeting}}\n\nI know you're busy running {{CompanyName}}, so I'll keep this short.\n\nWould a 10-minute call be worth it if I could show you exactly why {{Competitor1}} is showing up on Google Maps and {{CompanyName}} isn't — and what it would take to fix it?\n\nNo commitment, just a quick walkthrough.\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'INVISIBLE', sequenceNumber: 5,
        subject: 'Your competitors are getting these calls',
        body: `{{Greeting}}\n\nEvery time someone in {{City}} searches for a {{Niche}} service and {{CompanyName}} doesn't show up, that call goes to {{Competitor1}} or {{Competitor2}} instead.\n\nThat's not a guess — it's what Google shows right now. You can check it yourself.\n\nIf you'd like to change that, I'd be happy to help. If not, no worries at all.\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'INVISIBLE', sequenceNumber: 6,
        subject: 'Should I close your file?',
        body: `{{Greeting}}\n\nI've reached out a few times about {{CompanyName}}'s Google visibility in {{City}}. I don't want to be a pest, so this will be my last note.\n\nIf improving your online presence becomes a priority down the road, feel free to reply to this email anytime. I'll be here.\n\nWishing {{CompanyName}} continued success.\n\nBest,\n{{SenderName}}`,
      },

      // ---- REVIEWS-WEAK (6 emails) ----
      {
        category: 'REVIEWS-WEAK', sequenceNumber: 1,
        subject: '{{CompanyName}}\'s reviews vs {{City}} average',
        body: `{{Greeting}}\n\nI was looking at {{Niche}} businesses in {{City}} and pulled some interesting numbers.\n\nThe average {{Niche}} business in your area has a {{AvgRating}} star rating with about {{AvgReviews}} reviews. {{CompanyName}} currently has {{Rating}} stars with {{ReviewCount}} reviews.\n\nThat gap matters because when someone searches for a {{Niche}} service, Google shows star ratings right next to the business name. A potential customer choosing between {{CompanyName}} at {{Rating}} stars and {{Competitor1}} at {{Comp1Rating}} stars with {{Comp1Reviews}} reviews will almost always click the higher-rated option.\n\nThe good news is that this is one of the most fixable problems in local marketing. Would you be open to a quick conversation about closing that gap?\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'REVIEWS-WEAK', sequenceNumber: 2,
        subject: 'Re: {{CompanyName}}\'s reviews',
        body: `{{Greeting}}\n\nQuick follow-up with some context on why reviews matter so much right now.\n\nGoogle's algorithm heavily weights review quantity and recency when deciding which businesses to show in search results. A business with 50 recent reviews at 4.5 stars will consistently outrank one with a handful of reviews at a lower rating — even if the lower-rated business has been around longer.\n\nMost happy customers never leave a review unless asked. A simple system for requesting reviews after each job can change your numbers dramatically within a couple of months.\n\nHappy to share what that looks like if you're interested.\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'REVIEWS-WEAK', sequenceNumber: 3,
        subject: 'From {{Rating}} to 4.5+ stars — what it takes',
        body: `{{Greeting}}\n\nWanted to give you a realistic picture. Going from {{Rating}} stars with {{ReviewCount}} reviews to a 4.5+ rating is very achievable, but it takes a deliberate approach.\n\nThe formula is simple: make it easy for satisfied customers to leave a review, respond professionally to every review (good and bad), and be consistent about it over time.\n\nCombined with the right local advertising strategy, this can meaningfully change how many calls you get from Google.\n\nIf that sounds worth exploring for {{CompanyName}}, I'm happy to chat.\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'REVIEWS-WEAK', sequenceNumber: 4,
        subject: 'Quick question',
        body: `{{Greeting}}\n\nGenuine question — does {{CompanyName}} currently have a system for asking customers to leave Google reviews after a job?\n\nIf not, that's likely the single highest-ROI thing you could do for your online presence right now. Happy to explain why in a 10-minute call.\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'REVIEWS-WEAK', sequenceNumber: 5,
        subject: '{{Competitor1}} has {{Comp1Reviews}} reviews',
        body: `{{Greeting}}\n\nJust one data point: {{Competitor1}} in {{City}} has {{Comp1Reviews}} Google reviews at {{Comp1Rating}} stars.\n\nThat's not because they're a better {{Niche}} business — it's because they have a system for collecting reviews. The businesses that ask, win.\n\nIf you'd like to level the playing field, I can help. If not, no worries.\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'REVIEWS-WEAK', sequenceNumber: 6,
        subject: 'Last note from me',
        body: `{{Greeting}}\n\nI've reached out a few times about {{CompanyName}}'s review presence in {{City}}. Don't want to overstay my welcome, so this is my last message.\n\nIf reviews and online visibility become a focus in the future, feel free to reply to this email anytime.\n\nAll the best to the {{CompanyName}} team.\n\nBest,\n{{SenderName}}`,
      },

      // ---- SLOW-SITE (6 emails) ----
      {
        category: 'SLOW-SITE', sequenceNumber: 1,
        subject: '{{CompanyName}}\'s website speed — {{PageSpeed}}/100',
        body: `{{Greeting}}\n\nI ran {{CompanyName}}'s website through Google's speed test and the results stood out.\n\nYour site scores {{PageSpeed}} out of 100 on Google's PageSpeed test, with a mobile load time of about {{LoadTime}} seconds. Google considers anything under 50 as poor, and research shows over half of mobile visitors leave a site that takes more than 3 seconds to load.\n\nFor a {{Niche}} business, this means potential customers searching on their phone in {{City}} might be hitting your site, waiting, and then going back to Google to click on the next result.\n\nThe good news: site speed is one of the most straightforward things to improve. Would it be worth a quick conversation about what's slowing things down?\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'SLOW-SITE', sequenceNumber: 2,
        subject: 'Re: {{CompanyName}}\'s website speed',
        body: `{{Greeting}}\n\nQuick follow-up. The most common reasons a local business website loads slowly:\n\n- Images that haven't been compressed\n- Cheap hosting that can't handle traffic\n- Too many plugins or scripts running\n- No caching set up\n\nUsually a combination of these. Fixing them typically brings load time down from 6-8 seconds to under 2 — which Google rewards with better search rankings.\n\nHappy to look at the specifics for {{CompanyName}}'s site if you're interested.\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'SLOW-SITE', sequenceNumber: 3,
        subject: 'What a fast website means for {{CompanyName}}',
        body: `{{Greeting}}\n\nHere's why site speed matters beyond just user experience:\n\nGoogle explicitly uses page speed as a ranking factor. A faster site means better placement in search results, which means more people finding {{CompanyName}} when they search for {{Niche}} services in {{City}}.\n\nIt's one of those rare improvements where fixing one thing (speed) improves multiple outcomes (rankings, visitor retention, conversion rates).\n\nWorth discussing?\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'SLOW-SITE', sequenceNumber: 4,
        subject: '10-minute audit',
        body: `{{Greeting}}\n\nI can tell you exactly what's making {{CompanyName}}'s website slow and what it would take to fix it — in about 10 minutes.\n\nNo commitment, just a straightforward technical assessment. Interested?\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'SLOW-SITE', sequenceNumber: 5,
        subject: '{{PageSpeed}}/100 vs your competitors',
        body: `{{Greeting}}\n\nWhen I checked {{Niche}} websites in {{City}}, most of your competitors' sites load in 2-3 seconds. At {{LoadTime}} seconds, {{CompanyName}}'s site is giving those competitors a head start with every potential customer.\n\nIf this is something you want to address, I'm happy to help. If the timing isn't right, no pressure at all.\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'SLOW-SITE', sequenceNumber: 6,
        subject: 'Last note about your website',
        body: `{{Greeting}}\n\nThis is my final follow-up about {{CompanyName}}'s website speed. If it becomes a priority later, this email will still work — just reply anytime.\n\nWishing you the best.\n\nBest,\n{{SenderName}}`,
      },

      // ---- NO-WEBSITE (6 emails) ----
      {
        category: 'NO-WEBSITE', sequenceNumber: 1,
        subject: 'Quick thought about {{CompanyName}}',
        body: `{{Greeting}}\n\nI came across {{CompanyName}} on Google Maps while researching {{Niche}} businesses in {{City}} and noticed you don't currently have a website linked to your listing.\n\nThat means when potential customers find you on Google, they see your phone number and address — but they can't learn more about your services, see your work, or get a feel for your business before calling.\n\nThe average {{Niche}} business in {{City}} has a {{AvgRating}} star rating with {{AvgReviews}} reviews and a website where customers can learn more. Having that online presence gives them a significant advantage when someone is comparing options.\n\nA professional website doesn't have to be complicated or expensive. Would you be interested in hearing what it would take to get {{CompanyName}} online properly?\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'NO-WEBSITE', sequenceNumber: 2,
        subject: 'Re: Quick thought about {{CompanyName}}',
        body: `{{Greeting}}\n\nJust a follow-up. Here's what a website does for a {{Niche}} business:\n\n- Shows up in Google search results (not just Maps)\n- Lets potential customers see your services, service area, and pricing\n- Builds trust before someone picks up the phone\n- Makes it easy for satisfied customers to refer you with a link\n\nMost people today won't call a business they can't look up online first. A basic, professional website changes that dynamic immediately.\n\nIf this is on your radar, I'd be happy to discuss options.\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'NO-WEBSITE', sequenceNumber: 3,
        subject: 'What {{CompanyName}}\'s competitors have online',
        body: `{{Greeting}}\n\nI looked at other {{Niche}} businesses in {{City}} on Google. Most of them have websites with their service list, service area, customer photos, and a clear way to get in touch.\n\nThat's not to say {{CompanyName}} provides worse service — but online, perception is reality. A customer comparing options will almost always choose the business they can learn more about.\n\nIf getting {{CompanyName}} online has been on your to-do list, I can help make it painless.\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'NO-WEBSITE', sequenceNumber: 4,
        subject: 'Honest question',
        body: `{{Greeting}}\n\nHas not having a website been something you've thought about addressing for {{CompanyName}}? Or is word-of-mouth keeping you busy enough?\n\nGenuinely curious — if you're fully booked without one, that's great. If not, it might be worth a quick conversation.\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'NO-WEBSITE', sequenceNumber: 5,
        subject: 'What potential customers see',
        body: `{{Greeting}}\n\nWhen someone in {{City}} searches for a {{Niche}} service, they see a list of businesses. The ones with websites, reviews, and a professional presence get the clicks. The ones with just a Maps listing and no website get passed over.\n\nIt's not about having a fancy site. It's about having any site at all. If this matters to you, I can help.\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'NO-WEBSITE', sequenceNumber: 6,
        subject: 'Last message from me',
        body: `{{Greeting}}\n\nThis is my last note about getting {{CompanyName}} online. If it becomes a priority down the road, just reply to this email and we'll pick it up.\n\nAll the best.\n\nBest,\n{{SenderName}}`,
      },

      // ---- STRONG-BUT-NO-ADS (6 emails) ----
      {
        category: 'STRONG-BUT-NO-ADS', sequenceNumber: 1,
        subject: '{{CompanyName}} is doing well — here\'s how to do better',
        body: `{{Greeting}}\n\nI was looking at {{Niche}} businesses in {{City}} and {{CompanyName}} stood out for the right reasons.\n\n{{Rating}} star rating with {{ReviewCount}} reviews is solid. And you're showing up in Google's map results for "{{SearchTerm}}" — that's something most of your competitors can't say.\n\nWhat caught my attention is that you don't appear to be running any Google Ads. That means all your online leads are coming from organic visibility alone.\n\nHere's why that matters: with your strong organic foundation, running targeted Google Ads would let you capture the customers who click on ads instead of scrolling to the map — which is roughly 15-25% of all searches. You'd essentially be covering both the paid and organic sections of Google, while your competitors cover only one.\n\nWould it be worth a conversation about what that could look like for {{CompanyName}}?\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'STRONG-BUT-NO-ADS', sequenceNumber: 2,
        subject: 'Re: {{CompanyName}} is doing well',
        body: `{{Greeting}}\n\nQuick follow-up. There's a common misconception that if you're already showing up organically, you don't need ads. But here's the reality:\n\nOrganic rankings can fluctuate — Google updates its algorithm regularly, and one update can move you from position 1 to position 5. Ads give you a consistent, controllable presence at the top of the page regardless of algorithm changes.\n\nThink of it as insurance for your lead flow, with the bonus of actually generating more leads on top of what you're already getting.\n\nHappy to run some numbers on what this could look like for {{CompanyName}} specifically.\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'STRONG-BUT-NO-ADS', sequenceNumber: 3,
        subject: 'What Google Ads looks like for a {{Niche}} business',
        body: `{{Greeting}}\n\nSince {{CompanyName}} already has a strong reputation ({{Rating}} stars, {{ReviewCount}} reviews), you're in an ideal position to get great results from ads.\n\nHere's why: Google Ads for local services show your star rating and review count right in the ad. A business with 15 reviews at 3.8 stars running ads looks average. A business with {{ReviewCount}} reviews at {{Rating}} stars running ads looks like the obvious choice.\n\nYour organic strength makes your paid ads more effective — it's a multiplier, not a separate channel.\n\nInterested in seeing what this would cost and what kind of return to expect?\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'STRONG-BUT-NO-ADS', sequenceNumber: 4,
        subject: 'Quick numbers question',
        body: `{{Greeting}}\n\nRoughly how many new customer inquiries does {{CompanyName}} get per month from Google right now?\n\nAsking because with your current online presence, I can estimate how many additional leads Google Ads would generate on top of that. Most {{Niche}} businesses see a 30-50% increase in leads within the first month of running well-targeted ads.\n\nHappy to run those numbers if you can share a rough figure.\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'STRONG-BUT-NO-ADS', sequenceNumber: 5,
        subject: 'Your competitors might start running ads',
        body: `{{Greeting}}\n\nRight now, {{CompanyName}} is winning the organic game in {{City}}. But if one of your competitors starts running Google Ads before you do, they'll show up ABOVE your organic listing on every search.\n\nGetting ahead of that now — while you have the advantage — is a lot easier than catching up later.\n\nIf this resonates, happy to chat. If not, no worries.\n\nBest,\n{{SenderName}}`,
      },
      {
        category: 'STRONG-BUT-NO-ADS', sequenceNumber: 6,
        subject: 'Final note',
        body: `{{Greeting}}\n\nLast message from me about Google Ads for {{CompanyName}}. Your organic presence is strong, and if the time comes to amplify it with paid campaigns, feel free to reply here anytime.\n\nWishing you continued success.\n\nBest,\n{{SenderName}}`,
      },
    ];

    let templatesCount = 0;
    for (const t of templates) {
      await prisma.template.upsert({
        where: {
          category_sequenceNumber: {
            category: t.category,
            sequenceNumber: t.sequenceNumber,
          },
        },
        update: { subject: t.subject, body: t.body },
        create: t,
      });
      templatesCount++;
    }

    return NextResponse.json({
      success: true,
      user: user.email,
      settings: settingsCount,
      templates: templatesCount,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Seed failed', details: String(error) },
      { status: 500 }
    );
  }
}
