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
import './IdentityAtlas.css';

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
  return <header className="atlas-header">
    <Brand />
    <nav className="atlas-nav" aria-label="เมนูหลัก">
      <a href="/customize" className="atlas-nav-link"><WandSparkles size={16} />ปรับแต่งหน้า</a>
      <a href="/link" className="atlas-nav-link"><Link2 size={16} />ลิงก์ของฉัน</a>
      <a href="/account" className="atlas-nav-link"><CircleUserRound size={16} />บัญชี</a>
      <a href="/price" className="atlas-nav-link"><Sparkles size={16} />แพ็กเกจ</a>
    </nav>
    <a href="/sign-in" className="atlas-login">เข้าสู่ระบบ <ChevronRight size={15} /></a>
  </header>;
}

function ProfileMockup() {
  return <div className="atlas-browser">
    <div className="atlas-browser-bar"><i /><i /><i /><span>example.com / @mellow</span></div>
    <div className="atlas-profile">
      <div className="atlas-avatar">ม</div>
      <span className="atlas-username">@mellow</span>
      <h3>มิลค์ชอบถ่ายรูป</h3>
      <p>พื้นที่เล็ก ๆ ที่เล่าเรื่องของเรา</p>
      <div className="atlas-location"><MapPin size={11} />เชียงใหม่</div>
      <div className="atlas-socials" aria-label="ตัวอย่างลิงก์โซเชียล">
        <span aria-label="Instagram"><Instagram size={16} /></span>
        <span aria-label="Discord"><MessageCircle size={16} /></span>
        <span className="atlas-social-x" aria-label="X">𝕏</span>
      </div>
      <div className="atlas-media">
        <span className="atlas-views"><Eye size={11} />10</span>
        <div className="atlas-music">
          <span className="atlas-music-cover"><Music2 size={15} /></span>
          <span className="atlas-music-copy">
            <b>just listen...</b>
            <span className="atlas-timeline"><small>0:02</small><i><b /></i><small>5:46</small></span>
          </span>
          <span className="atlas-music-controls" aria-hidden="true"><SkipBack size={12} /><Pause size={14} /><SkipForward size={12} /></span>
        </div>
      </div>
      <div className="atlas-profile-footer">made with <b>gbloc</b></div>
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
    return <a href="/cookies" className="atlas-cookie-shortcut" aria-label="เปิดการตั้งค่าคุกกี้">
      <Cookie size={15} aria-hidden="true" /> คุกกี้
    </a>;
  }
  return <aside className="atlas-cookie-banner" aria-label="การใช้คุกกี้">
    <div className="atlas-cookie-copy">
      <Cookie size={18} aria-hidden="true" />
      <p>gbloc ใช้คุกกี้สำหรับการเข้าสู่ระบบ ความปลอดภัย และจดจำการตั้งค่าเมนูบนอุปกรณ์นี้ เพื่อให้เว็บทำงานตามที่เลือก</p>
    </div>
    <div className="atlas-cookie-actions">
      <button type="button" className="atlas-cookie-accept" onClick={saveChoice}>ยอมรับและเข้าใช้เว็บ</button>
    </div>
  </aside>;
}

export function IdentityAtlas() {
  return <div className="gbloc-home-atlas route-arrive">
    <PublicHeader />
    <main>
      <section className="atlas-hero">
        <div className="atlas-hero-copy">
          <span className="atlas-eyebrow"><i /> A MAP OF YOU</span>
          <h1>ตัวตนของเรา<br /><em>เชื่อมถึงกัน</em></h1>
          <p>โซเชียล รูป เสียง และสิ่งที่อยากแชร์—รวมเป็นหน้าเดียวที่บอกเล่าเรื่องของคุณ แล้วส่งต่อด้วยลิงก์เดียว</p>
          <div className="atlas-actions">
            <a href="/sign-up" className="atlas-button atlas-button-primary" data-testid="button-create-profile">
              <Sparkles size={17} />เริ่มทำหน้าเรา <ChevronRight size={17} />
            </a>
            <a href="#identity-map" className="atlas-button atlas-button-quiet" onClick={event => {
              event.preventDefault();
              document.getElementById('identity-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}><ArrowDown size={15} /> สำรวจแผนที่</a>
          </div>
          <div className="atlas-footnote"><span><Check size={13} /></span>ปรับรูป สี และลิงก์ได้เอง ไม่ต้องเขียนโค้ด</div>
        </div>

        <div className="atlas-visual" aria-label="ตัวอย่างโปรไฟล์ที่เชื่อมโยงเรื่องราวของคุณ">
          <div className="atlas-coordinate atlas-coordinate-a">18°47' N <span>CHIANG MAI</span></div>
          <div className="atlas-coordinate atlas-coordinate-b">PERSONAL / PUBLIC</div>
          <svg className="atlas-wires" viewBox="0 0 700 590" fill="none" aria-hidden="true">
            <path d="M350 292 C260 230 188 170 113 142" />
            <path d="M350 292 C447 225 526 170 601 153" />
            <path d="M350 292 C245 340 192 405 125 465" />
            <path d="M350 292 C461 340 520 405 590 456" />
            <path d="M350 292 C350 200 354 130 354 82" />
            <circle cx="113" cy="142" r="4" /><circle cx="601" cy="153" r="4" />
            <circle cx="125" cy="465" r="4" /><circle cx="590" cy="456" r="4" />
            <circle cx="354" cy="82" r="4" />
          </svg>
          <div className="atlas-orbit atlas-orbit-one" />
          <div className="atlas-orbit atlas-orbit-two" />
          <div className="atlas-node atlas-node-top"><span className="atlas-node-icon"><Palette size={16} /></span><b>YOUR LOOK</b><small>สี · ภาพ · ฉากหลัง</small></div>
          <div className="atlas-node atlas-node-left"><span className="atlas-node-icon"><Instagram size={16} /></span><b>YOUR PEOPLE</b><small>ช่องทางที่อยากแชร์</small></div>
          <div className="atlas-node atlas-node-right"><span className="atlas-node-icon"><MapPin size={16} /></span><b>YOUR PLACE</b><small>เชียงใหม่</small></div>
          <div className="atlas-node atlas-node-bottom-left"><span className="atlas-node-icon"><Link2 size={16} /></span><b>YOUR WORK</b><small>ลิงก์สำคัญของคุณ</small></div>
          <div className="atlas-node atlas-node-bottom-right"><span className="atlas-node-icon"><Music2 size={16} /></span><b>YOUR SOUND</b><small>เสียงที่ชอบ</small></div>
          <div className="atlas-profile-shell"><ProfileMockup /></div>
          <div className="atlas-visual-caption"><span>01</span> ทุกอย่างที่เลือกแชร์ อยู่ในวงโคจรเดียวกัน</div>
        </div>
      </section>

      <section className="atlas-thesis" id="identity-map">
        <div className="atlas-section-label"><span>01</span> ONE LINK, MANY SIDES</div>
        <div className="atlas-thesis-grid">
          <h2>ไม่ใช่แค่ลิงก์<br /><em>แต่คือพื้นที่ของเรา</em></h2>
          <div className="atlas-thesis-copy">
            <p>ให้คนที่เข้ามาเห็นโลกของคุณในแบบที่ตั้งใจ ทั้งโซเชียล งานเสียง หรือข้อความสั้น ๆ ที่อยากให้จำ</p>
            <a href="/customize" className="atlas-text-link">เริ่มจัดหน้าในแบบเรา <ChevronRight size={15} /></a>
          </div>
        </div>
        <div className="atlas-map-strip">
          <div className="atlas-map-line" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <span>PROFILE</span><span>LINKS</span><span>IMAGES</span><span>MUSIC</span><span>YOUR STORY</span>
        </div>
      </section>

      <section className="atlas-elements">
        <div className="atlas-elements-heading">
          <div className="atlas-section-label"><span>02</span> YOUR WORLD, YOUR RULES</div>
          <h2>เลือกสิ่งที่เป็นเรา<br /><em>แล้วเชื่อมมันเข้าด้วยกัน</em></h2>
          <p>เริ่มจากสิ่งที่อยากให้คนเห็น แล้วค่อยปรับรายละเอียดให้เป็นสไตล์ของคุณ</p>
        </div>
        <div className="atlas-element-list">
          <article className="atlas-element atlas-element-look">
            <div className="atlas-element-index">A / APPEARANCE</div>
            <div className="atlas-element-symbol"><Palette size={22} /></div>
            <div className="atlas-element-body"><h3>หน้าตาที่รู้สึกว่าใช่</h3><p>เลือกรูป สี และฉากหลังให้เข้ากับสไตล์ที่ชอบ</p></div>
            <div className="atlas-palette-sample"><i /><i /><i /><i /></div>
          </article>
          <article className="atlas-element atlas-element-links">
            <div className="atlas-element-index">B / CONNECTIONS</div>
            <div className="atlas-element-symbol"><Link2 size={22} /></div>
            <div className="atlas-element-body"><h3>ทุกช่องทางในที่เดียว</h3><p>จัดลำดับโซเชียลและลิงก์สำคัญได้ตามใจ</p></div>
            <div className="atlas-link-sample"><span /><span /><span /></div>
          </article>
          <article className="atlas-element atlas-element-music">
            <div className="atlas-element-index">C / SOUNDTRACK</div>
            <div className="atlas-element-symbol"><Music2 size={22} /></div>
            <div className="atlas-element-body"><h3>เสียงที่อยากให้ฟัง</h3><p>ใส่เสียงและเลือกได้ว่าจะโชว์เครื่องเล่นหรือไม่</p></div>
            <div className="atlas-wave" aria-hidden="true">{Array.from({ length: 17 }, (_, index) => <i key={index} />)}</div>
          </article>
        </div>
      </section>

      <section className="atlas-share">
        <div className="atlas-share-art" aria-hidden="true">
          <div className="atlas-share-ring atlas-share-ring-one" />
          <div className="atlas-share-ring atlas-share-ring-two" />
          <span className="atlas-share-token">@mellow</span>
          <span className="atlas-share-token atlas-share-token-two">example.com</span>
          <div className="atlas-share-core"><img src="/__mockup/images/brand-g.png" alt="" /></div>
          <div className="atlas-share-annotation">ONE URL / YOUR UNIVERSE</div>
        </div>
        <div className="atlas-share-copy">
          <div className="atlas-section-label"><span>03</span> THE CONNECTION</div>
          <h2>แชร์หน้าเดียว<br /><em>ให้คนรู้จักเราเพิ่มขึ้น</em></h2>
          <p>ส่งลิงก์ example.com/@ชื่อผู้ใช้ แล้วให้เพื่อนเลือกดูต่อในสิ่งที่คุณอยากแชร์</p>
          <a href="/sign-up" className="atlas-button atlas-button-primary">สร้างพื้นที่ของเรา <ChevronRight size={17} /></a>
        </div>
      </section>

      <section className="atlas-process">
        <div className="atlas-process-heading">
          <div className="atlas-section-label"><span>04</span> START WITH A NAME</div>
          <h2>แผนที่นี้เริ่มจาก<br /><em>ชื่อของคุณ</em></h2>
        </div>
        <div className="atlas-process-route">
          <article><span className="atlas-route-number">01</span><div><h3>เลือกชื่อผู้ใช้</h3><p>ได้ลิงก์ example.com/@ชื่อผู้ใช้ของตัวเอง</p></div></article>
          <article><span className="atlas-route-number">02</span><div><h3>ปรับหน้าโปรไฟล์</h3><p>ใส่รูป สี ฉากหลัง และข้อความ</p></div></article>
          <article><span className="atlas-route-number">03</span><div><h3>เพิ่มลิงก์แล้วแชร์</h3><p>รวมทุกช่องทางไว้ในลิงก์เดียว</p></div></article>
        </div>
      </section>

      <section className="atlas-closing">
        <div className="atlas-closing-orbit" aria-hidden="true"><span /><span /><span /></div>
        <div className="atlas-closing-content">
          <div className="atlas-section-label"><span>05</span> YOUR PLACE ON THE INTERNET</div>
          <h2>เรื่องราวของเรา<br /><em>เริ่มที่หน้าเดียว</em></h2>
          <p>เลือกสิ่งที่อยากแชร์ แล้วทำให้เป็นพื้นที่ของคุณเอง</p>
          <a href="/sign-up" className="atlas-button atlas-button-primary" data-testid="button-start-bottom">เริ่มทำหน้าเรา <ChevronRight size={17} /></a>
        </div>
      </section>
    </main>
    <footer className="atlas-footer">
      <Brand /><span>พื้นที่ของเรา บนอินเทอร์เน็ต</span>
      <a href="/legal#terms" data-testid="link-footer-terms">ข้อกำหนด</a>
      <a href="/legal#privacy" data-testid="link-footer-privacy">นโยบายความเป็นส่วนตัว</a>
      <a href="/price" data-testid="link-footer-price">แพ็กเกจ</a>
      <small>© {new Date().getFullYear()} GBLOC. All rights reserved.</small>
    </footer>
    <CookieConsent />
  </div>;
}

export default IdentityAtlas;
