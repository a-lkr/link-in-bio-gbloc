import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, CalendarDays, Check, Circle, CircleCheck, Copy, ExternalLink, Eye, Link2, Mail, RefreshCw, RotateCcw, Sparkles, Trash2, UserRound } from 'lucide-react';
import { Link } from 'wouter';
import {
  getGetAccountEmailQueryKey,
  getGetAccountDeletionStatusQueryKey,
  useGetMyMembership,
  useCreateBillingPortalSession,
  useCancelAccountDeletion,
  useGetAccountEmail,
  useGetAccountDeletionStatus,
  useGetAccountSummary,
  useGetMyProfile,
  useRequestAccountDeletion,
  useSyncAccountEmail,
} from '@workspace/api-client-react';
import { ErrorPanel, LoadingPanel, SignedInOnly, appBasePath, objectUrl } from '@/components/gbloc-shared';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import '@/styles/account.css';

const ACCOUNT_DELETION_CONFIRMATION_DELAY_MS = 5_000;

const customizeHref = (section: string) => `/customize?section=${section}`;

export default function AccountPage() {
  const summary = useGetAccountSummary();
  const profileQuery = useGetMyProfile();
  const deletionStatus = useGetAccountDeletionStatus();
  const accountEmail = useGetAccountEmail();
  const membership = useGetMyMembership();
  const billingPortal = useCreateBillingPortalSession();
  const requestDeletion = useRequestAccountDeletion();
  const cancelDeletion = useCancelAccountDeletion();
  const syncAccountEmail = useSyncAccountEmail();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteButtonReady, setDeleteButtonReady] = useState(false);
  const billingReturn = new URLSearchParams(window.location.search).get('billing');

  useEffect(() => {
    if (!confirmingDelete) return;
    const timer = window.setTimeout(
      () => setDeleteButtonReady(true),
      ACCOUNT_DELETION_CONFIRMATION_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [confirmingDelete]);

  if (summary.isLoading || profileQuery.isLoading || deletionStatus.isLoading) {
    return <SignedInOnly current="/account"><LoadingPanel message="กำลังดูภาพรวมบัญชี" /></SignedInOnly>;
  }
  if (summary.isError || !summary.data || profileQuery.isError || !profileQuery.data) {
    return <SignedInOnly current="/account"><ErrorPanel message="โหลดข้อมูลบัญชีไม่สำเร็จ" retry={() => { void summary.refetch(); void profileQuery.refetch(); }} /></SignedInOnly>;
  }

  const data = summary.data;
  const deletion = deletionStatus.data;
  const deletionPending = deletion?.status === 'pending' || deletion?.status === 'processing';
  const profile = profileQuery.data.profile;
  const links = profileQuery.data.links;
  const profileHref = `${appBasePath}${data.profileUrl}`;
  const checklist = [
    { title: 'Display Name', detail: 'ตั้งชื่อที่อยากให้คนจดจำ', done: !!profile.displayName.trim(), href: customizeHref('cz-identity') },
    { title: 'Description', detail: 'เล่าเรื่องของคุณสั้น ๆ', done: !!profile.bio.trim(), href: customizeHref('cz-identity') },
    { title: 'รูปโปรไฟล์', detail: 'เพิ่มรูปให้หน้าโปรไฟล์มีตัวตน', done: !!profile.avatarPath, href: customizeHref('cz-avatar') },
    { title: 'ฉากหลัง', detail: 'เลือกภาพหรือวิดีโอเป็นพื้นหลัง', done: !!profile.backgroundPath, href: customizeHref('cz-background') },
    { title: 'ลิงก์โซเชียล', detail: 'เพิ่มช่องทางให้คนไปต่อ', done: links.length > 0, href: '/link' },
  ];
  const completed = checklist.filter(item => item.done).length;

  async function copyProfile() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${profileHref}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function confirmAccountDeletion() {
    requestDeletion.mutate({ data: { confirmed: true } }, {
      onSuccess: () => {
        window.location.replace(appBasePath || '/');
      },
    });
  }

  function undoLegacyAccountDeletion() {
    cancelDeletion.mutate(undefined, {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetAccountDeletionStatusQueryKey() });
      },
    });
  }

  function saveAccountEmail() {
    syncAccountEmail.mutate(undefined, {
      onSuccess: data => queryClient.setQueryData(getGetAccountEmailQueryKey(), data),
    });
  }

  function openBillingPortal() {
    billingPortal.mutate(undefined, {
      onSuccess: data => window.location.assign(data.portalUrl),
    });
  }

  return <SignedInOnly current="/account">
    <main className="account-page route-arrive">
      <header className="account-head">
        <div>
          <span className="account-eyebrow">03 / ภาพรวมบัญชี</span>
          <h1>บัญชีของคุณ</h1>
          <p>ดูสถานะหน้าโปรไฟล์และเติมส่วนที่ยังขาด</p>
        </div>
        <Link href="/customize" className="account-button account-button-primary" data-testid="button-edit-profile">
          <Sparkles size={15} /> ปรับแต่งหน้า
        </Link>
      </header>

      {billingReturn === 'success' && <div className="account-payment-notice" role="status" data-testid="status-billing-success">
        {membership.data?.plan && membership.data.expiresAt
          ? `ชำระเงินแล้ว สิทธิ์ ${membership.data.plan.toUpperCase()} ใช้ได้ถึง ${new Date(membership.data.expiresAt).toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}`
          : 'ชำระเงินสำเร็จแล้ว กำลังยืนยันสิทธิ์สมาชิก'}
        {(!membership.data?.plan || !membership.data.expiresAt) && <button type="button" onClick={() => void membership.refetch()}>ตรวจสอบอีกครั้ง</button>}
      </div>}

      <section className="account-profile-card" aria-label="ข้อมูลหน้าโปรไฟล์">
        <div className="account-profile-main">
          <div className="account-avatar">
            {profile.avatarPath
              ? <img src={objectUrl(profile.avatarPath)} alt="" />
              : <span>{(profile.displayName || data.username).slice(0, 1).toUpperCase()}</span>}
          </div>
          <div className="account-profile-copy">
            <span className="account-label">หน้าโปรไฟล์สาธารณะ</span>
            <h2>{profile.displayName || `@${data.username}`}</h2>
            <p>@{data.username}</p>
          </div>
        </div>
        <div className="account-profile-actions">
          <a href={profileHref} target="_blank" rel="noreferrer" className="account-button" data-testid="button-open-profile">
            <ExternalLink size={14} /> ดูหน้าโปรไฟล์
          </a>
          <button type="button" className="account-button" onClick={copyProfile} data-testid="button-copy-profile">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
          </button>
        </div>
        <div className="account-profile-url"><span>{window.location.host}/@{data.username.toLowerCase()}</span></div>
      </section>

      <section className="account-details-card" aria-labelledby="account-details-title" data-testid="card-account-details">
        <header className="account-details-header">
          <span className="account-email-icon"><Mail size={16} /></span>
          <div>
            <h2 id="account-details-title">รายละเอียดบัญชี</h2>
            <p>อีเมล วันที่สมัคร สถานะสมาชิก และการจัดการบัญชี</p>
          </div>
        </header>

        <div className="account-details-row account-details-email-row">
          <div className="account-details-main">
            <span className="account-details-label">อีเมลบัญชี</span>
            <div className="account-email-value" aria-live="polite">
              {accountEmail.isLoading ? <span>กำลังตรวจสอบอีเมลที่บันทึกไว้…</span>
                : accountEmail.isError ? <span className="account-email-error">โหลดสถานะอีเมลไม่สำเร็จ</span>
                  : accountEmail.data?.email
                    ? <><strong>{accountEmail.data.email}</strong>{accountEmail.data.updatedAt && <small>ซิงก์ล่าสุด {new Date(accountEmail.data.updatedAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</small>}</>
                    : <span>ยังไม่มีอีเมลที่บันทึกไว้</span>}
            </div>
            <Link href="/legal#privacy" className="account-email-policy-link" data-testid="link-account-privacy">อ่านนโยบายความเป็นส่วนตัว</Link>
          </div>
          <div className="account-email-actions">
            {accountEmail.isError && <button type="button" className="account-button" onClick={() => void accountEmail.refetch()}>โหลดอีกครั้ง</button>}
            <button type="button" className="account-button" onClick={saveAccountEmail} disabled={syncAccountEmail.isPending} data-testid="button-sync-account-email">
              <RefreshCw size={13} />{syncAccountEmail.isPending ? 'กำลังบันทึก…' : 'ซิงก์อีเมล'}
            </button>
          </div>
        </div>
        {syncAccountEmail.isError && <p className="account-email-error" role="alert">บันทึกอีเมลไม่สำเร็จ กรุณาลองอีกครั้ง</p>}

        <div className="account-details-row account-details-registration-row">
          <span className="account-details-label"><CalendarDays size={14} />สมัครเมื่อ</span>
          <strong>{accountEmail.isLoading ? 'กำลังโหลดวันที่สมัคร…'
            : accountEmail.isError ? 'โหลดวันที่สมัครไม่สำเร็จ'
              : accountEmail.data?.accountCreatedAt
                ? new Date(accountEmail.data.accountCreatedAt).toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })
                : 'ไม่พบวันที่สมัคร'}</strong>
        </div>

        <section className="account-membership-card account-details-membership" aria-labelledby="account-membership-title" data-testid="card-membership-status">
          <div className="account-membership-icon"><Sparkles size={17} /></div>
          <div className="account-membership-copy">
            <span className="account-label">สมาชิก</span>
            <h3 id="account-membership-title">
              {membership.isLoading ? 'กำลังตรวจสอบสถานะ…'
                : membership.isError ? 'ตรวจสอบสมาชิกไม่สำเร็จ'
                  : membership.data?.plan ? membership.data.plan.toUpperCase()
                    : 'FREE'}
            </h3>
            <p>{membership.isLoading ? 'กำลังโหลดข้อมูลสมาชิก'
              : membership.isError ? 'ลองโหลดสถานะอีกครั้ง'
                : membership.data?.plan && membership.data.expiresAt
                  ? `สิทธิ์สมาชิกที่ได้รับมีถึง ${new Date(membership.data.expiresAt).toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}`
                  : 'ยังไม่มีสมาชิกแบบชำระเงินหรือของขวัญ'}</p>
          </div>
          {membership.isError
            ? <button type="button" className="account-button" onClick={() => void membership.refetch()}>ลองอีกครั้ง</button>
            : membership.data?.billingManaged
              ? <button type="button" className="account-button account-membership-link"
                  onClick={openBillingPortal} disabled={billingPortal.isPending}>
                  {billingPortal.isPending ? 'กำลังเปิด…' : 'จัดการการสมัคร'} <ArrowRight size={14} />
                </button>
            : <Link href="/price" className="account-button account-membership-link">ดูแพ็กเกจ <ArrowRight size={14} /></Link>}
        </section>
        {membership.data?.billingManaged && billingPortal.isError && <div className="account-deletion-notice error" role="alert">
          เปิดหน้าจัดการสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
        </div>}

        {deletionStatus.isError && <div className="account-deletion-notice error" role="alert">
          โหลดสถานะคำขอลบบัญชีเดิมไม่สำเร็จ กรุณาลองอีกครั้ง
          <button type="button" onClick={() => void deletionStatus.refetch()}>ลองอีกครั้ง</button>
        </div>}
        {deletionPending && <section className="account-deletion-panel is-pending" aria-labelledby="account-deletion-title">
          <div className="account-deletion-copy">
            <span className="account-deletion-icon"><Trash2 size={17} /></span>
            <div>
              <h3 id="account-deletion-title">คำขอลบเดิมกำลังดำเนินการ</h3>
              <p>
                คำขอนี้ส่งก่อนเปลี่ยนขั้นตอนการลบ บัญชีจะถูกลบตามกำหนดเดิม
                {deletion?.scheduledFor ? ` ในวันที่ ${new Date(deletion.scheduledFor).toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}` : ''}
                {deletion?.canCancel ? ' และยังยกเลิกคำขอเดิมได้' : ''}
              </p>
              {cancelDeletion.isError && <p className="account-deletion-error" role="alert">ยกเลิกคำขอไม่สำเร็จ กรุณาลองอีกครั้ง</p>}
            </div>
          </div>
          {deletion?.canCancel && <button
            type="button"
            className="account-button account-deletion-cancel"
            onClick={undoLegacyAccountDeletion}
            disabled={cancelDeletion.isPending}
            data-testid="button-cancel-legacy-account-deletion"
          >
            <RotateCcw size={14} /> {cancelDeletion.isPending ? 'กำลังยกเลิก…' : 'ยกเลิกคำขอเดิม'}
          </button>}
        </section>}

        {deletion?.status === 'none' && <section className="account-deletion-panel" aria-labelledby="account-deletion-title">
          <div className="account-deletion-copy">
            <span className="account-deletion-icon"><Trash2 size={17} /></span>
            <div>
              <h3 id="account-deletion-title">ลบบัญชี</h3>
              <p>ยืนยันแล้วจะเริ่มลบบัญชี โปรไฟล์ ลิงก์ และไฟล์ที่เกี่ยวข้องทันที การลบถาวรนี้กู้คืนไม่ได้</p>
            </div>
          </div>
          <button
            type="button"
            className="account-button account-deletion-start"
            onClick={() => {
              setDeleteButtonReady(false);
              setConfirmingDelete(true);
            }}
            data-testid="button-start-account-deletion"
          >
            <Trash2 size={14} /> ลบบัญชี
          </button>
        </section>}

        <AlertDialog
          open={confirmingDelete && deletion?.status === 'none'}
          onOpenChange={open => {
            if (!requestDeletion.isPending) {
              setConfirmingDelete(open);
              if (!open) setDeleteButtonReady(false);
            }
          }}
        >
          <AlertDialogContent className="account-delete-dialog">
            <div className="account-delete-dialog-icon"><AlertTriangle size={19} /></div>
            <AlertDialogHeader className="account-delete-dialog-header">
              <AlertDialogTitle>ยืนยันลบบัญชีถาวรใช่ไหม?</AlertDialogTitle>
              <AlertDialogDescription>
                เมื่อยืนยัน ระบบจะลบบัญชีและข้อมูลที่เกี่ยวข้องทันที คุณจะเข้าสู่ระบบบัญชีนี้อีกไม่ได้
              </AlertDialogDescription>
            </AlertDialogHeader>
            <p className="account-delete-dialog-note">
              โปรไฟล์ ลิงก์ และไฟล์ที่อัปโหลดจะถูกลบและกู้คืนไม่ได้ การสมัครแบบต่ออายุที่ยังทำงานอยู่จะถูกยกเลิกก่อนลบ แต่จะไม่มีการคืนเงินอัตโนมัติ ข้อมูลที่กฎหมายกำหนดหรือผู้ให้บริการภายนอกเก็บไว้อาจยังคงอยู่ตามความจำเป็นและนโยบายของผู้ให้บริการ
            </p>
            {!deleteButtonReady && <p className="account-delete-countdown" role="status">
              ปุ่มลบถาวรจะแสดงหลังจากรอ 5 วินาที
            </p>}
            {requestDeletion.isError && <p className="account-deletion-error" role="alert">
              ลบบัญชีไม่สำเร็จ กรุณาลองอีกครั้ง
            </p>}
            <AlertDialogFooter className="account-delete-dialog-actions">
              <AlertDialogCancel
                disabled={requestDeletion.isPending}
                className="account-delete-cancel"
              >
                ยกเลิก
              </AlertDialogCancel>
              {deleteButtonReady && <AlertDialogAction
                disabled={requestDeletion.isPending}
                className="account-delete-final"
                onClick={event => {
                  event.preventDefault();
                  confirmAccountDeletion();
                }}
              >
                {requestDeletion.isPending ? 'กำลังลบบัญชี…' : 'ลบบัญชีถาวร'}
              </AlertDialogAction>}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      <section className="account-stats" aria-label="สถิติหน้าโปรไฟล์">
        <article className="account-stat-card account-stat-completion">
          <div className="account-stat-icon"><Sparkles size={16} /></div>
          <span className="account-stat-label">ความสมบูรณ์</span>
          <strong>{data.profileCompletePercent}<small>%</small></strong>
          <div className="account-progress" role="progressbar" aria-label="ความสมบูรณ์ของโปรไฟล์" aria-valuemin={0} aria-valuemax={100} aria-valuenow={data.profileCompletePercent}>
            <i style={{ width: `${data.profileCompletePercent}%` }} />
          </div>
          <small className="account-stat-foot">{completed} จาก {checklist.length} รายการ</small>
        </article>
        <article className="account-stat-card">
          <div className="account-stat-icon"><Link2 size={16} /></div>
          <span className="account-stat-label">ลิงก์ที่เพิ่มไว้</span>
          <strong>{data.linkCount}<small> ลิงก์</small></strong>
          <Link href="/link" className="account-stat-link" data-testid="link-account-links">จัดการลิงก์ <ArrowRight size={13} /></Link>
        </article>
        <article className="account-stat-card">
          <div className="account-stat-icon"><Eye size={16} /></div>
          <span className="account-stat-label">ยอดเข้าชมทั้งหมด</span>
          <strong>{data.viewCount.toLocaleString('th-TH')}<small> ครั้ง</small></strong>
          <span className="account-stat-foot">ขอบคุณที่แวะมารู้จักกัน</span>
        </article>
      </section>

      <div className="account-lower-grid">
        <section className="account-card account-checklist" aria-labelledby="account-checklist-title">
          <header className="account-card-head">
            <div><span className="account-card-index">01</span><div><h2 id="account-checklist-title">เช็กลิสต์โปรไฟล์</h2><p>กดรายการเพื่อไปเติมหรือแก้ไขส่วนนั้น</p></div></div>
            <span className="account-check-count">{completed}/{checklist.length}</span>
          </header>
          <div className="account-check-items">
            {checklist.map(item => <div className={`account-check-item${item.done ? ' is-done' : ''}`} key={item.title}>
              <span className="account-check-status" aria-label={item.done ? 'เสร็จแล้ว' : 'ยังไม่เสร็จ'}>
                {item.done ? <CircleCheck size={18} /> : <Circle size={18} />}
              </span>
              <div className="account-check-copy"><strong>{item.title}</strong><small>{item.detail}</small></div>
              <Link href={item.href} className="account-check-action" aria-label={`${item.done ? 'แก้ไข' : 'เพิ่ม'} ${item.title}`}>
                {item.done ? 'แก้ไข' : 'เพิ่ม'} <ArrowRight size={13} />
              </Link>
            </div>)}
          </div>
        </section>

        <aside className="account-card account-updated-card">
          <div className="account-card-head">
            <div><span className="account-card-index">02</span><div><h2>อัปเดตล่าสุด</h2><p>เวลาที่ข้อมูลโปรไฟล์เปลี่ยนล่าสุด</p></div></div>
          </div>
          <div className="account-updated-value">
            <UserRound size={17} />
            <span>{new Date(data.updatedAt).toLocaleDateString('th-TH', { dateStyle: 'long' })}</span>
          </div>
          <p className="account-updated-note">การแก้ไขจะมีผลเมื่อกดบันทึกในหน้าปรับแต่ง</p>
          <Link href="/customize" className="account-button account-updated-action">ไปหน้าปรับแต่ง <ArrowRight size={14} /></Link>
        </aside>
      </div>
    </main>
  </SignedInOnly>;
}
