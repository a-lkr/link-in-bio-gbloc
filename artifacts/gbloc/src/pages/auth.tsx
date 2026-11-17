import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Brand } from "@/components/gbloc-shared";

function AuthFrame({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
}) {
  return <div className="auth-page route-arrive">
    <div className="auth-copy">
      <Brand />
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div className="auth-glyph">g<span>.</span></div>
    </div>
    <div className="auth-form">
      <Link href="/" className="auth-back" data-testid="link-auth-home"><ArrowLeft size={15} />กลับหน้าแรก</Link>
      {children}
    </div>
  </div>;
}

function GoogleSignInButton() {
  return <a className="auth-google-button" href="/api/auth/google/start" data-testid="button-google-sign-in">
    <span className="auth-google-g" aria-hidden="true">G</span>
    สมัคร / เข้าสู่ระบบด้วย Google
  </a>;
}

function googleErrorMessage(): string {
  const error = new URLSearchParams(window.location.search).get("authError");
  if (error === "google-not-configured") return "Google ยังตั้งค่าไม่เสร็จ ลองใหม่ภายหลัง";
  if (error === "google-sign-in-expired") return "ลิงก์เข้าสู่ระบบหมดอายุ กรุณาเริ่มใหม่";
  if (error) return "เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองอีกครั้ง";
  return "";
}

function GoogleOnlyCard({ signUp = false }: { signUp?: boolean }) {
  const error = googleErrorMessage();
  return <section className="recovery-card" aria-labelledby={signUp ? "sign-up-title" : "sign-in-title"}>
    <span className="eyebrow">GBLOC ACCOUNT</span>
    <h1 id={signUp ? "sign-up-title" : "sign-in-title"}>{signUp ? "สร้างบัญชี" : "เข้าสู่ระบบ"}</h1>
    <p className="recovery-description">
      {signUp
        ? "สมัครและยืนยันบัญชี GBLOC ด้วยบัญชี Google ของคุณ"
        : "ใช้บัญชี Google เพื่อเข้าสู่ระบบและจัดการหน้าโปรไฟล์"}
    </p>
    <GoogleSignInButton />
    {error && <p className="recovery-message is-error" role="alert" aria-live="polite">{error}</p>}
    <p className="auth-terms-note">ดำเนินการต่อแสดงว่าคุณยอมรับ <Link href="/legal#terms">ข้อกำหนดและเงื่อนไข</Link></p>
    <p className="auth-switch-note">
      {signUp ? "มีบัญชีแล้ว? " : "ยังไม่มีบัญชี? "}
      <Link href={signUp ? "/sign-in" : "/sign-up"}>{signUp ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</Link>
    </p>
  </section>;
}

export function SignInPage() {
  return <AuthFrame eyebrow="YOUR SPACE, YOUR STORY" title={<>กลับมาเล่า<br /><em>เรื่องของคุณต่อ</em></>} subtitle="กลับมาแก้หน้าโปรไฟล์ แล้วแชร์ต่อได้เลย">
    <GoogleOnlyCard />
  </AuthFrame>;
}

export function SignUpPage() {
  return <AuthFrame eyebrow="MAKE IT YOURS" title={<>เริ่มจากหน้าเล็ก ๆ<br /><em>ที่เป็นเรา</em></>} subtitle="สร้างโปรไฟล์ของตัวเอง แล้วรวมทุกลิงก์ไว้ที่เดียว">
    <GoogleOnlyCard signUp />
  </AuthFrame>;
}
