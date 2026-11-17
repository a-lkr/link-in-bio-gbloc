export const COOKIE_CONSENT_VERSION = 2;
export const COOKIE_CONSENT_MAX_AGE = 60 * 60 * 24 * 180;
export const SIDEBAR_PREFERENCE_MAX_AGE = 60 * 60 * 24 * 7;

const CONSENT_COOKIE_NAME = 'gbloc_cookie_consent';
const SIDEBAR_COOKIE_NAME = 'sidebar_state';

export type CookieConsent = {
  version: number;
  necessary: true;
  preferences: true;
  savedAt: string;
};

function secureAttribute() {
  return window.location.protocol === 'https:' ? '; Secure' : '';
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const entry = document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith(prefix));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.slice(prefix.length));
  } catch {
    return null;
  }
}

export function readCookieConsent(): CookieConsent | null {
  const raw = readCookie(CONSENT_COOKIE_NAME);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CookieConsent>;
    if (
      value.version !== COOKIE_CONSENT_VERSION ||
      value.necessary !== true ||
      value.preferences !== true ||
      typeof value.savedAt !== 'string'
    ) {
      return null;
    }
    return value as CookieConsent;
  } catch {
    return null;
  }
}

export function saveCookieConsent(): CookieConsent {
  const consent: CookieConsent = {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    preferences: true,
    savedAt: new Date().toISOString(),
  };
  document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(consent))}; Path=/; Max-Age=${COOKIE_CONSENT_MAX_AGE}; SameSite=Lax${secureAttribute()}`;
  return consent;
}

export function readSidebarPreference(): boolean | null {
  if (readCookieConsent()?.preferences !== true) return null;
  const value = readCookie(SIDEBAR_COOKIE_NAME);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

export function syncSidebarPreference(open: boolean, allowed: boolean): void {
  if (allowed) {
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${open}; Path=/; Max-Age=${SIDEBAR_PREFERENCE_MAX_AGE}; SameSite=Lax${secureAttribute()}`;
    return;
  }
  document.cookie = `${SIDEBAR_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secureAttribute()}`;
}
