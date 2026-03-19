// ============================================================
// Data Cleaning Utilities
// Business name cleaning, URL normalization, email classification, name parsing
// ============================================================

import { LEGAL_SUFFIXES_REGEX, KNOWN_ACRONYMS, GENERIC_EMAIL_PREFIXES } from './constants';

// ============================================================
// Business Name Cleaning
// ============================================================

export function cleanBusinessName(raw: string): string {
  if (!raw) return '';

  let name = raw.trim();
  name = name.replace(LEGAL_SUFFIXES_REGEX, '').trim();
  name = name.replace(/[,.\-–—]+\s*$/, '').trim();

  if (isAllCaps(name)) {
    name = toTitleCasePreserveAcronyms(name);
  } else if (isAllLower(name)) {
    name = toTitleCasePreserveAcronyms(name);
  }

  return name.trim();
}

function isAllCaps(s: string): boolean {
  const alphaChars = s.replace(/[^a-zA-Z]/g, '');
  if (alphaChars.length === 0) return false;
  const upperChars = alphaChars.replace(/[^A-Z]/g, '');
  return upperChars.length / alphaChars.length > 0.8;
}

function isAllLower(s: string): boolean {
  const alphaChars = s.replace(/[^a-zA-Z]/g, '');
  if (alphaChars.length === 0) return false;
  const lowerChars = alphaChars.replace(/[^a-z]/g, '');
  return lowerChars.length / alphaChars.length > 0.8;
}

function toTitleCasePreserveAcronyms(s: string): string {
  const acronymSet = new Set(KNOWN_ACRONYMS.map(a => a.toUpperCase()));

  return s
    .split(/\s+/)
    .map(word => {
      const stripped = word.replace(/[^a-zA-Z]/g, '').toUpperCase();
      if (acronymSet.has(stripped)) {
        return stripped + word.slice(stripped.length);
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

// ============================================================
// URL Normalization
// ============================================================

export function normalizeUrl(raw: string | null | undefined): {
  website: string;
  websiteDisplay: string;
} | null {
  if (!raw || raw.trim() === '') return null;

  let url = raw.trim();

  if (!url.match(/^https?:\/\//i)) {
    url = 'https://' + url;
  }

  try {
    const parsed = new URL(url);
    const website = parsed.origin;
    const websiteDisplay = parsed.hostname
      .replace(/^www\./, '')
      .toLowerCase();

    return { website, websiteDisplay };
  } catch {
    return {
      website: url,
      websiteDisplay: url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''),
    };
  }
}

export function normalizeDomain(url: string | null | undefined): string {
  if (!url) return '';
  return url
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
    .trim();
}

// ============================================================
// Email Type Classification
// ============================================================

export function classifyEmail(email: string | null | undefined): 'personal' | 'generic' | null {
  if (!email) return null;

  const localPart = email.split('@')[0]?.toLowerCase() || '';

  for (const prefix of GENERIC_EMAIL_PREFIXES) {
    if (localPart === prefix || localPart.startsWith(prefix + '.') || localPart.startsWith(prefix + '_')) {
      return 'generic';
    }
  }

  return 'personal';
}

// ============================================================
// First Name Parsing
// ============================================================

export function parseFirstName(contactName: string | null | undefined): string | null {
  if (!contactName || contactName.trim() === '') return null;

  const parts = contactName.trim().split(/\s+/);
  const prefixes = ['dr', 'dr.', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'prof', 'prof.'];
  let firstNameIndex = 0;

  if (parts.length > 1 && prefixes.includes(parts[0].toLowerCase())) {
    firstNameIndex = 1;
  }

  const firstName = parts[firstNameIndex];
  if (!firstName) return null;

  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

// ============================================================
// Fuzzy Name Matching (for Local Pack detection)
// ============================================================

export function normalizeNameForMatch(name: string): string {
  if (!name) return '';
  return name
    .replace(LEGAL_SUFFIXES_REGEX, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function fuzzyNameMatch(leadName: string, packName: string): boolean {
  const a = normalizeNameForMatch(leadName);
  const b = normalizeNameForMatch(packName);

  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b)) return true;
  if (b.includes(a)) return true;

  return false;
}

// ============================================================
// Process a single Outscraper result into cleaned lead data
// ============================================================

export interface CleanedLeadData {
  businessName: string;
  businessNameRaw: string;
  contactName: string | null;
  firstName: string | null;
  email: string | null;
  email2: string | null;
  email3: string | null;
  emailType: string | null;
  phone: string | null;
  website: string | null;
  websiteRaw: string | null;
  websiteDisplay: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  googleRating: number | null;
  reviewCount: number | null;
  reviewsPerScore: Record<string, number> | null;
  businessHours: string | null;
  businessCategory: string | null;
  isVerified: boolean;
  googleMapsUrl: string | null;
  googlePlaceId: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  status: 'FILTERED' | 'FILTERED_NO_SITE' | 'PARKED';
}

export function processOutscraperResult(raw: Record<string, unknown>): CleanedLeadData {
  const nameRaw = String(raw.name || raw.query || '');
  const emailRaw = raw.email_1 || raw.email || null;
  const websiteRaw = raw.site || raw.website || null;

  const businessName = cleanBusinessName(nameRaw);
  const contactName = raw.owner_name ? String(raw.owner_name) : null;
  const firstName = parseFirstName(contactName);
  const urlData = normalizeUrl(websiteRaw as string | null);
  const email = emailRaw ? String(emailRaw).trim().toLowerCase() : null;
  const emailType = classifyEmail(email);

  let status: 'FILTERED' | 'FILTERED_NO_SITE' | 'PARKED';
  if (!email) {
    status = 'PARKED';
  } else if (!urlData) {
    status = 'FILTERED_NO_SITE';
  } else {
    status = 'FILTERED';
  }

  return {
    businessName,
    businessNameRaw: nameRaw,
    contactName,
    firstName,
    email,
    email2: raw.email_2 ? String(raw.email_2).trim().toLowerCase() : null,
    email3: raw.email_3 ? String(raw.email_3).trim().toLowerCase() : null,
    emailType,
    phone: raw.phone ? String(raw.phone) : null,
    website: urlData?.website || null,
    websiteRaw: websiteRaw ? String(websiteRaw) : null,
    websiteDisplay: urlData?.websiteDisplay || null,
    address: raw.full_address ? String(raw.full_address) : null,
    city: raw.city ? String(raw.city) : null,
    country: raw.country ? String(raw.country) : null,
    googleRating: raw.rating != null ? Number(raw.rating) : null,
    reviewCount: raw.reviews != null ? Number(raw.reviews) : null,
    reviewsPerScore: raw.reviews_per_score as Record<string, number> | null,
    businessHours: raw.working_hours ? JSON.stringify(raw.working_hours) : null,
    businessCategory: raw.category ? String(raw.category) : null,
    isVerified: Boolean(raw.verified),
    googleMapsUrl: raw.google_maps_url ? String(raw.google_maps_url) : null,
    googlePlaceId: raw.place_id ? String(raw.place_id) : null,
    facebookUrl: raw.facebook ? String(raw.facebook) : null,
    instagramUrl: raw.instagram ? String(raw.instagram) : null,
    linkedinUrl: raw.linkedin ? String(raw.linkedin) : null,
    status,
  };
}
