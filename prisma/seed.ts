import 'dotenv/config';
import { PrismaClient } from '../src/generated/db/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // ============================================================
  // 1. Create default user
  // ============================================================
  const email = process.env.AUTH_EMAIL || 'siddharthim1996@gmail.com';
  const password = process.env.AUTH_PASSWORD || 'leapfour2026';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });
  console.log(`User seeded: ${email}`);

  // ============================================================
  // 2. Seed default settings
  // ============================================================
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

  for (const [key, value] of Object.entries(defaultSettings)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},  // Don't overwrite existing values on re-seed
      create: { key, value },
    });
  }
  console.log('Default settings seeded');

  // ============================================================
  // 3. Seed 30 starter email templates
  // ============================================================
  const templates = [
    // ---- INVISIBLE (6 emails) ----
    {
      category: 'INVISIBLE', sequenceNumber: 1,
      subject: 'Quick question about {{CompanyName}} on Google',
      body: `{{Greeting}}

I was researching {{Niche}} companies in {{City}} and noticed something that might be costing you customers.

When someone searches "{{SearchTerm}}" on Google in {{City}}, the top results that show up on the map are {{Competitor1}} and {{Competitor2}}. {{CompanyName}} doesn't appear in that section.

That map listing (Google calls it the Local Pack) is where most people click when they need a local service — especially on their phone. Not showing up there means potential customers in {{City}} are finding your competitors first.

This is usually fixable. Would it be worth a quick conversation about what's keeping {{CompanyName}} out of those top spots?

Best,
{{SenderName}}`,
    },
    {
      category: 'INVISIBLE', sequenceNumber: 2,
      subject: 'Re: Quick question about {{CompanyName}} on Google',
      body: `{{Greeting}}

Just a quick follow-up. I wanted to share what typically causes a local business to not show up in Google's map results:

- Incomplete or unverified Google Business Profile
- Inconsistent business name/address across directories
- Few or no recent customer reviews
- Website not optimized for local search terms

Most of these are straightforward fixes that start showing results within a few weeks.

Happy to walk through which ones might apply to {{CompanyName}} if you're interested.

Best,
{{SenderName}}`,
    },
    {
      category: 'INVISIBLE', sequenceNumber: 3,
      subject: 'How a {{Niche}} company got on Google\'s map',
      body: `{{Greeting}}

Wanted to share a quick example. We recently worked with a {{Niche}} business that had the same problem — great service, but invisible on Google Maps.

After optimizing their online presence and running targeted local campaigns, they went from not appearing at all to showing up in the top 3 results for their main service keywords. Calls from Google increased significantly within the first month.

If that sounds relevant, I'm happy to explain what we'd do specifically for {{CompanyName}}.

Best,
{{SenderName}}`,
    },
    {
      category: 'INVISIBLE', sequenceNumber: 4,
      subject: 'Worth 10 minutes?',
      body: `{{Greeting}}

I know you're busy running {{CompanyName}}, so I'll keep this short.

Would a 10-minute call be worth it if I could show you exactly why {{Competitor1}} is showing up on Google Maps and {{CompanyName}} isn't — and what it would take to fix it?

No commitment, just a quick walkthrough.

Best,
{{SenderName}}`,
    },
    {
      category: 'INVISIBLE', sequenceNumber: 5,
      subject: 'Your competitors are getting these calls',
      body: `{{Greeting}}

Every time someone in {{City}} searches for a {{Niche}} service and {{CompanyName}} doesn't show up, that call goes to {{Competitor1}} or {{Competitor2}} instead.

That's not a guess — it's what Google shows right now. You can check it yourself.

If you'd like to change that, I'd be happy to help. If not, no worries at all.

Best,
{{SenderName}}`,
    },
    {
      category: 'INVISIBLE', sequenceNumber: 6,
      subject: 'Should I close your file?',
      body: `{{Greeting}}

I've reached out a few times about {{CompanyName}}'s Google visibility in {{City}}. I don't want to be a pest, so this will be my last note.

If improving your online presence becomes a priority down the road, feel free to reply to this email anytime. I'll be here.

Wishing {{CompanyName}} continued success.

Best,
{{SenderName}}`,
    },

    // ---- REVIEWS-WEAK (6 emails) ----
    {
      category: 'REVIEWS-WEAK', sequenceNumber: 1,
      subject: '{{CompanyName}}\'s reviews vs {{City}} average',
      body: `{{Greeting}}

I was looking at {{Niche}} businesses in {{City}} and pulled some interesting numbers.

The average {{Niche}} business in your area has a {{AvgRating}} star rating with about {{AvgReviews}} reviews. {{CompanyName}} currently has {{Rating}} stars with {{ReviewCount}} reviews.

That gap matters because when someone searches for a {{Niche}} service, Google shows star ratings right next to the business name. A potential customer choosing between {{CompanyName}} at {{Rating}} stars and {{Competitor1}} at {{Comp1Rating}} stars with {{Comp1Reviews}} reviews will almost always click the higher-rated option.

The good news is that this is one of the most fixable problems in local marketing. Would you be open to a quick conversation about closing that gap?

Best,
{{SenderName}}`,
    },
    {
      category: 'REVIEWS-WEAK', sequenceNumber: 2,
      subject: 'Re: {{CompanyName}}\'s reviews',
      body: `{{Greeting}}

Quick follow-up with some context on why reviews matter so much right now.

Google's algorithm heavily weights review quantity and recency when deciding which businesses to show in search results. A business with 50 recent reviews at 4.5 stars will consistently outrank one with a handful of reviews at a lower rating — even if the lower-rated business has been around longer.

Most happy customers never leave a review unless asked. A simple system for requesting reviews after each job can change your numbers dramatically within a couple of months.

Happy to share what that looks like if you're interested.

Best,
{{SenderName}}`,
    },
    {
      category: 'REVIEWS-WEAK', sequenceNumber: 3,
      subject: 'From {{Rating}} to 4.5+ stars — what it takes',
      body: `{{Greeting}}

Wanted to give you a realistic picture. Going from {{Rating}} stars with {{ReviewCount}} reviews to a 4.5+ rating is very achievable, but it takes a deliberate approach.

The formula is simple: make it easy for satisfied customers to leave a review, respond professionally to every review (good and bad), and be consistent about it over time.

Combined with the right local advertising strategy, this can meaningfully change how many calls you get from Google.

If that sounds worth exploring for {{CompanyName}}, I'm happy to chat.

Best,
{{SenderName}}`,
    },
    {
      category: 'REVIEWS-WEAK', sequenceNumber: 4,
      subject: 'Quick question',
      body: `{{Greeting}}

Genuine question — does {{CompanyName}} currently have a system for asking customers to leave Google reviews after a job?

If not, that's likely the single highest-ROI thing you could do for your online presence right now. Happy to explain why in a 10-minute call.

Best,
{{SenderName}}`,
    },
    {
      category: 'REVIEWS-WEAK', sequenceNumber: 5,
      subject: '{{Competitor1}} has {{Comp1Reviews}} reviews',
      body: `{{Greeting}}

Just one data point: {{Competitor1}} in {{City}} has {{Comp1Reviews}} Google reviews at {{Comp1Rating}} stars.

That's not because they're a better {{Niche}} business — it's because they have a system for collecting reviews. The businesses that ask, win.

If you'd like to level the playing field, I can help. If not, no worries.

Best,
{{SenderName}}`,
    },
    {
      category: 'REVIEWS-WEAK', sequenceNumber: 6,
      subject: 'Last note from me',
      body: `{{Greeting}}

I've reached out a few times about {{CompanyName}}'s review presence in {{City}}. Don't want to overstay my welcome, so this is my last message.

If reviews and online visibility become a focus in the future, feel free to reply to this email anytime.

All the best to the {{CompanyName}} team.

Best,
{{SenderName}}`,
    },

    // ---- SLOW-SITE (6 emails) ----
    {
      category: 'SLOW-SITE', sequenceNumber: 1,
      subject: '{{CompanyName}}\'s website speed — {{PageSpeed}}/100',
      body: `{{Greeting}}

I ran {{CompanyName}}'s website through Google's speed test and the results stood out.

Your site scores {{PageSpeed}} out of 100 on Google's PageSpeed test, with a mobile load time of about {{LoadTime}} seconds. Google considers anything under 50 as poor, and research shows over half of mobile visitors leave a site that takes more than 3 seconds to load.

For a {{Niche}} business, this means potential customers searching on their phone in {{City}} might be hitting your site, waiting, and then going back to Google to click on the next result.

The good news: site speed is one of the most straightforward things to improve. Would it be worth a quick conversation about what's slowing things down?

Best,
{{SenderName}}`,
    },
    {
      category: 'SLOW-SITE', sequenceNumber: 2,
      subject: 'Re: {{CompanyName}}\'s website speed',
      body: `{{Greeting}}

Quick follow-up. The most common reasons a local business website loads slowly:

- Images that haven't been compressed
- Cheap hosting that can't handle traffic
- Too many plugins or scripts running
- No caching set up

Usually a combination of these. Fixing them typically brings load time down from 6-8 seconds to under 2 — which Google rewards with better search rankings.

Happy to look at the specifics for {{CompanyName}}'s site if you're interested.

Best,
{{SenderName}}`,
    },
    {
      category: 'SLOW-SITE', sequenceNumber: 3,
      subject: 'What a fast website means for {{CompanyName}}',
      body: `{{Greeting}}

Here's why site speed matters beyond just user experience:

Google explicitly uses page speed as a ranking factor. A faster site means better placement in search results, which means more people finding {{CompanyName}} when they search for {{Niche}} services in {{City}}.

It's one of those rare improvements where fixing one thing (speed) improves multiple outcomes (rankings, visitor retention, conversion rates).

Worth discussing?

Best,
{{SenderName}}`,
    },
    {
      category: 'SLOW-SITE', sequenceNumber: 4,
      subject: '10-minute audit',
      body: `{{Greeting}}

I can tell you exactly what's making {{CompanyName}}'s website slow and what it would take to fix it — in about 10 minutes.

No commitment, just a straightforward technical assessment. Interested?

Best,
{{SenderName}}`,
    },
    {
      category: 'SLOW-SITE', sequenceNumber: 5,
      subject: '{{PageSpeed}}/100 vs your competitors',
      body: `{{Greeting}}

When I checked {{Niche}} websites in {{City}}, most of your competitors' sites load in 2-3 seconds. At {{LoadTime}} seconds, {{CompanyName}}'s site is giving those competitors a head start with every potential customer.

If this is something you want to address, I'm happy to help. If the timing isn't right, no pressure at all.

Best,
{{SenderName}}`,
    },
    {
      category: 'SLOW-SITE', sequenceNumber: 6,
      subject: 'Last note about your website',
      body: `{{Greeting}}

This is my final follow-up about {{CompanyName}}'s website speed. If it becomes a priority later, this email will still work — just reply anytime.

Wishing you the best.

Best,
{{SenderName}}`,
    },

    // ---- NO-WEBSITE (6 emails) ----
    // NOTE: These use ONLY Outscraper data + batch averages. No PageSpeed, SERP, or competitor references.
    {
      category: 'NO-WEBSITE', sequenceNumber: 1,
      subject: 'Quick thought about {{CompanyName}}',
      body: `{{Greeting}}

I came across {{CompanyName}} on Google Maps while researching {{Niche}} businesses in {{City}} and noticed you don't currently have a website linked to your listing.

That means when potential customers find you on Google, they see your phone number and address — but they can't learn more about your services, see your work, or get a feel for your business before calling.

The average {{Niche}} business in {{City}} has a {{AvgRating}} star rating with {{AvgReviews}} reviews and a website where customers can learn more. Having that online presence gives them a significant advantage when someone is comparing options.

A professional website doesn't have to be complicated or expensive. Would you be interested in hearing what it would take to get {{CompanyName}} online properly?

Best,
{{SenderName}}`,
    },
    {
      category: 'NO-WEBSITE', sequenceNumber: 2,
      subject: 'Re: Quick thought about {{CompanyName}}',
      body: `{{Greeting}}

Just a follow-up. Here's what a website does for a {{Niche}} business:

- Shows up in Google search results (not just Maps)
- Lets potential customers see your services, service area, and pricing
- Builds trust before someone picks up the phone
- Makes it easy for satisfied customers to refer you with a link

Most people today won't call a business they can't look up online first. A basic, professional website changes that dynamic immediately.

If this is on your radar, I'd be happy to discuss options.

Best,
{{SenderName}}`,
    },
    {
      category: 'NO-WEBSITE', sequenceNumber: 3,
      subject: 'What {{CompanyName}}\'s competitors have online',
      body: `{{Greeting}}

I looked at other {{Niche}} businesses in {{City}} on Google. Most of them have websites with their service list, service area, customer photos, and a clear way to get in touch.

That's not to say {{CompanyName}} provides worse service — but online, perception is reality. A customer comparing options will almost always choose the business they can learn more about.

If getting {{CompanyName}} online has been on your to-do list, I can help make it painless.

Best,
{{SenderName}}`,
    },
    {
      category: 'NO-WEBSITE', sequenceNumber: 4,
      subject: 'Honest question',
      body: `{{Greeting}}

Has not having a website been something you've thought about addressing for {{CompanyName}}? Or is word-of-mouth keeping you busy enough?

Genuinely curious — if you're fully booked without one, that's great. If not, it might be worth a quick conversation.

Best,
{{SenderName}}`,
    },
    {
      category: 'NO-WEBSITE', sequenceNumber: 5,
      subject: 'What potential customers see',
      body: `{{Greeting}}

When someone in {{City}} searches for a {{Niche}} service, they see a list of businesses. The ones with websites, reviews, and a professional presence get the clicks. The ones with just a Maps listing and no website get passed over.

It's not about having a fancy site. It's about having any site at all. If this matters to you, I can help.

Best,
{{SenderName}}`,
    },
    {
      category: 'NO-WEBSITE', sequenceNumber: 6,
      subject: 'Last message from me',
      body: `{{Greeting}}

This is my last note about getting {{CompanyName}} online. If it becomes a priority down the road, just reply to this email and we'll pick it up.

All the best.

Best,
{{SenderName}}`,
    },

    // ---- STRONG-BUT-NO-ADS (6 emails) ----
    {
      category: 'STRONG-BUT-NO-ADS', sequenceNumber: 1,
      subject: '{{CompanyName}} is doing well — here\'s how to do better',
      body: `{{Greeting}}

I was looking at {{Niche}} businesses in {{City}} and {{CompanyName}} stood out for the right reasons.

{{Rating}} star rating with {{ReviewCount}} reviews is solid. And you're showing up in Google's map results for "{{SearchTerm}}" — that's something most of your competitors can't say.

What caught my attention is that you don't appear to be running any Google Ads. That means all your online leads are coming from organic visibility alone.

Here's why that matters: with your strong organic foundation, running targeted Google Ads would let you capture the customers who click on ads instead of scrolling to the map — which is roughly 15-25% of all searches. You'd essentially be covering both the paid and organic sections of Google, while your competitors cover only one.

Would it be worth a conversation about what that could look like for {{CompanyName}}?

Best,
{{SenderName}}`,
    },
    {
      category: 'STRONG-BUT-NO-ADS', sequenceNumber: 2,
      subject: 'Re: {{CompanyName}} is doing well',
      body: `{{Greeting}}

Quick follow-up. There's a common misconception that if you're already showing up organically, you don't need ads. But here's the reality:

Organic rankings can fluctuate — Google updates its algorithm regularly, and one update can move you from position 1 to position 5. Ads give you a consistent, controllable presence at the top of the page regardless of algorithm changes.

Think of it as insurance for your lead flow, with the bonus of actually generating more leads on top of what you're already getting.

Happy to run some numbers on what this could look like for {{CompanyName}} specifically.

Best,
{{SenderName}}`,
    },
    {
      category: 'STRONG-BUT-NO-ADS', sequenceNumber: 3,
      subject: 'What Google Ads looks like for a {{Niche}} business',
      body: `{{Greeting}}

Since {{CompanyName}} already has a strong reputation ({{Rating}} stars, {{ReviewCount}} reviews), you're in an ideal position to get great results from ads.

Here's why: Google Ads for local services show your star rating and review count right in the ad. A business with 15 reviews at 3.8 stars running ads looks average. A business with {{ReviewCount}} reviews at {{Rating}} stars running ads looks like the obvious choice.

Your organic strength makes your paid ads more effective — it's a multiplier, not a separate channel.

Interested in seeing what this would cost and what kind of return to expect?

Best,
{{SenderName}}`,
    },
    {
      category: 'STRONG-BUT-NO-ADS', sequenceNumber: 4,
      subject: 'Quick numbers question',
      body: `{{Greeting}}

Roughly how many new customer inquiries does {{CompanyName}} get per month from Google right now?

Asking because with your current online presence, I can estimate how many additional leads Google Ads would generate on top of that. Most {{Niche}} businesses see a 30-50% increase in leads within the first month of running well-targeted ads.

Happy to run those numbers if you can share a rough figure.

Best,
{{SenderName}}`,
    },
    {
      category: 'STRONG-BUT-NO-ADS', sequenceNumber: 5,
      subject: 'Your competitors might start running ads',
      body: `{{Greeting}}

Right now, {{CompanyName}} is winning the organic game in {{City}}. But if one of your competitors starts running Google Ads before you do, they'll show up ABOVE your organic listing on every search.

Getting ahead of that now — while you have the advantage — is a lot easier than catching up later.

If this resonates, happy to chat. If not, no worries.

Best,
{{SenderName}}`,
    },
    {
      category: 'STRONG-BUT-NO-ADS', sequenceNumber: 6,
      subject: 'Final note',
      body: `{{Greeting}}

Last message from me about Google Ads for {{CompanyName}}. Your organic presence is strong, and if the time comes to amplify it with paid campaigns, feel free to reply here anytime.

Wishing you continued success.

Best,
{{SenderName}}`,
    },
  ];

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
  }
  console.log(`Seeded ${templates.length} templates`);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
