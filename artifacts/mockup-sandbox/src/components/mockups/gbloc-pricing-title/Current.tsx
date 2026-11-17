import { ArrowRight, Check, EyeOff, Music2, Sparkles, Type, type LucideIcon } from 'lucide-react';
import './_group.css';

type Feature = { icon: LucideIcon; title: string; detail: string };

const basicFeatures: Feature[] = [
  { icon: Sparkles, title: 'ฉากหลังเสริม', detail: 'เพิ่มบรรยากาศให้หน้าโปรไฟล์' },
  { icon: Type, title: 'ฟอนต์เพิ่มเติม', detail: 'เลือกแบบอักษรให้เข้ากับสไตล์คุณ' },
  { icon: Sparkles, title: 'เอฟเฟกต์ตัวหนังสือ', detail: 'เรืองแสง ไล่สี และ Fuzzy' },
  { icon: EyeOff, title: 'ซ่อนข้อความท้ายโปรไฟล์', detail: 'เลือกซ่อน “สร้างพื้นที่ของคุณด้วย GBLOC” ได้' },
];

const proFeatures: Feature[] = [
  { icon: Check, title: 'ทุกฟีเจอร์ใน Basic', detail: 'ฉากหลัง ฟอนต์ และเอฟเฟกต์ชื่อ' },
  { icon: Music2, title: 'เพิ่มเสียงได้สูงสุด 4 รายการ', detail: 'สลับเสียงที่อยากแชร์บนโปรไฟล์' },
  { icon: Sparkles, title: 'เครื่องหมาย Pro', detail: 'แสดงต่อท้ายชื่อบนหน้าโปรไฟล์' },
];

function FeatureList({ items }: { items: Feature[] }) {
  return <ul className="plan-features">
    {items.map(({ icon: Icon, title, detail }) => <li key={title}>
      <span className="plan-feature-icon"><Icon size={15} /></span>
      <span><strong>{title}</strong><small>{detail}</small></span>
      <Check className="plan-feature-check" size={16} />
    </li>)}
  </ul>;
}

export function Current() {
  return <div className="mockup-stage">
    <main className="price-page pricing-page">
      <section className="pricing-hero" aria-labelledby="current-pricing-title">
        <span className="eyebrow">GBLOC / แพ็กเกจ</span>
        <h1 id="current-pricing-title">เลือกแพ็กเกจที่ใช่<br /><em>สำหรับ gbloc ของคุณ</em></h1>
        <p className="price-lede">เริ่มต้นฟรี แล้วเลือกแพ็กเกจที่เข้ากับหน้าโปรไฟล์ของคุณเมื่อพร้อม</p>
      </section>

      <section className="plan-grid" aria-label="แพ็กเกจของ gbloc">
        <article className="plan-card">
          <div className="plan-card-top">
            <span className="plan-name">BASIC</span>
            <span className="plan-state">จ่ายครั้งเดียว · 1 เดือน</span>
          </div>
          <h2>แต่งหน้าโปรไฟล์ให้เป็นสไตล์คุณ</h2>
          <p className="plan-description">เติมสีสันและบรรยากาศให้หน้า gbloc ของคุณ</p>
          <div className="plan-price"><span>ราคา</span><strong>฿35 / 1 เดือน</strong></div>
          <FeatureList items={basicFeatures} />
          <button type="button" className="plan-cta">เข้าสู่ระบบเพื่อซื้อ <ArrowRight size={16} /></button>
          <p className="plan-cta-note">จ่ายครั้งเดียว ไม่มีต่ออายุอัตโนมัติ · ใช้ได้ 1 เดือน</p>
          <span className="plan-preview-link">ลองพรีวิว Basic ก่อน</span>
        </article>

        <article className="plan-card plan-card-pro">
          <div className="plan-card-top">
            <span className="plan-name plan-name-pro">PRO</span>
            <span className="plan-state">แผนในอนาคต</span>
          </div>
          <h2>ครบกว่า สำหรับหน้าโปรไฟล์ของคุณ</h2>
          <p className="plan-description">ทุกอย่างใน Basic พร้อมฟีเจอร์เพิ่มเติม</p>
          <div className="plan-price"><span>ราคา</span><strong>ยังไม่ประกาศ</strong></div>
          <FeatureList items={proFeatures} />
          <button type="button" className="plan-cta plan-cta-secondary">ดูรายละเอียด Pro <ArrowRight size={16} /></button>
          <p className="plan-cta-note">ยังไม่มีการสมัครหรือชำระเงินจริง</p>
        </article>
      </section>
    </main>
  </div>;
}
