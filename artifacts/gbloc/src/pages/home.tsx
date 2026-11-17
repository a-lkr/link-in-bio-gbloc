import { useUser } from '@/components/auth-context';
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  ChevronRight,
  Eye,
  Image,
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
} from 'lucide-react';
import { Link } from 'wouter';
import { brandMarkLogoUrl, Brand, CopyrightNotice, PublicHeader } from '@/components/gbloc-shared';
import '@/styles/home-creator-studio.css';

function ProfileMockup() {
  return <div className="mock-browser">
    <div className="mock-bar"><i /><i /><i /><span>example.com / @mellow</span><Eye size={12} /></div>
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

export default function HomePage() {
  const { isSignedIn } = useUser();
  const createHref = isSignedIn ? '/customize' : '/sign-up';

  return <div className="marketing-page route-arrive creator-studio">
    <PublicHeader current="/" />
    <main>
      <section className="studio-hero">
        <div className="hero-copy">
          <span className="eyebrow"><i /> YOUR PERSONAL PAGE, IN PROGRESS</span>
          <h1>เรื่องของเรา<br /><em>กำลังเป็นรูปเป็นร่าง</em></h1>
          <p>สร้างหน้า gbloc ที่รวมโซเชียล รูป เสียง และสิ่งที่อยากแชร์ไว้ด้วยกัน ปรับให้เป็นสไตล์เรา แล้วส่งลิงก์เดียวให้เพื่อน</p>
          <div className="hero-actions">
            <Link href={createHref} className="button button-primary" data-testid="button-create-profile">
              <Sparkles size={17} />เริ่มทำหน้าเรา <ChevronRight size={17} />
            </Link>
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

        <div className="studio-desk" aria-label="ตัวอย่างพื้นที่สร้างโปรไฟล์">
          <div className="desk-topline">
            <span className="desk-project"><span className="desk-status-dot" />PROFILE / @MELLOW</span>
            <span className="desk-save"><Check size={12} /> บันทึกแล้ว</span>
          </div>
          <div className="desk-workspace">
            <aside className="desk-rail" aria-label="ส่วนต่าง ๆ ของโปรไฟล์">
              <span className="rail-active"><Palette size={15} /><b>01</b></span>
              <span><Link2 size={15} /><b>02</b></span>
              <span><Music2 size={15} /><b>03</b></span>
              <i />
              <span className="rail-check"><Check size={14} /></span>
            </aside>
            <div className="desk-editor">
              <div className="editor-heading">
                <span className="editor-overline">LIVE PREVIEW</span>
                <span className="editor-window"><i /><i /><i /></span>
              </div>
              <ProfileMockup />
            </div>
            <div className="desk-note">
              <span className="note-index">01 / LOOK</span>
              <b>เริ่มจากสิ่งที่เป็นเรา</b>
              <span>รูป · สี · ฉากหลัง</span>
              <Link href="/customize" aria-label="ปรับแต่งหน้าโปรไฟล์">ปรับแต่ง <ArrowUpRight size={13} /></Link>
            </div>
          </div>
          <div className="desk-bottomline">
            <span><span className="tiny-avatar">ม</span> มิลค์ชอบถ่ายรูป</span>
            <span>example.com/@mellow <ArrowUpRight size={12} /></span>
          </div>
          <span className="desk-side-label">YOUR PAGE / YOUR VIBE</span>
        </div>
        <div className="hero-index"><span>01</span><i /> MAKE IT PERSONAL</div>
      </section>

      <section className="studio-intro section-wrap">
        <div className="section-kicker">A PAGE THAT FEELS LIKE YOU</div>
        <div className="intro-layout">
          <h2>ไม่ใช่แค่รวมลิงก์<br /><em>แต่เป็นพื้นที่ของเรา</em></h2>
          <div className="intro-aside">
            <span className="intro-rule" />
            <p>คนที่กดเข้ามาจะเห็นสิ่งที่เราอยากแชร์ ทั้งโซเชียล งานเสียง หรือข้อความสั้น ๆ ที่อยากให้จำ — อยู่ในหน้าเดียว</p>
            <Link href="/link" className="text-link">จัดการลิงก์ของฉัน <ArrowUpRight size={15} /></Link>
          </div>
        </div>
        <div className="identity-ribbon" aria-label="สิ่งที่รวมไว้ในหน้า gbloc">
          <span><i>01</i> ตัวตน</span><b>+</b><span><i>02</i> ช่องทาง</span><b>+</b><span><i>03</i> สิ่งที่ชอบ</span><b>=</b><strong>หน้าเดียวของเรา</strong>
        </div>
      </section>

      <section className="studio-build">
        <div className="build-inner">
          <div className="build-heading">
            <span className="section-kicker">YOUR CREATIVE WORKSPACE</span>
            <h2>ประกอบหน้า<br /><em>ในแบบที่ใช่</em></h2>
            <p>เลือกสี ใส่ภาพ แล้วจัดลำดับเรื่องที่อยากให้คนเห็นก่อน</p>
            <Link href="/customize" className="build-link">ลองปรับแต่งหน้า <ArrowUpRight size={15} /></Link>
          </div>
          <div className="build-board">
            <article className="build-item build-look">
              <div className="build-item-head"><span>01 / LOOK & FEEL</span><Palette size={17} /></div>
              <div className="swatch-row" aria-hidden="true"><i /><i /><i /><i /><span>+</span></div>
              <h3>แต่งหน้าให้เป็นเรา</h3>
              <p>เลือกรูป สี และฉากหลังให้เข้ากับสไตล์ที่ชอบ</p>
            </article>
            <article className="build-item build-links">
              <div className="build-item-head"><span>02 / YOUR LINKS</span><Link2 size={17} /></div>
              <div className="link-stack" aria-hidden="true"><span><Instagram size={13} /> instagram <i /></span><span><MessageCircle size={13} /> discord <i /></span></div>
              <h3>รวมช่องทางไว้ที่เดียว</h3>
              <p>จัดลำดับโซเชียลและลิงก์สำคัญได้ตามใจ</p>
            </article>
            <article className="build-item build-music">
              <div className="build-item-head"><span>03 / ON REPEAT</span><Music2 size={17} /></div>
              <div className="mini-player"><span><Music2 size={15} /></span><i /><b>just listen...</b><Pause size={13} /></div>
              <h3>เพิ่มเสียงที่ชอบ</h3>
              <p>ใส่เสียงและเลือกได้ว่าจะโชว์เครื่องเล่นหรือไม่</p>
            </article>
            <article className="build-item build-background">
              <div className="build-item-head"><span>04 / YOUR BACKGROUND</span><Image size={17} /></div>
              <div className="background-preview" aria-hidden="true"><span /><i /></div>
              <h3>เปลี่ยนบรรยากาศหน้าโปรไฟล์</h3>
              <p>เลือกรูปหรือวิดีโอให้หน้าโปรไฟล์เป็นสไตล์ของคุณ</p>
            </article>
            <div className="board-caption"><span>MAKE SPACE FOR YOURSELF</span><span>01 — 04</span></div>
          </div>
        </div>
      </section>

      <section className="studio-steps section-wrap" id="how-it-works">
        <div className="steps-head">
          <span className="section-kicker">FROM BLANK TO YOURS</span>
          <h2>เริ่มได้ใน <em>3 จังหวะ</em></h2>
          <p>ไม่ต้องเขียนโค้ด แค่เลือกสิ่งที่อยากแชร์แล้วจัดหน้าในแบบของคุณ</p>
        </div>
        <div className="steps-track">
          <article className="studio-step">
            <span className="step-index">01</span><span className="step-symbol">@</span>
            <div><h3>เลือกชื่อผู้ใช้</h3><p>ได้ลิงก์ example.com/@ชื่อผู้ใช้ของตัวเอง</p></div>
          </article>
          <article className="studio-step">
            <span className="step-index">02</span><span className="step-symbol"><Palette size={18} /></span>
            <div><h3>ปรับหน้าโปรไฟล์</h3><p>ใส่รูป สี ฉากหลัง และข้อความ</p></div>
          </article>
          <article className="studio-step">
            <span className="step-index">03</span><span className="step-symbol"><Link2 size={18} /></span>
            <div><h3>เพิ่มลิงก์แล้วแชร์</h3><p>รวมทุกช่องทางไว้ในลิงก์เดียว</p></div>
          </article>
        </div>
        <div className="steps-foot"><span>NO CODE NEEDED</span><span>YOUR PAGE, YOUR PACE <i /></span></div>
      </section>

      <section className="studio-cta">
        <div className="cta-mark"><img src={brandMarkLogoUrl} alt="gbloc" /></div>
        <div className="cta-copy">
          <span className="section-kicker">THE FIRST PIECE IS YOURS</span>
          <h2>เริ่มจากหน้าเล็ก ๆ<br /><em>ที่เป็นเรา</em></h2>
          <p>พื้นที่ของเรา บนอินเทอร์เน็ต</p>
          <Link href={createHref} className="button button-primary" data-testid="button-start-bottom">เริ่มทำหน้าเรา <ChevronRight size={17} /></Link>
        </div>
      </section>
    </main>
    <footer className="site-footer">
      <Brand /><span>พื้นที่ของเรา บนอินเทอร์เน็ต</span>
      <Link href="/legal#terms" data-testid="link-footer-terms">ข้อกำหนด</Link>
      <Link href="/legal#privacy" data-testid="link-footer-privacy">นโยบายความเป็นส่วนตัว</Link>
      <Link href="/price" data-testid="link-footer-price">แพ็กเกจ</Link>
      <CopyrightNotice />
    </footer>
  </div>;
}
