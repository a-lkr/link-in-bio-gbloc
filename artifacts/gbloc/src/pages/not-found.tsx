import { ArrowLeft, CircleAlert } from 'lucide-react';
import { Link } from 'wouter';
import { Brand } from '@/components/gbloc-shared';

export default function NotFound() {
  return <main className="not-found-page route-arrive">
    <div className="not-found-orbit" aria-hidden="true">404</div>
    <section className="not-found-card" aria-labelledby="not-found-title">
      <Brand />
      <span className="not-found-kicker"><CircleAlert size={14} /> GBLOC / PAGE NOT FOUND</span>
      <h1 id="not-found-title">หน้านี้ไม่มีอยู่</h1>
      <p>ลิงก์นี้อาจไม่ถูกต้อง หรือหน้านี้อาจถูกย้ายไปแล้ว</p>
      <Link href="/" className="not-found-home"><ArrowLeft size={15} /> กลับหน้าแรก</Link>
    </section>
  </main>;
}
