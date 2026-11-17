import { useState } from 'react';
import { ArrowLeft, Cookie } from 'lucide-react';
import { Link } from 'wouter';
import { Brand, CopyrightNotice, PublicHeader } from '@/components/gbloc-shared';
import { useCookieConsent } from '@/components/cookie-consent-context';

export default function CookieSettingsPage() {
  const { consent, saveChoice } = useCookieConsent();
  const [saved, setSaved] = useState(false);

  function saveSettings() {
    saveChoice();
    setSaved(true);
  }

  return <div className="cookie-page route-arrive">
    <PublicHeader current="/cookies" />
    <main className="cookie-page-main">
      <span className="cookie-page-kicker"><i /> ความเป็นส่วนตัว / คุกกี้</span>
      <h1>การตั้งค่าคุกกี้</h1>
      <p className="cookie-page-intro">
        คุกกี้สำหรับการเข้าสู่ระบบ ความปลอดภัย และการจดจำการตั้งค่าพื้นฐานจะทำงานตลอดเวลา
      </p>

      <section className="cookie-panel" aria-labelledby="cookie-necessary-title">
        <div className="cookie-choice-row">
          <div className="cookie-choice-copy">
            <strong id="cookie-necessary-title">คุกกี้ที่จำเป็น</strong>
            <p>ใช้สำหรับการเข้าสู่ระบบและความปลอดภัยของบัญชี รวมถึงจดจำตัวเลือกคุกกี้ของคุณ</p>
          </div>
          <span className="cookie-always-on">เปิดตลอด</span>
        </div>
      </section>

      <section className="cookie-panel" aria-labelledby="cookie-preferences-title">
        <div className="cookie-choice-row">
          <div className="cookie-choice-copy">
            <strong id="cookie-preferences-title">การจดจำการตั้งค่า</strong>
            <p>จำสถานะแถบเมนูแบบย่อบนอุปกรณ์นี้ 7 วัน มีผลเฉพาะหน้าที่ใช้เมนูรูปแบบนี้ หากไม่มีเมนูดังกล่าวจะไม่มีการตั้งคุกกี้นี้</p>
            <p>ใช้เพื่อให้เว็บทำงานตามที่คุณเลือก ไม่ใช้เพื่อโฆษณาหรือติดตามข้ามเว็บไซต์</p>
          </div>
          <span className="cookie-always-on">เปิดตลอด</span>
        </div>
      </section>

      <section className="cookie-panel">
        <h2>Analytics และโฆษณา</h2>
        <p>ตอนนี้ gbloc ยังไม่ใช้คุกกี้วิเคราะห์ผู้เข้าชมหรือคุกกี้โฆษณา</p>
      </section>

      <div className="cookie-page-actions">
        <button type="button" className="cookie-button cookie-button-primary" onClick={saveSettings} data-testid="button-save-cookie-settings">
          ยอมรับและบันทึก
        </button>
      </div>
      <p className="cookie-save-status" role="status" aria-live="polite">
        {saved || consent ? 'คุกกี้ที่แสดงในหน้านี้เปิดใช้งานตลอด' : ''}
      </p>

      <Link href="/" className="cookie-page-back"><ArrowLeft size={14} /> กลับหน้าแรก</Link>
    </main>
    <footer className="site-footer"><Brand /><span>พื้นที่ของคุณบนอินเทอร์เน็ต</span><span><Cookie size={13} /> ตั้งค่าคุกกี้ได้ทุกเมื่อ</span><CopyrightNotice /></footer>
  </div>;
}
