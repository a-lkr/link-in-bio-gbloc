import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/components/auth-context';
import { AlertTriangle, Check, Eye, EyeOff, RotateCcw } from 'lucide-react';
import {
  getGetModeratorAccessQueryKey,
  getGetModerationReportsQueryKey,
  useGetModeratorAccess,
  useGetModerationReports,
  useUpdateModerationReport,
} from '@workspace/api-client-react';
import type { GetModerationReportsParams, ModerationReport, ModerationReportUpdateInput } from '@workspace/api-client-react';
import { SignedInOnly } from '@/components/gbloc-shared';
import '@/styles/moderation.css';

const filterOptions: { value: GetModerationReportsParams['status']; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' }, { value: 'new', label: 'ใหม่' }, { value: 'reviewing', label: 'กำลังตรวจ' },
  { value: 'actioned', label: 'จัดการแล้ว' }, { value: 'dismissed', label: 'ปิดรายงาน' },
];
const reasons: Record<ModerationReport['reason'], string> = {
  spam: 'สแปม', scam: 'หลอกลวง', impersonation: 'แอบอ้างตัวตน', harassment: 'คุกคาม',
  sexual_content: 'เนื้อหาทางเพศ', other: 'อื่น ๆ',
};
const statuses: Record<ModerationReport['status'], string> = {
  new: 'รายงานใหม่', reviewing: 'กำลังตรวจสอบ', dismissed: 'ปิดรายงาน', actioned: 'ดำเนินการแล้ว',
};
function errorCopy(error: unknown) {
  const value = error as { message?: string; response?: { data?: { error?: string; message?: string } } };
  return value?.response?.data?.error || value?.response?.data?.message || value?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
}

function ReportCard({ report, busy, onSave }: {
  report: ModerationReport;
  busy: boolean;
  onSave: (report: ModerationReport, data: ModerationReportUpdateInput) => void;
}) {
  const [note, setNote] = useState(report.moderationNote ?? '');
  const patch = (status: ModerationReportUpdateInput['status'], profileAction: ModerationReportUpdateInput['profileAction']) => {
    onSave(report, { status, profileAction, moderationNote: note.trim() || null });
  };
  const dateLabel = new Date(report.createdAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  return <article className="moderation-report" data-testid={`card-report-${report.id}`}>
    <header className="moderation-report-head">
      <div className="moderation-target">
        <span className="moderation-target-mark">{(report.targetDisplayName || report.targetUsername).slice(0, 1).toUpperCase()}</span>
        <div className="moderation-target-copy">
          <strong data-testid={`text-report-name-${report.id}`}>{report.targetDisplayName || `@${report.targetUsername}`}</strong>
          <span>@{report.targetUsername} · {dateLabel}</span>
        </div>
      </div>
      <span className="moderation-status" data-status={report.status} data-testid={`status-report-${report.id}`}>{statuses[report.status]}</span>
    </header>
    <div className="moderation-report-body">
      <div className="moderation-meta">
        <span className="moderation-reason" data-testid={`text-report-reason-${report.id}`}>{reasons[report.reason]}</span>
        {!report.profileExists && <span data-testid={`status-profile-missing-${report.id}`}>ไม่พบโปรไฟล์</span>}
        {report.isSuspended && <span data-testid={`status-profile-hidden-${report.id}`}>ซ่อนโปรไฟล์อยู่</span>}
      </div>
      {report.details && <p data-testid={`text-report-details-${report.id}`}>{report.details}</p>}
      <textarea className="moderation-note" aria-label={`บันทึกผู้ดูแลของ @${report.targetUsername}`} placeholder="บันทึกสำหรับทีม (ไม่บังคับ)" value={note} onChange={event => setNote(event.target.value)} maxLength={1000} data-testid={`input-moderation-note-${report.id}`} />
    </div>
    <div className="moderation-actions">
      {report.status === 'new' && <button className="moderation-action primary" onClick={() => patch('reviewing', 'keep')} disabled={busy} data-testid={`button-review-${report.id}`}><Eye size={14} />เริ่มตรวจ</button>}
      {report.profileExists && !report.isSuspended && <button className="moderation-action" onClick={() => patch('actioned', 'hide')} disabled={busy} data-testid={`button-hide-${report.id}`}><EyeOff size={14} />ซ่อนโปรไฟล์</button>}
      {report.isSuspended && <button className="moderation-action" onClick={() => patch('actioned', 'restore')} disabled={busy} data-testid={`button-restore-${report.id}`}><RotateCcw size={14} />คืนการมองเห็น</button>}
      <button className="moderation-action" onClick={() => patch('dismissed', 'keep')} disabled={busy} data-testid={`button-dismiss-${report.id}`}><Check size={14} />ปิดรายงาน</button>
    </div>
  </article>;
}

function ModerationReportsContent() {
  const { isSignedIn } = useUser();
  const [status, setStatus] = useState<GetModerationReportsParams['status']>('all');
  const [actionError, setActionError] = useState('');
  const params: GetModerationReportsParams = { status };
  const access = useGetModeratorAccess({ query: { queryKey: getGetModeratorAccessQueryKey(), enabled: !!isSignedIn } });
  const reports = useGetModerationReports(params, { query: { queryKey: getGetModerationReportsQueryKey(params), enabled: access.data?.isModerator === true } });
  const mutation = useUpdateModerationReport();
  const client = useQueryClient();

  const save = (report: ModerationReport, data: ModerationReportUpdateInput) => {
    setActionError('');
    mutation.mutate({ reportId: report.id, data }, {
      onSuccess: () => { void client.invalidateQueries({ queryKey: getGetModerationReportsQueryKey() }); },
      onError: error => setActionError(errorCopy(error)),
    });
  };
  if (access.isLoading) return <SignedInOnly current="/moderation/reports"><main className="moderation-page"><div className="moderation-loading" aria-label="กำลังตรวจสอบสิทธิ์"><div className="moderation-skeleton" /></div></main></SignedInOnly>;
  if (access.isError) return <SignedInOnly current="/moderation/reports"><main className="moderation-page"><div className="moderation-error" role="alert" data-testid="status-moderator-error">ตรวจสอบสิทธิ์ไม่สำเร็จ กรุณาโหลดหน้านี้ใหม่</div></main></SignedInOnly>;
  if (!access.data?.isModerator) return <SignedInOnly current="/moderation/reports"><main className="moderation-page"><div className="moderation-empty" data-testid="status-moderator-denied"><AlertTriangle size={20} /><strong>หน้านี้สำหรับผู้ดูแล</strong>บัญชีนี้ไม่มีสิทธิ์เข้าถึงคิวรายงาน</div></main></SignedInOnly>;

  return <SignedInOnly current="/moderation/reports">
    <main className="moderation-page">
      <header className="moderation-heading">
        <div><span className="account-eyebrow">GBLOC / TRUST & SAFETY</span><h1>รายงานโปรไฟล์</h1><p>ตรวจสอบรายงานและจัดการการมองเห็นอย่างรอบคอบ</p></div>
        <span className="moderation-total" data-testid="status-report-count">{reports.data?.total ?? 0} รายการ</span>
      </header>
      <section className="moderation-toolbar" aria-label="ตัวกรองรายงาน">
        <p>คิวรายงานจากผู้ใช้ gbloc</p>
        <div className="moderation-filters">{filterOptions.map(option => <button key={option.value} className={`moderation-filter${status === option.value ? ' active' : ''}`} onClick={() => setStatus(option.value)} aria-pressed={status === option.value} data-testid={`filter-reports-${option.value}`}>{option.label}</button>)}</div>
      </section>
      {actionError && <div className="moderation-error" role="alert" data-testid="status-moderation-action-error">{actionError}</div>}
      {reports.isLoading ? <div className="moderation-loading" role="status" data-testid="status-reports-loading"><div className="moderation-skeleton" /><div className="moderation-skeleton" /></div>
        : reports.isError ? <div className="moderation-error" role="alert" data-testid="status-reports-error"><p>โหลดรายงานไม่สำเร็จ</p><button className="moderation-action" onClick={() => void reports.refetch()} data-testid="button-retry-reports">ลองอีกครั้ง</button></div>
        : !reports.data?.reports.length ? <div className="moderation-empty" data-testid="status-reports-empty"><strong>ไม่มีรายงานในตัวกรองนี้</strong>คิวเงียบดีแล้ว รายงานใหม่จะแสดงที่นี่</div>
        : <div className="moderation-list">{reports.data.reports.map(report => <ReportCard key={report.id} report={report} busy={mutation.isPending} onSave={save} />)}</div>}
    </main>
  </SignedInOnly>;
}

export default function ModerationReportsPage() {
  return <ModerationReportsContent />;
}
