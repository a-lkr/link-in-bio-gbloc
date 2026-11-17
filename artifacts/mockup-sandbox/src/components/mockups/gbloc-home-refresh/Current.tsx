import { useState } from 'react';
import {
  ArrowDown,
  Check,
  ChevronRight,
  CircleUserRound,
  Cookie,
  Eye,
  Instagram,
  Link2,
  MapPin,
  MessageCircle,
  Music2,
  Palette,
  Pause,
  SkipBack,
  SkipForward,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import './_group.css';

const cookieConsentName = 'gbloc_cookie_consent';

function hasCookieConsent() {
  if (typeof document === 'undefined') return false;
  const entry = document.cookie.split(';').map(value => value.trim())
    .find(value => value.startsWith(`${cookieConsentName}=`));
  if (!entry) return false;
  try {
    const consent = JSON.parse(decodeURIComponent(entry.slice(cookieConsentName.length + 1)));
    return consent.version === 2 && consent.necessary === true &&
      consent.preferences === true && typeof consent.savedAt === 'string';
  } catch {
    return false;
  }
}

function Brand() {
  return <a href="/" className="brand" aria-label="gbloc">
    <img className="brand-full-logo" src="/__mockup/images/brand-full.png" alt="gbloc" />
  </a>;
}

function PublicHeader() {
  return <header className="site-header">
    <Brand />
    <nav className="editor-nav" aria-label="เมนูหลัก">
      <a href="/customize" className="editor-nav-link"><WandSparkles size={17} />ปรับแต่งหน้า</a>
      <a href="/link" className="editor-nav-link"><Link2 size={17} />ลิงก์ของฉัน</a>
      <a href="/account" className="editor-nav-link"><CircleUserRound size={17} />บัญชี</a>
      <a href="/price" className="editor-nav-link"><Sparkles size={17} />แพ็กเกจ</a>
    </nav>
    <a href="/sign-in" className="nav-login">เข้าสู่ระบบ <ChevronRight size={15} /></a>
  </header>;
}

function ProfileMockup() {
  return <div className="mock-browser">
    <div className="mock-bar"><i /><i /><i /><span>example.com / @mellow</span></div>
    <div className="mock-profile">
      <div className="mock-avatar">ม</div>
      <span className="mock-username">@mellow</span>
      <h3>มิลค์ชอบถ่ายรูป</h3>
      <p>พื้นที่เล็ก ๆ ที่เล่าเรื่องของเรา</p>
      <div className="mock-location"><MapPin size={11} />เชียงใหม่</div>
      <div className="mock-socials" aria-label="ตัวอย่างลิงก์โซเชียล">
        <span aria-label="Instagram"><Instagram size={16} /></span>
        <span aria-label="Discord"><MessageCircle size={16} /></span>
        <span className="mock-social-x" aria-label="X">𝕏</span>
      </div>
      <div className="mock-media">
        <span className="mock-views"><Eye size={11} />10</span>
        <div className="mock-music">
          <span className="mock-music-cover"><Music2 size={15} /></span>
          <span className="mock-music-copy">
            <b>just listen...</b>
            <span className="mock-timeline"><small>0:02</small><i><b /></i><small>5:46</small></span>
          </span>
          <span className="mock-music-controls" aria-hidden="true"><SkipBack size={12} /><Pause size={14} /><SkipForward size={12} /></span>
        </div>
      </div>
      <div className="mock-footer">made with <b>gbloc</b></div>
    </div>
  </div>;
}

function CookieConsent() {
  const [consent, setConsent] = useState(hasCookieConsent);
  const saveChoice = () => {
    const value = {
      version: 2,
      necessary: true,
      preferences: true,
      savedAt: new Date().toISOString(),
    };
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${cookieConsentName}=${encodeURIComponent(JSON.stringify(value))}; Path=/; Max-Age=15552000; SameSite=Lax${secure}`;
    setConsent(true);
  };

  if (consent) {
    return <a href="/cookies" className="cookie-settings-shortcut" aria-label="เปิดการตั้งค่าคุกกี้">
      <Cookie size={15} aria-hidden="true" /> คุกกี้
    </a>;
  }
  return <aside className="cookie-banner" aria-label="การใช้คุกกี้">
    <div className="cookie-banner-copy">
      <Cookie size={18} aria-hidden="true" />
      <p>gbloc ใช้คุกกี้สำหรับการเข้าสู่ระบบ ความปลอดภัย และจดจำการตั้งค่าเมนูบนอุปกรณ์นี้ เพื่อให้เว็บทำงานตามที่เลือก</p>
    </div>
    <div className="cookie-banner-actions">
      <button type="button" className="cookie-button cookie-button-primary" onClick={saveChoice}>
        ยอมรับและเข้าใช้เว็บ
      </button>
    </div>
  </aside>;
}

export function Current() {
  return <div className="gbloc-home-refresh marketing-page route-arrive">
    <PublicHeader />
    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><i /> หน้าเดียว ครบทุก vibe</span>
          <h1>ทุกลิงก์ของเรา<br /><em>อยู่ในหน้าเดียว</em></h1>
          <p>รวมโซเชียล รูป เสียง และสิ่งที่อยากแชร์ไว้ใน gbloc ของคุณ ปรับให้เป็นสไตล์เรา แล้วส่งลิงก์เดียวให้เพื่อน</p>
          <div className="hero-actions">
            <a href="/sign-up" className="button button-primary" data-testid="button-create-profile">
              <Sparkles size={17} />เริ่มทำหน้าเรา <ChevronRight size={17} />
            </a>
            <a href="#how-it-works" className="button button-outline hero-secondary" onClick={event => {
              event.preventDefault();
              document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}><ArrowDown size={15} /> ดูวิธีเริ่มต้น</a>
          </div>
          <div className="hero-footnote">
            <span className="hero-footnote-mark"><Check size={13} /></span>
            <span>ปรับรูป สี และลิงก์ได้เอง ไม่ต้องเขียนโค้ด</span>
          </div>
        </div>
        <div className="profile-stage">
          <div className="stage-stamp">YOUR PAGE<br /><b>YOUR VIBE</b></div>
          <ProfileMockup />
        </div>
      </section>

      <section className="manifesto section-wrap">
        <div className="section-kicker">01 — ไม่ต้องส่งหลายลิงก์</div>
        <div className="manifesto-grid">
          <h2>ส่งลิงก์เดียว<br /><em>แล้วไปต่อได้เลย</em></h2>
          <p>คนที่กดเข้ามาจะเห็นสิ่งที่เราอยากแชร์ ทั้งโซเชียล งานเสียง หรือข้อความสั้น ๆ ที่อยากให้จำ</p>
        </div>
      </section>

      <section className="feature-band">
        <div className="section-wrap feature-grid">
          <div className="feature-intro">
            <span className="eyebrow">MAKE IT YOURS</span>
            <h2>ปรับได้ตามใจ<br />ไม่ต้องเหมือนใคร</h2>
            <p>เลือกสี ใส่ภาพ แล้วจัดลิงก์ในแบบที่รู้สึกว่าใช่</p>
          </div>
          <div className="feature-list">
            <article>
              <div className="home-feature-top"><span>01</span><span className="home-feature-icon"><Palette size={17} /></span></div>
              <div><h3>แต่งหน้าให้เป็นเรา</h3><p>เลือกรูป สี และฉากหลังให้เข้ากับสไตล์ที่ชอบ</p></div>
            </article>
            <article>
              <div className="home-feature-top"><span>02</span><span className="home-feature-icon"><Link2 size={17} /></span></div>
              <div><h3>รวมช่องทางไว้ที่เดียว</h3><p>จัดลำดับโซเชียลและลิงก์สำคัญได้ตามใจ</p></div>
            </article>
            <article>
              <div className="home-feature-top"><span>03</span><span className="home-feature-icon"><Music2 size={17} /></span></div>
              <div><h3>เพิ่มเสียงที่ชอบ</h3><p>ใส่เสียงและเลือกได้ว่าจะโชว์เครื่องเล่นหรือไม่</p></div>
            </article>
          </div>
        </div>
      </section>

      <section className="how-section section-wrap" id="how-it-works">
        <div className="section-kicker">02 — เริ่มง่าย ๆ</div>
        <div className="how-heading">
          <h2>เริ่มได้ใน <em>3 ขั้น</em></h2>
          <p>ไม่ต้องเขียนโค้ด แค่เลือกสิ่งที่อยากแชร์แล้วจัดหน้าในแบบของคุณ</p>
        </div>
        <div className="how-steps">
          <article className="how-step"><span className="how-step-number">01</span><div><h3>เลือกชื่อผู้ใช้</h3><p>ได้ลิงก์ example.com/@ชื่อผู้ใช้ของตัวเอง</p></div></article>
          <article className="how-step"><span className="how-step-number">02</span><div><h3>ปรับหน้าโปรไฟล์</h3><p>ใส่รูป สี ฉากหลัง และข้อความ</p></div></article>
          <article className="how-step"><span className="how-step-number">03</span><div><h3>เพิ่มลิงก์แล้วแชร์</h3><p>รวมทุกช่องทางไว้ในลิงก์เดียว</p></div></article>
        </div>
      </section>

      <section className="closing section-wrap">
        <div className="closing-mark"><img src="/__mockup/images/brand-g.png" alt="gbloc" /></div>
        <div>
          <span className="section-kicker">03 — พร้อมแล้วก็ลุย</span>
          <h2>ทำหน้าโปรไฟล์<br /><em>ในสไตล์ของเรา</em></h2>
          <a href="/sign-up" className="button button-primary" data-testid="button-start-bottom">เริ่มทำหน้าเรา <ChevronRight size={17} /></a>
        </div>
      </section>
    </main>
    <footer className="site-footer">
      <Brand /><span>พื้นที่ของเรา บนอินเทอร์เน็ต</span>
      <a href="/legal#terms" data-testid="link-footer-terms">ข้อกำหนด</a>
      <a href="/legal#privacy" data-testid="link-footer-privacy">นโยบายความเป็นส่วนตัว</a>
      <a href="/price" data-testid="link-footer-price">แพ็กเกจ</a>
      <small className="site-copyright">© {new Date().getFullYear()} GBLOC. All rights reserved.</small>
    </footer>
    <CookieConsent />
  </div>;
}

export default Current;
