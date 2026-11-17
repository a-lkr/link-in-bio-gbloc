import { ArrowRight, Check, EyeOff, Link2, Music2, Sparkles, Type } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { useCreateCheckoutSession, useGetBillingConfig } from '@workspace/api-client-react';
import { useUser } from '@/components/auth-context';
import { Brand, CopyrightNotice, PublicHeader } from '@/components/gbloc-shared';
import '@/styles/pricing.css';

const basicFeatures = [
  { icon: Link2, title: 'ลิงก์โปรไฟล์สูงสุด 5 รายการ', detail: 'บัญชีทั่วไปเพิ่มได้สูงสุด 2 รายการ' },
  { icon: Sparkles, title: 'ฉากหลังเสริม', detail: 'เพิ่มบรรยากาศให้หน้าโปรไฟล์' },
  { icon: Type, title: 'ฟอนต์เพิ่มเติม', detail: 'เลือกแบบอักษรให้เข้ากับสไตล์คุณ' },
  { icon: Sparkles, title: 'เอฟเฟกต์ตัวหนังสือ', detail: 'เรืองแสง ไล่สี และ Fuzzy' },
  { icon: EyeOff, title: 'ซ่อนข้อความท้ายโปรไฟล์', detail: 'เลือกซ่อน “สร้างพื้นที่ของคุณด้วย GBLOC” ได้' },
];

function checkoutErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof data.error === 'string'
    ) {
      return data.error;
    }
  }
  return 'เริ่มชำระเงินไม่สำเร็จ กรุณาลองอีกครั้ง';
}

export default function PricePage() {
  const [proPreviewOpen, setProPreviewOpen] = useState(false);
  const billingConfig = useGetBillingConfig();
  const checkout = useCreateCheckoutSession();
  const { isLoaded, isSignedIn } = useUser();
  const billingReturn = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('billing');

  function startBasicCheckout() {
    checkout.mutate({ data: { plan: 'basic' } }, {
      onSuccess: data => window.location.assign(data.checkoutUrl),
    });
  }

  return (
    <div className="marketing-page route-arrive">
      <PublicHeader current="/price" />
      <main className="price-page pricing-page">
        <section className="pricing-hero" aria-labelledby="pricing-title">
          <span className="eyebrow"><i /> GBLOC / แพ็กเกจ</span>
          <h1 id="pricing-title">เลือกแพ็กเกจที่ใช่<br /><em>สำหรับ gbloc ของคุณ</em></h1>
          <p className="price-lede">เริ่มต้นฟรี แล้วเลือกแพ็กเกจที่เข้ากับหน้าโปรไฟล์ของคุณเมื่อพร้อม</p>
        </section>

        <section className="plan-grid" aria-label="แพ็กเกจของ gbloc">
          <article className="plan-card" data-testid="card-plan-basic">
            <div className="plan-card-top">
              <span className="plan-name">BASIC</span>
              <span className="plan-state">จ่ายครั้งเดียว · 1 เดือน</span>
            </div>
            <h2>แต่งหน้าโปรไฟล์ให้<br /><em>เป็นสไตล์คุณ</em></h2>
            <p className="plan-description">เติมสีสันและบรรยากาศให้หน้า gbloc ของคุณ</p>
            <div className="plan-price"><span>ราคา</span><strong>฿35 / 1 เดือน</strong></div>
            <ul className="plan-features">
              {basicFeatures.map(({ icon: Icon, title, detail }) => <li key={title}>
                <span className="plan-feature-icon"><Icon size={15} /></span>
                <span><strong>{title}</strong><small>{detail}</small></span>
                <Check className="plan-feature-check" size={16} />
              </li>)}
            </ul>
            {billingConfig.data?.plans.basic
              ? isLoaded && isSignedIn
                ? <button
                    type="button"
                    className="plan-cta plan-cta-primary"
                    onClick={startBasicCheckout}
                    disabled={checkout.isPending}
                    data-testid="button-buy-basic"
                  >
                    {checkout.isPending ? 'กำลังไปหน้าชำระเงิน…' : 'ซื้อ Basic ฿35'}
                    {!checkout.isPending && <ArrowRight size={16} />}
                  </button>
                : isLoaded
                  ? <Link href="/sign-in" className="plan-cta plan-cta-primary" data-testid="link-sign-in-to-buy-basic">
                      เข้าสู่ระบบเพื่อซื้อ <ArrowRight size={16} />
                    </Link>
                  : <button type="button" className="plan-cta plan-cta-primary" disabled>
                      กำลังตรวจสอบบัญชี…
                    </button>
              : <button type="button" className="plan-cta plan-cta-primary" disabled data-testid="button-basic-unavailable">
                  {billingConfig.isLoading ? 'กำลังตรวจสอบการชำระเงิน…' : 'ระบบชำระเงินยังไม่พร้อม'}
                </button>}
            <p className="plan-cta-note">
              จ่ายครั้งเดียว ไม่มีต่ออายุอัตโนมัติ · ใช้ได้ 1 เดือน
            </p>
            <Link
              href="/customize?section=cz-visuals"
              className="plan-preview-link"
              data-testid="link-preview-basic"
            >
              ลองพรีวิว Basic ก่อน
            </Link>
            {billingConfig.isError && <p className="plan-billing-alert" role="alert">
              ตรวจสอบสถานะการชำระเงินไม่สำเร็จ กรุณาลองโหลดหน้านี้อีกครั้ง
            </p>}
            {checkout.isError && <p className="plan-billing-alert" role="alert">
              {checkoutErrorMessage(checkout.error)}
            </p>}
            {billingReturn === 'cancelled' && <p className="plan-billing-alert" role="status">
              ยกเลิกการชำระเงินแล้ว ยังไม่มีการเรียกเก็บเงิน
            </p>}
          </article>

          <article className="plan-card plan-card-pro" data-testid="card-plan-pro">
            <div className="plan-card-top">
              <span className="plan-name plan-name-pro">PRO</span>
              <span className="plan-state">แผนในอนาคต</span>
            </div>
            <h2>ครบกว่า<br /><em>สำหรับหน้าโปรไฟล์ของคุณ</em></h2>
            <p className="plan-description">ทุกอย่างใน Basic พร้อมฟีเจอร์เพิ่มเติม</p>
            <div className="plan-price"><span>ราคา</span><strong>ยังไม่ประกาศ</strong></div>
            <ul className="plan-features">
              <li>
                <span className="plan-feature-icon"><Check size={15} /></span>
                <span><strong>ทุกฟีเจอร์ใน Basic</strong><small>รวมลิงก์โปรไฟล์สูงสุด 5 รายการ</small></span>
                <Check className="plan-feature-check" size={16} />
              </li>
              <li>
                <span className="plan-feature-icon"><Music2 size={15} /></span>
                <span><strong>เพิ่มเสียงได้สูงสุด 4 รายการ</strong><small>สลับเสียงที่อยากแชร์บนโปรไฟล์</small></span>
                <Check className="plan-feature-check" size={16} />
              </li>
              <li>
                <span className="plan-feature-icon"><Sparkles size={15} /></span>
                <span><strong>เครื่องหมาย Pro</strong><small>แสดงต่อท้ายชื่อบนหน้าโปรไฟล์</small></span>
                <Check className="plan-feature-check" size={16} />
              </li>
            </ul>
            <button type="button" className="plan-cta plan-cta-secondary" aria-expanded={proPreviewOpen}
              aria-controls="pro-preview-note" onClick={() => setProPreviewOpen(open => !open)} data-testid="button-preview-pro">
              {proPreviewOpen ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด Pro'} <ArrowRight size={16} />
            </button>
            {proPreviewOpen && <div className="plan-preview-note" id="pro-preview-note">
              <p>ตอนนี้ลองพรีวิวส่วน Basic ที่รวมอยู่ใน Pro ได้ ส่วนเสียง 4 รายการและเครื่องหมาย Pro ยังไม่เปิดให้ทดลอง</p>
              <Link href="/customize?section=cz-visuals" data-testid="link-preview-pro-basic">ลองพรีวิว Basic <ArrowRight size={14} /></Link>
            </div>}
            <p className="plan-cta-note">ยังไม่มีการสมัครหรือชำระเงินจริง</p>
          </article>
        </section>

        <Link href="/" className="pricing-home-link" data-testid="link-price-home"><ArrowRight size={15} /> กลับไปหน้าแรก</Link>
      </main>
      <footer className="site-footer">
        <Brand /><span>พื้นที่ของคุณบนอินเทอร์เน็ต</span>
        <Link href="/legal#terms" data-testid="link-price-terms">ข้อกำหนด</Link>
        <CopyrightNotice />
      </footer>
    </div>
  );
}
