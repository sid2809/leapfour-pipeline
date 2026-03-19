// ============================================================
// Campaign Statuses
// ============================================================
export const CAMPAIGN_STATUSES = [
  'DRAFT', 'SCRAPING', 'FILTERING', 'ENRICHING',
  'CATEGORIZING', 'READY', 'PARTIALLY_EXPORTED', 'EXPORTED', 'FAILED',
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

// ============================================================
// Lead Statuses
// ============================================================
export const LEAD_STATUSES = [
  'SCRAPED', 'FILTERED', 'FILTERED_NO_SITE', 'PARKED',
  'ENRICHING_PAGESPEED', 'ENRICHING_SERP', 'ENRICHED',
  'CATEGORIZED', 'READY', 'EXPORTED',
  'FAILED_PAGESPEED', 'FAILED_SERP', 'FAILED_OTHER', 'SKIPPED',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

// ============================================================
// Categories
// ============================================================
export const CATEGORIES = [
  'INVISIBLE', 'REVIEWS-WEAK', 'SLOW-SITE',
  'NO-WEBSITE', 'STRONG-BUT-NO-ADS', 'UNCATEGORIZED',
] as const;
export type Category = (typeof CATEGORIES)[number];

// Category display labels (for UI)
export const CATEGORY_LABELS: Record<string, string> = {
  'INVISIBLE': 'Invisible on Google',
  'REVIEWS-WEAK': 'Weak Reviews',
  'SLOW-SITE': 'Slow Website',
  'NO-WEBSITE': 'No Website',
  'STRONG-BUT-NO-ADS': 'Strong but No Ads',
  'UNCATEGORIZED': 'Uncategorized',
};

// Category colors (for badges/charts)
export const CATEGORY_COLORS: Record<string, string> = {
  'INVISIBLE': '#ef4444',       // red
  'REVIEWS-WEAK': '#f97316',    // orange
  'SLOW-SITE': '#eab308',       // yellow
  'NO-WEBSITE': '#6b7280',      // gray
  'STRONG-BUT-NO-ADS': '#22c55e', // green
  'UNCATEGORIZED': '#a855f7',   // purple
};

// ============================================================
// Email classification
// ============================================================
export const GENERIC_EMAIL_PREFIXES = [
  'info', 'contact', 'admin', 'support', 'hello', 'office', 'sales', 'help',
];

// ============================================================
// Business name cleaning
// ============================================================
export const LEGAL_SUFFIXES = [
  'LLC', 'Inc', 'Inc.', 'Co.', 'Co', 'Corp', 'Corp.', 'Ltd', 'Ltd.',
  'P.C.', 'PA', 'DDS', 'DMD', 'DBA', 'PLLC', 'LP', 'LLP', 'GP',
];

export const LEGAL_SUFFIXES_REGEX = new RegExp(
  '\\b(' + LEGAL_SUFFIXES.map(s => s.replace(/\./g, '\\.')).join('|') + ')\\.?\\s*$',
  'i'
);

export const KNOWN_ACRONYMS = [
  'HVAC', 'AC', 'DC', 'PC', 'IT', 'TV', 'BBQ', 'ATM', 'GPS',
  'LED', 'SEO', 'SPA', 'DIY', 'RV', 'USA', 'NYC', 'LA',
];

// ============================================================
// Settings keys
// ============================================================
export const SETTINGS_KEYS = {
  // API credentials (encrypted in DB)
  OUTSCRAPER_API_KEY: 'outscraper_api_key',
  DATAFORSEO_LOGIN: 'dataforseo_login',
  DATAFORSEO_PASSWORD: 'dataforseo_password',
  PAGESPEED_API_KEY: 'pagespeed_api_key',
  INSTANTLY_API_KEY: 'instantly_api_key',

  // Sender info
  SENDER_NAME: 'sender_name',
  SENDER_TITLE: 'sender_title',
  PHYSICAL_ADDRESS: 'physical_address',
  COMPANY_LEGAL_NAME: 'company_legal_name',

  // Scoring thresholds
  SCORING_REVIEWS_RATING_THRESHOLD: 'scoring_reviews_rating_threshold',
  SCORING_REVIEWS_COUNT_THRESHOLD: 'scoring_reviews_count_threshold',
  SCORING_PAGESPEED_THRESHOLD: 'scoring_pagespeed_threshold',
  SCORING_STRONG_RATING_THRESHOLD: 'scoring_strong_rating_threshold',
  SCORING_STRONG_REVIEWS_THRESHOLD: 'scoring_strong_reviews_threshold',
  OVERSCRAPE_MULTIPLIER: 'overscrape_multiplier',
} as const;

// Which settings keys contain sensitive data (encrypted in DB, masked in GET response)
export const SENSITIVE_SETTINGS = [
  SETTINGS_KEYS.OUTSCRAPER_API_KEY,
  SETTINGS_KEYS.DATAFORSEO_LOGIN,
  SETTINGS_KEYS.DATAFORSEO_PASSWORD,
  SETTINGS_KEYS.PAGESPEED_API_KEY,
  SETTINGS_KEYS.INSTANTLY_API_KEY,
];

// Default values for scoring thresholds
export const SCORING_DEFAULTS: Record<string, string> = {
  [SETTINGS_KEYS.SCORING_REVIEWS_RATING_THRESHOLD]: '4.0',
  [SETTINGS_KEYS.SCORING_REVIEWS_COUNT_THRESHOLD]: '15',
  [SETTINGS_KEYS.SCORING_PAGESPEED_THRESHOLD]: '50',
  [SETTINGS_KEYS.SCORING_STRONG_RATING_THRESHOLD]: '4.3',
  [SETTINGS_KEYS.SCORING_STRONG_REVIEWS_THRESHOLD]: '30',
  [SETTINGS_KEYS.OVERSCRAPE_MULTIPLIER]: '2.5',
};

// ============================================================
// Template variable availability per category
// ============================================================
export const VARIABLE_AVAILABILITY: Record<string, string[]> = {
  'INVISIBLE': [
    'Greeting', 'CompanyName', 'FirstName', 'Email', 'Phone', 'Website',
    'City', 'Country', 'Niche', 'Rating', 'ReviewCount', 'AvgRating', 'AvgReviews',
    'PageSpeed', 'LoadTime', 'MobileScore', 'InLocalPack', 'SearchTerm',
    'Competitor1', 'Competitor2', 'Comp1Rating', 'Comp1Reviews',
    'SenderName', 'SenderTitle', 'PhysicalAddress', 'Personalization',
  ],
  'REVIEWS-WEAK': [
    'Greeting', 'CompanyName', 'FirstName', 'Email', 'Phone', 'Website',
    'City', 'Country', 'Niche', 'Rating', 'ReviewCount', 'AvgRating', 'AvgReviews',
    'Competitor1', 'Competitor2', 'Comp1Rating', 'Comp1Reviews',
    'SenderName', 'SenderTitle', 'PhysicalAddress', 'Personalization',
  ],
  'SLOW-SITE': [
    'Greeting', 'CompanyName', 'FirstName', 'Email', 'Phone', 'Website',
    'City', 'Country', 'Niche', 'Rating', 'ReviewCount', 'AvgRating', 'AvgReviews',
    'PageSpeed', 'LoadTime', 'MobileScore',
    'SenderName', 'SenderTitle', 'PhysicalAddress', 'Personalization',
  ],
  'NO-WEBSITE': [
    'Greeting', 'CompanyName', 'FirstName', 'Email', 'Phone',
    'City', 'Country', 'Niche', 'Rating', 'ReviewCount', 'AvgRating', 'AvgReviews',
    'SenderName', 'SenderTitle', 'PhysicalAddress', 'Personalization',
  ],
  'STRONG-BUT-NO-ADS': [
    'Greeting', 'CompanyName', 'FirstName', 'Email', 'Phone', 'Website',
    'City', 'Country', 'Niche', 'Rating', 'ReviewCount', 'AvgRating', 'AvgReviews',
    'PageSpeed', 'LoadTime', 'MobileScore', 'InLocalPack', 'SearchTerm',
    'Competitor1', 'Competitor2', 'Comp1Rating', 'Comp1Reviews',
    'SenderName', 'SenderTitle', 'PhysicalAddress', 'Personalization',
  ],
  'UNCATEGORIZED': [
    'Greeting', 'CompanyName', 'FirstName', 'Email', 'Phone', 'Website',
    'City', 'Country', 'Niche', 'Rating', 'ReviewCount', 'AvgRating', 'AvgReviews',
    'SenderName', 'SenderTitle', 'PhysicalAddress', 'Personalization',
  ],
};

// ============================================================
// Job log actions
// ============================================================
export const JOB_ACTIONS = [
  'SCRAPE_START', 'SCRAPE_COMPLETE', 'FILTER_COMPLETE',
  'ENRICH_PAGESPEED', 'ENRICH_SERP', 'CATEGORIZE',
  'EXPORT', 'RETRY', 'ERROR',
] as const;
