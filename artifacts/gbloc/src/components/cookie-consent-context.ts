import { createContext, useContext } from 'react';
import type { CookieConsent } from '@/lib/cookie-consent';

export type CookieConsentContextValue = {
  consent: CookieConsent | null;
  preferencesAllowed: boolean;
  saveChoice: () => void;
};

export const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function useCookiePreferencesAllowed() {
  return useContext(CookieConsentContext)?.preferencesAllowed ?? false;
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (!context) throw new Error('useCookieConsent must be used inside CookieConsentProvider.');
  return context;
}
