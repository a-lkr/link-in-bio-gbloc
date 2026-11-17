import { useMemo, useState, type ReactNode } from 'react';
import { Cookie } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import {
  CookieConsentContext,
  useCookieConsent,
  type CookieConsentContextValue,
} from '@/components/cookie-consent-context';
import {
  readCookieConsent,
  saveCookieConsent,
  type CookieConsent,
} from '@/lib/cookie-consent';
import './cookie-consent.css';

function CookieConsentSurface() {
  const { consent, saveChoice } = useCookieConsent();
  const [location] = useLocation();
  const onSettingsPage = location === '/cookies';
  const onPublicProfile = /^\/@?[A-Za-z0-9_]{3,20}\/?$/.test(location);

  return <>
    {!consent && !onSettingsPage && <aside className="cookie-banner" aria-label="การใช้คุกกี้">
      <div className="cookie-banner-copy">
        <Cookie size={18} aria-hidden="true" />
        <p>gbloc ใช้คุกกี้สำหรับการเข้าสู่ระบบ ความปลอดภัย และจดจำการตั้งค่าเมนูบนอุปกรณ์นี้ เพื่อให้เว็บทำงานตามที่เลือก</p>
      </div>
      <div className="cookie-banner-actions">
        <button type="button" className="cookie-button cookie-button-primary" onClick={saveChoice}>
          ยอมรับและเข้าใช้เว็บ
        </button>
      </div>
    </aside>}
    {consent && !onSettingsPage && !onPublicProfile && <Link href="/cookies" className="cookie-settings-shortcut" aria-label="เปิดการตั้งค่าคุกกี้">
      <Cookie size={15} aria-hidden="true" /> คุกกี้
    </Link>}
  </>;
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsent | null>(() => readCookieConsent());
  const contextValue = useMemo<CookieConsentContextValue>(() => ({
    consent,
    preferencesAllowed: consent?.preferences === true,
    saveChoice: () => setConsent(saveCookieConsent()),
  }), [consent]);

  return <CookieConsentContext.Provider value={contextValue}>
    {children}
    <CookieConsentSurface />
  </CookieConsentContext.Provider>;
}
