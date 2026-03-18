import crypto from 'crypto';
import { prisma } from './db';
import { SENSITIVE_SETTINGS, SCORING_DEFAULTS } from './constants';

// ============================================================
// Encryption for sensitive settings (API keys)
// Uses AES-256-GCM with NEXTAUTH_SECRET as the key
// ============================================================
const ALGORITHM = 'aes-256-gcm';
const ENCODING_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-dev-secret';

function getEncryptionKey(): Buffer {
  // Derive a 32-byte key from the secret
  return crypto.scryptSync(ENCODING_SECRET, 'leapfour-salt', 32);
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  try {
    const key = getEncryptionKey();
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    if (!ivHex || !authTagHex || !encrypted) return encryptedText; // not encrypted, return as-is
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    // If decryption fails (e.g., value wasn't encrypted), return as-is
    return encryptedText;
  }
}

// ============================================================
// Read settings
// ============================================================
export async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  if (!setting) return null;
  if ((SENSITIVE_SETTINGS as readonly string[]).includes(key)) {
    return decrypt(setting.value);
  }
  return setting.value;
}

export async function getSettings(keys: string[]): Promise<Record<string, string | null>> {
  const settings = await prisma.setting.findMany({
    where: { key: { in: keys } },
  });
  const result: Record<string, string | null> = {};
  for (const key of keys) {
    const setting = settings.find(s => s.key === key);
    if (!setting) {
      result[key] = null;
    } else if ((SENSITIVE_SETTINGS as readonly string[]).includes(key)) {
      result[key] = decrypt(setting.value);
    } else {
      result[key] = setting.value;
    }
  }
  return result;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const settings = await prisma.setting.findMany();
  const result: Record<string, string> = {};
  for (const setting of settings) {
    if ((SENSITIVE_SETTINGS as readonly string[]).includes(setting.key)) {
      // Mask sensitive values for API response: show last 4 chars
      const decrypted = decrypt(setting.value);
      result[setting.key] = decrypted.length > 4
        ? '••••••••' + decrypted.slice(-4)
        : '••••';
    } else {
      result[setting.key] = setting.value;
    }
  }
  return result;
}

// ============================================================
// Write settings
// ============================================================
export async function setSetting(key: string, value: string): Promise<void> {
  const storeValue = (SENSITIVE_SETTINGS as readonly string[]).includes(key) ? encrypt(value) : value;
  await prisma.setting.upsert({
    where: { key },
    update: { value: storeValue },
    create: { key, value: storeValue },
  });
}

export async function setSettings(entries: Record<string, string>): Promise<void> {
  const operations = Object.entries(entries).map(([key, value]) => {
    const storeValue = (SENSITIVE_SETTINGS as readonly string[]).includes(key) ? encrypt(value) : value;
    return prisma.setting.upsert({
      where: { key },
      update: { value: storeValue },
      create: { key, value: storeValue },
    });
  });
  await prisma.$transaction(operations);
}

// ============================================================
// Get setting with env var fallback (for first boot before Settings page)
// ============================================================
export async function getSettingWithEnvFallback(
  key: string,
  envVar: string
): Promise<string | null> {
  const dbValue = await getSetting(key);
  if (dbValue) return dbValue;
  return process.env[envVar] || null;
}

// ============================================================
// Get scoring thresholds (with defaults)
// ============================================================
export async function getScoringThresholds() {
  const keys = Object.keys(SCORING_DEFAULTS);
  const settings = await getSettings(keys);
  return {
    ratingThreshold: parseFloat(settings[keys[0]] || SCORING_DEFAULTS[keys[0]]),
    countThreshold: parseInt(settings[keys[1]] || SCORING_DEFAULTS[keys[1]]),
    pagespeedThreshold: parseInt(settings[keys[2]] || SCORING_DEFAULTS[keys[2]]),
    strongRatingThreshold: parseFloat(settings[keys[3]] || SCORING_DEFAULTS[keys[3]]),
    strongReviewsThreshold: parseInt(settings[keys[4]] || SCORING_DEFAULTS[keys[4]]),
    overscrapeMultiplier: parseFloat(settings[keys[5]] || SCORING_DEFAULTS[keys[5]]),
  };
}
