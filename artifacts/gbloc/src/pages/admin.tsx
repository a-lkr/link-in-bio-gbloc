import { useEffect, useLayoutEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Check, Eye, EyeOff, FileText, Gift, LoaderCircle, Save, ShieldCheck, UserMinus, UserPlus } from 'lucide-react';
import { useUser } from '@/components/auth-context';
import {
  getGetAdminTermsQueryKey,
  getGetAdminPrivacyPolicyQueryKey,
  getGetModeratorAccessQueryKey,
  getGetModeratorListQueryKey,
  getGetMembershipListQueryKey,
  useGetMembershipList,
  useGiftMembership,
  useAddModerator,
  useGetAdminTerms,
  useGetAdminPrivacyPolicy,
  useGetModeratorAccess,
  useGetModeratorList,
  usePublishTerms,
  usePublishPrivacyPolicy,
  useRemoveModerator,
} from '@workspace/api-client-react';
import type { Moderator } from '@workspace/api-client-react';
import { SignedInOnly } from '@/components/gbloc-shared';
import { LegalDocumentContent, formatLegalDate } from '@/components/legal-document-content';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import '@/styles/admin.css';

function errorText(error: unknown) {
  const value = error as { message?: string; response?: { data?: { error?: string; message?: string } } };
  return value?.response?.data?.error || value?.response?.data?.message || value?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
}

function ModeratorRow({ moderator, busy, onRemove }: {
  moderator: Moderator;
  busy: boolean;
  onRemove: (moderator: Moderator) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return <div className="admin-moderator-row" data-testid={`row-moderator-${moderator.id}`}>
    <span className="admin-moderator-avatar" aria-hidden="true">{moderator.email.slice(0, 1).toUpperCase()}</span>
    <div className="admin-moderator-copy">
      <strong data-testid={`text-moderator-email-${moderator.id}`}>{moderator.email}</strong>
      <span data-testid={`text-moderator-added-${moderator.id}`}>เพิ่มเมื่อ {new Date(moderator.createdAt).toLocaleDateString('th-TH', { dateStyle: 'medium' })}</span>
    </div>
    {confirming ? <div className="admin-row-actions">
      <span className="admin-confirm-copy" data-testid={`status-remove-confirm-${moderator.id}`}>นำสิทธิ์ออก?</span>
      <button type="button" className="admin-remove-button" disabled={busy} onClick={() => { onRemove(moderator); setConfirming(false); }} data-testid={`button-confirm-remove-moderator-${moderator.id}`}>ยืนยัน</button>
      <button type="button" className="admin-secondary-button" onClick={() => setConfirming(false)} data-testid={`button-cancel-remove-moderator-${moderator.id}`}>ยกเลิก</button>
    </div> : <div className="admin-row-actions">
      <button type="button" className="admin-remove-button" disabled={busy} onClick={() => setConfirming(true)} data-testid={`button-remove-moderator-${moderator.id}`}><UserMinus size={13} />นำออก</button>
    </div>}
  </div>;
}

function LegalDocumentsAdminPanel() {
  const queryClient = useQueryClient();
  const terms = useGetAdminTerms({ query: { queryKey: getGetAdminTermsQueryKey() } });
  const privacy = useGetAdminPrivacyPolicy({ query: { queryKey: getGetAdminPrivacyPolicyQueryKey() } });
  const publishTermsMutation = usePublishTerms();
  const publishPrivacyMutation = usePublishPrivacyPolicy();
  const [activeDocument, setActiveDocument] = useState<'terms' | 'privacy'>('terms');
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const isTerms = activeDocument === 'terms';
  const activeLoading = isTerms ? terms.isLoading : privacy.isLoading;
  const activeError = isTerms ? terms.isError : privacy.isError;
  const activeData = isTerms ? terms.data : privacy.data;
  const isPublished = activeData?.isPublished ?? false;
  const isPending = isTerms ? publishTermsMutation.isPending : publishPrivacyMutation.isPending;

  useEffect(() => {
    const nextContent = isTerms ? terms.data?.content : privacy.data?.content;
    if (nextContent !== undefined) setContent(nextContent);
  }, [isTerms, terms.data?.content, privacy.data?.content]);

  const publish = () => {
    if (!content.trim() || isPending) return;
    const confirmation = isTerms
      ? 'เผยแพร่ข้อกำหนดฉบับนี้ทันทีหรือไม่? วันที่และเวลามีผลจะถูกตั้งเป็นเวลาปัจจุบันอัตโนมัติ'
      : 'เผยแพร่นโยบายความเป็นส่วนตัวฉบับนี้ทันทีหรือไม่?';
    if (!window.confirm(confirmation)) return;
    setMessage('');
    setError('');
    if (isTerms) {
      publishTermsMutation.mutate({ data: { content } }, {
        onSuccess: document => {
          queryClient.setQueryData(getGetAdminTermsQueryKey(), {
            ...document,
            isPublished: true,
          });
          setContent(document.content);
          setMessage(`เผยแพร่แล้ว มีผลตั้งแต่ ${formatLegalDate(document.effectiveAt)}`);
        },
        onError: mutationError => setError(errorText(mutationError)),
      });
    } else {
      publishPrivacyMutation.mutate({ data: { content } }, {
        onSuccess: document => {
          queryClient.setQueryData(getGetAdminPrivacyPolicyQueryKey(), document);
          setContent(document.content);
          setMessage('เผยแพร่นโยบายความเป็นส่วนตัวแล้ว');
        },
        onError: mutationError => setError(errorText(mutationError)),
      });
    }
  };

  return <section className="admin-panel admin-terms-panel" aria-labelledby="admin-terms-title">
    <div className="admin-panel-head">
      <div><h2 id="admin-terms-title"><FileText size={15} />ข้อกำหนดและนโยบาย</h2><p>แก้ไขเอกสารที่แสดงต่อผู้ใช้ได้จากหน้านี้ เฉพาะเจ้าของระบบเท่านั้นที่เผยแพร่ได้</p></div>
      {isPublished && <span className="admin-count">เผยแพร่แล้ว</span>}
    </div>

    {message && <div className="admin-notice" role="status"><Check size={14} /> {message}</div>}
    {error && <div className="admin-notice error" role="alert">{error}</div>}
    <div className="admin-terms-tabs admin-legal-document-tabs" role="group" aria-label="เลือกเอกสาร">
      <button type="button" className={isTerms ? 'active' : ''} aria-pressed={isTerms}
        onClick={() => { setActiveDocument('terms'); setPreview(false); setMessage(''); setError(''); }} data-testid="tab-legal-terms">ข้อกำหนด</button>
      <button type="button" className={!isTerms ? 'active' : ''} aria-pressed={!isTerms}
        onClick={() => { setActiveDocument('privacy'); setPreview(false); setMessage(''); setError(''); }} data-testid="tab-legal-privacy">นโยบายความเป็นส่วนตัว</button>
    </div>
    {activeLoading ? <div className="admin-skeleton" role="status" />
      : activeError ? <div className="admin-notice error" role="alert">
        โหลด{isTerms ? 'ข้อกำหนด' : 'นโยบายความเป็นส่วนตัว'}ไม่สำเร็จ
        <button type="button" className="admin-secondary-button" onClick={() => void (isTerms ? terms.refetch() : privacy.refetch())}>ลองอีกครั้ง</button>
      </div>
        : <>
          <div className="admin-terms-status">
            <span className={isPublished ? 'admin-terms-dot published' : 'admin-terms-dot'} />
            <span>{isPublished
              ? isTerms && terms.data?.effectiveAt
                ? `ข้อกำหนดมีผลตั้งแต่ ${formatLegalDate(terms.data.effectiveAt)}`
                : 'นโยบายเผยแพร่แล้ว'
              : 'ยังไม่เผยแพร่ — ข้อความด้านล่างเป็นร่างเริ่มต้น'}</span>
          </div>
          <div className="admin-terms-toolbar">
            <div className="admin-terms-tabs" role="group" aria-label="โหมดเอกสาร">
              <button type="button" className={!preview ? 'active' : ''} aria-pressed={!preview} onClick={() => setPreview(false)}><FileText size={13} />แก้ไข</button>
              <button type="button" className={preview ? 'active' : ''} aria-pressed={preview} onClick={() => setPreview(true)}><Eye size={13} />ตัวอย่าง</button>
            </div>
            <span>{content.length.toLocaleString('th-TH')} / 60,000</span>
          </div>
          {preview
            ? <div className="admin-terms-preview"><LegalDocumentContent content={content} /></div>
            : <label className="admin-terms-field">
              <span className="sr-only">เนื้อหาเอกสารในรูปแบบ Markdown</span>
              <textarea value={content} maxLength={60000} onChange={event => setContent(event.target.value)} spellCheck data-testid={`input-${activeDocument}-content`} />
            </label>}
          <div className="admin-terms-footer">
            <p>{isTerms
              ? 'เมื่อเผยแพร่ วันที่และเวลามีผลจะตั้งอัตโนมัติ การเปลี่ยนแปลงจะแสดงบนหน้านี้โดยไม่จำเป็นต้องแจ้งผู้ใช้เป็นรายบุคคล โปรดตรวจทานก่อนเผยแพร่'
              : 'ตรวจทานเนื้อหานโยบายให้ตรงกับการใช้งานจริงก่อนเผยแพร่'}</p>
            <button type="button" className="admin-primary-button" onClick={publish} disabled={isPending || !content.trim()} data-testid={`button-publish-${activeDocument}`}>
              {isPending ? <LoaderCircle size={14} /> : <Save size={14} />}
              {isPending ? 'กำลังเผยแพร่…' : 'บันทึกและเผยแพร่'}
            </button>
          </div>
        </>}
  </section>;
}

function MembershipAdminPanel() {
  const queryClient = useQueryClient();
  const memberships = useGetMembershipList({ query: { queryKey: getGetMembershipListQueryKey() } });
  const gift = useGiftMembership();
  const [username, setUsername] = useState('');
  const [plan, setPlan] = useState<'basic' | 'pro'>('basic');
  const [days, setDays] = useState('30');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submitGift = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = username.trim().replace(/^@/, '').toLowerCase();
    const duration = Number(days);
    if (!normalized || !Number.isInteger(duration) || duration < 1 || duration > 36500 || gift.isPending) return;
    setMessage('');
    setError('');
    gift.mutate({ data: { username: normalized, plan, days: duration } }, {
      onSuccess: async result => {
        setUsername('');
        setMessage(`มอบ ${result.plan.toUpperCase()} ให้ @${result.username} แล้ว หมดอายุ ${new Date(result.expiresAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}`);
        await queryClient.invalidateQueries({ queryKey: getGetMembershipListQueryKey() });
      },
      onError: mutationError => setError(errorText(mutationError)),
    });
  };

  return <section className="admin-panel" aria-labelledby="admin-gift-title">
    <div className="admin-panel-head">
      <div><h2 id="admin-gift-title"><Gift size={15} />มอบสมาชิก</h2><p>เลือกบัญชี ระดับ Basic หรือ Pro และจำนวนวันได้เอง</p></div>
      {memberships.data && <span className="admin-count">{memberships.data.memberships.length} บัญชี</span>}
    </div>
    {message && <div className="admin-notice" role="status"><Check size={14} /> {message}</div>}
    {error && <div className="admin-notice error" role="alert">{error}</div>}
    <form className="admin-gift-form" onSubmit={submitGift}>
      <label className="admin-email-field">ชื่อผู้ใช้
        <input required minLength={3} maxLength={20} value={username} onChange={event => setUsername(event.target.value)}
          placeholder="@username" autoComplete="off" data-testid="input-gift-username" />
      </label>
      <label className="admin-email-field">ระดับสมาชิก
        <Select value={plan} onValueChange={value => setPlan(value as 'basic' | 'pro')}>
          <SelectTrigger className="admin-select-trigger" aria-label="ระดับสมาชิก" data-testid="select-gift-plan"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="basic">Basic</SelectItem><SelectItem value="pro">Pro</SelectItem></SelectContent>
        </Select>
      </label>
      <label className="admin-email-field">จำนวนวัน
        <input type="number" required min={1} max={36500} step={1} value={days} onChange={event => setDays(event.target.value)} data-testid="input-gift-days" />
      </label>
      <button className="admin-primary-button" type="submit" disabled={gift.isPending || !username.trim() || !days}>
        {gift.isPending ? <LoaderCircle size={14} /> : <Gift size={14} />}
        {gift.isPending ? 'กำลังมอบ…' : 'มอบสมาชิก'}
      </button>
    </form>
      <p className="admin-gift-hint">รายชื่อนี้เห็นได้เฉพาะเจ้าของ gbloc · ถ้ามีสมาชิกอยู่แล้ว วันจะต่อจากวันหมดอายุเดิม และระดับที่เลือกมีผลทันที</p>
    <div className="admin-membership-list" aria-live="polite">
      {memberships.isLoading ? <div className="admin-skeleton" role="status" />
        : memberships.isError ? <div className="admin-notice error" role="alert">โหลดสมาชิกไม่สำเร็จ
          <button type="button" className="admin-secondary-button" onClick={() => void memberships.refetch()}>ลองอีกครั้ง</button>
        </div>
          : !memberships.data?.memberships.length ? <div className="admin-empty"><strong>ยังไม่มีสมาชิกที่ใช้งานอยู่</strong>สมาชิกที่มอบให้จะแสดงที่นี่จนกว่าจะหมดอายุ</div>
            : memberships.data.memberships.map(member => <div className="admin-membership-row" key={member.username}>
              <span className={`admin-plan-mark ${member.plan}`}><BadgeCheck size={14} /></span>
              <div className="admin-moderator-copy">
                <strong>@{member.username} · {member.plan.toUpperCase()}</strong>
                <span>เริ่ม {new Date(member.startedAt).toLocaleDateString('th-TH', { dateStyle: 'medium' })} · หมดอายุ {new Date(member.expiresAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
              <small className="admin-membership-added">มอบเมื่อ {new Date(member.grantedAt).toLocaleDateString('th-TH', { dateStyle: 'medium' })}</small>
            </div>)}
    </div>
  </section>;
}

function AdminContent() {
  const { isSignedIn } = useUser();
  const access = useGetModeratorAccess({ query: { queryKey: getGetModeratorAccessQueryKey(), enabled: !!isSignedIn } });
  const moderatorList = useGetModeratorList({
    query: { queryKey: getGetModeratorListQueryKey(), enabled: access.data?.isOwner === true },
  });
  const addMutation = useAddModerator();
  const removeMutation = useRemoveModerator();
  const client = useQueryClient();
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [showModeratorRoster, setShowModeratorRoster] = useState(true);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const refreshList = () => { void client.invalidateQueries({ queryKey: getGetModeratorListQueryKey() }); };
  const addModerator = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || addMutation.isPending) return;
    setNotice('');
    setActionError('');
    addMutation.mutate({ data: { email: normalizedEmail } }, {
      onSuccess: response => {
        setNotice(`${response.moderator.email} เพิ่มเป็นผู้ดูแลแล้ว`);
        setEmail('');
        refreshList();
      },
      onError: error => setActionError(errorText(error)),
    });
  };
  const removeModerator = (moderator: Moderator) => {
    setNotice('');
    setActionError('');
    removeMutation.mutate({ moderatorId: moderator.id }, {
      onSuccess: () => {
        setNotice(`นำสิทธิ์ผู้ดูแลของ ${moderator.email} ออกแล้ว`);
        refreshList();
      },
      onError: error => setActionError(errorText(error)),
    });
  };

  if (access.isLoading) return <SignedInOnly current="/admin"><main className="admin-page"><div className="admin-skeleton" role="status" data-testid="status-admin-access-loading" /></main></SignedInOnly>;
  if (access.isError) return <SignedInOnly current="/admin"><main className="admin-page"><div className="admin-notice error" role="alert" data-testid="status-admin-access-error">ตรวจสอบสิทธิ์ไม่สำเร็จ กรุณาลองใหม่</div></main></SignedInOnly>;
  if (!access.data?.isOwner) return <SignedInOnly current="/admin"><main className="admin-page"><div className="admin-access-denied" data-testid="status-admin-access-denied"><ShieldCheck size={21} /><strong>หน้านี้สำหรับเจ้าของ gbloc</strong>การจัดการผู้ดูแลเปิดให้เฉพาะเจ้าของบัญชี</div></main></SignedInOnly>;

  return <SignedInOnly current="/admin">
    <main className="admin-page">
      <header className="admin-heading">
        <div><span className="account-eyebrow">GBLOC / ACCESS</span><h1>จัดการผู้ดูแล</h1><p>เพิ่มหรือนำสิทธิ์ผู้ดูแลคิวรายงานออก</p></div>
      </header>

      {notice && <div className="admin-notice" role="status" data-testid="status-admin-success"><Check size={14} /> {notice}</div>}
      {actionError && <div className="admin-notice error" role="alert" data-testid="status-admin-action-error">{actionError}</div>}

      <section className="admin-panel" aria-labelledby="admin-add-title">
        <div className="admin-panel-head">
          <div><h2 id="admin-add-title">เพิ่มผู้ดูแล</h2><p>ใช้อีเมลของบัญชีที่มีอยู่ เพื่อให้เข้าถึงคิวรายงานได้</p></div>
        </div>
        <form className="admin-add-form" onSubmit={addModerator}>
          <label className="admin-email-field">อีเมลผู้ดูแล
            <input type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" data-testid="input-moderator-email" />
          </label>
          <button className="admin-primary-button" type="submit" disabled={addMutation.isPending || !email.trim()} data-testid="button-add-moderator">
            {addMutation.isPending ? <LoaderCircle size={14} /> : <UserPlus size={14} />}
            {addMutation.isPending ? 'กำลังเพิ่ม…' : 'เพิ่มผู้ดูแล'}
          </button>
        </form>
      </section>

      <section className="admin-panel" aria-labelledby="admin-list-title">
        <div className="admin-panel-head">
          <div><h2 id="admin-list-title">ผู้ดูแลที่ใช้งานอยู่</h2><p>ผู้ดูแลเพิ่มเติมมีสิทธิ์เฉพาะตรวจและดำเนินการกับรายงานที่ได้รับ</p></div>
          <div className="admin-roster-tools">
            {moderatorList.data && <span className="admin-count" data-testid="status-moderator-count">{moderatorList.data.moderators.length} คน</span>}
            <button type="button" className="admin-secondary-button admin-roster-toggle" aria-expanded={showModeratorRoster}
              aria-controls="admin-moderator-roster" onClick={() => setShowModeratorRoster(value => !value)} data-testid="button-toggle-moderator-list">
              {showModeratorRoster ? <EyeOff size={13} /> : <Eye size={13} />}{showModeratorRoster ? 'ซ่อนรายชื่อ' : 'แสดงรายชื่อ'}
            </button>
          </div>
        </div>
        {showModeratorRoster && (moderatorList.isLoading ? <div role="status" data-testid="status-moderator-list-loading"><div className="admin-skeleton" /><div className="admin-skeleton" /></div>
          : moderatorList.isError ? <div className="admin-notice error" role="alert" data-testid="status-moderator-list-error">
            <span>โหลดรายชื่อผู้ดูแลไม่สำเร็จ</span>
            <button type="button" className="admin-secondary-button" onClick={() => void moderatorList.refetch()} data-testid="button-retry-moderator-list">ลองอีกครั้ง</button>
          </div>
          : !moderatorList.data?.moderators.length ? <div className="admin-empty" data-testid="status-moderator-list-empty"><strong>ยังไม่มีผู้ดูแลเพิ่มเติม</strong>เพิ่มผู้ดูแลเพื่อช่วยตรวจสอบรายงาน</div>
          : <div id="admin-moderator-roster" className="admin-list">{moderatorList.data.moderators.map(moderator => <ModeratorRow key={moderator.id} moderator={moderator} busy={removeMutation.isPending} onRemove={removeModerator} />)}</div>)}
      </section>

      <MembershipAdminPanel />
      <LegalDocumentsAdminPanel />
    </main>
  </SignedInOnly>;
}

export default function AdminPage() {
  return <AdminContent />;
}
