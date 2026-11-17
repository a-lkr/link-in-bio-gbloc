import { useEffect } from "react";
import { useGetPrivacyPolicy, useGetPublishedTerms } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Brand, CopyrightNotice, PublicHeader } from "@/components/gbloc-shared";
import { LegalDocumentContent, formatLegalDate } from "@/components/legal-document-content";
import "@/styles/terms.css";

function errorStatus(error: unknown) {
  return (error as { status?: number })?.status;
}

export default function LegalPage({ termsUnpublishedOnServer = false }: { termsUnpublishedOnServer?: boolean }) {
  const terms = useGetPublishedTerms({ query: { retry: false } });
  const privacy = useGetPrivacyPolicy({ query: { retry: false } });
  const termsUnpublished = terms.isError && errorStatus(terms.error) === 404;

  useEffect(() => {
    const scrollToHash = () => {
      const id = window.location.hash.slice(1);
      if (!id) return;
      window.requestAnimationFrame(() => {
        document.getElementById(decodeURIComponent(id))?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    };
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, [terms.isLoading, privacy.isLoading]);

  return <div className="marketing-page terms-page route-arrive">
    <PublicHeader current="/legal" />
    <main className="terms-main legal-main">
      <header className="terms-heading">
        <span className="eyebrow"><i /> GBLOC / LEGAL</span>
        <h1>ข้อกำหนดและ<br /><em>นโยบายของเรา</em></h1>
        <p>อ่านเงื่อนไขการใช้บริการและวิธีที่ GBLOC จัดการข้อมูลของคุณได้ในหน้าเดียว</p>
      </header>

      <nav className="legal-jump-links" aria-label="หัวข้อเอกสาร">
        <a href="#terms">01 / ข้อกำหนดและเงื่อนไข</a>
        <a href="#privacy">02 / นโยบายความเป็นส่วนตัว</a>
      </nav>

      <section id="terms" className="terms-card legal-document-section" aria-labelledby="legal-terms-title">
        <header className="legal-section-heading">
          <span>01</span>
          <h2 id="legal-terms-title">ข้อกำหนดและเงื่อนไขการใช้งาน</h2>
        </header>
        {termsUnpublishedOnServer ? <div className="terms-state">
          <h3>ยังไม่มีข้อกำหนดที่เผยแพร่</h3>
          <p>ข้อกำหนดยังอยู่ระหว่างเตรียมเผยแพร่ โปรดกลับมาตรวจสอบอีกครั้งภายหลัง</p>
        </div> : terms.isLoading ? <div className="terms-state" role="status">กำลังโหลดข้อกำหนด…</div>
          : terms.isError ? termsUnpublished
            ? <div className="terms-state">
              <h3>ยังไม่มีข้อกำหนดที่เผยแพร่</h3>
              <p>ข้อกำหนดยังอยู่ระหว่างเตรียมเผยแพร่ โปรดกลับมาตรวจสอบอีกครั้งภายหลัง</p>
            </div>
            : <div className="terms-state" role="alert">
              <h3>โหลดข้อกำหนดไม่สำเร็จ</h3>
              <p>ลองโหลดหน้าอีกครั้ง</p>
              <button type="button" onClick={() => void terms.refetch()} className="terms-retry">ลองอีกครั้ง</button>
            </div>
            : terms.data && <>
              <div className="terms-effective">
                <strong>วันที่และเวลามีผลบังคับใช้</strong>
                <time dateTime={terms.data.effectiveAt}>{formatLegalDate(terms.data.effectiveAt)}</time>
                <p>การเปลี่ยนแปลงจะแสดงบนหน้านี้ โดยไม่จำเป็นต้องแจ้งให้ทราบเป็นรายบุคคล โปรดตรวจสอบหน้านี้เป็นระยะ</p>
              </div>
              <LegalDocumentContent content={terms.data.content} />
            </>}
      </section>

      <section id="privacy" className="terms-card legal-document-section" aria-labelledby="legal-privacy-title">
        <header className="legal-section-heading">
          <span>02</span>
          <h2 id="legal-privacy-title">นโยบายความเป็นส่วนตัว</h2>
        </header>
        {privacy.isLoading ? <div className="terms-state" role="status">กำลังโหลดนโยบายความเป็นส่วนตัว…</div>
          : privacy.isError ? <div className="terms-state" role="alert">
            <h3>โหลดนโยบายไม่สำเร็จ</h3>
            <p>ลองโหลดหน้าอีกครั้ง</p>
            <button type="button" onClick={() => void privacy.refetch()} className="terms-retry">ลองอีกครั้ง</button>
          </div>
            : privacy.data && <LegalDocumentContent content={privacy.data.content} />}
      </section>
    </main>
    <footer className="site-footer">
      <Brand />
      <span>พื้นที่ของคุณบนอินเทอร์เน็ต</span>
      <Link href="/" data-testid="link-legal-home">กลับหน้าแรก</Link>
      <Link href="/price" data-testid="link-legal-price">แพ็กเกจ</Link>
      <CopyrightNotice />
    </footer>
  </div>;
}
