import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, ExternalLink, LoaderCircle, RotateCcw, Save } from 'lucide-react';
import {
  getCheckUsernameAvailabilityQueryKey, getGetAccountSummaryQueryKey, getGetMyProfileQueryKey, getGetPublicProfileQueryKey,
  useCheckUsernameAvailability, useGetMyMembership, useGetMyProfile, useUpdateMyProfile,
} from '@workspace/api-client-react';
import type { Profile, ProfileWithLinks } from '@workspace/api-client-react';
import { appBasePath, ErrorPanel, SignedInOnly, usernameRule } from '@/components/gbloc-shared';
import {
  changedKeys, draftFromProfile, invalidColorKeys, mergeAfterSave, previewProfile, sameDraft, toUpdateInput, type Draft,
} from '@/components/customize/draft';
import { useAssetUploads, type AssetField } from '@/components/customize/use-asset-uploads';
import { CzGroup } from '@/components/customize/controls';
import {
  AvatarSection, BackgroundSection, ColorsSection, IdentitySection, MusicSection, ProfileFrameSection, type SetField, type UsernameStatus,
} from '@/components/customize/sections';
import { PreviewDialog } from '@/components/customize/preview-dialog';
import { PremiumVisualSection } from '@/components/customize/premium-visual-section';
import type { LocalBackgroundPreview, PremiumVisualPreview } from '@/components/customize/premium-visuals';
import '@/styles/customize.css';

const rail = [
  { id: 'group-profile', label: 'โปรไฟล์' },
  { id: 'group-scene', label: 'พื้นหลัง' },
  { id: 'group-style', label: 'สไตล์สี' },
  { id: 'group-visitor', label: 'เสียง' },
];
const sectionGroupByTarget: Record<string, string> = {
  'cz-identity': 'group-profile',
  'cz-avatar': 'group-profile',
  'cz-frame': 'group-scene',
  'cz-background': 'group-scene',
  'cz-colors': 'group-style',
  'cz-visuals': 'group-style',
  'cz-music': 'group-visitor',
};

export default function CustomizePage() {
  return <SignedInOnly current="/customize"><CustomizeEditor /></SignedInOnly>;
}

function CustomizeEditor() {
  const client = useQueryClient();
  const query = useGetMyProfile();
  const profile = query.data?.profile;
  const publicProfileHref = profile?.username
    ? `${appBasePath}/@${encodeURIComponent(profile.username)}`
    : null;
  const links = query.data?.links ?? [];
  const membershipQuery = useGetMyMembership();
  const membershipPlan = membershipQuery.data?.plan ?? null;
  const hasBasicAccess = membershipPlan === 'basic' || membershipPlan === 'pro';
  const hasProAccess = membershipPlan === 'pro';
  const update = useUpdateMyProfile();
  const [baseline, setBaseline] = useState<Draft | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInitialEntry, setPreviewInitialEntry] = useState<'before' | 'after'>('before');
  const [expandedGroup, setExpandedGroup] = useState('group-profile');
  const [pendingSection, setPendingSection] = useState<string | null>(null);
  const [premiumBackgroundFile, setPremiumBackgroundFile] = useState<File | null>(null);
  const [premiumBackgroundPreview, setPremiumBackgroundPreview] = useState<LocalBackgroundPreview | null>(null);
  const previewButton = useRef<HTMLButtonElement>(null);
  const initFor = useRef<string | null>(null);

  // Initialise once per profile id; later refetches never overwrite the draft.
  useEffect(() => {
    if (profile && initFor.current !== profile.id) {
      initFor.current = profile.id;
      const d = draftFromProfile(profile);
      setBaseline(d); setDraft(d);
    }
  }, [profile]);

  useEffect(() => setPremiumBackgroundFile(null), [profile?.id]);

  const deepLinkReady = draft !== null;
  useEffect(() => {
    if (!deepLinkReady) return;
    const section = new URLSearchParams(window.location.search).get('section');
    const group = sectionGroupByTarget[section ?? ''];
    if (!section || !group) return;
    setExpandedGroup(group);
    setPendingSection(section);
  }, [deepLinkReady]);

  useEffect(() => {
    if (!pendingSection) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(pendingSection)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPendingSection(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [expandedGroup, pendingSection]);

  const set: SetField = useCallback((key, value) => { setDraft(old => (old ? { ...old, [key]: value } : old)); setNotice(null); }, []);

  const onUploaded = useCallback((field: AssetField, path: string, file: File) => {
    setDraft(old => {
      if (!old) return old;
      if (field === 'backgroundPath') return { ...old, backgroundPath: path, backgroundType: file.type.startsWith('video/') ? 'video' : 'image' };
      const extraTrackSlot = /^audioPath([2-4])$/.exec(field);
      if (extraTrackSlot) {
        const index = Number(extraTrackSlot[1]) - 2;
        const tracks = [0, 1, 2].map(i => old.extraAudioTracks[i] ?? { path: null, title: '' });
        tracks[index] = { ...tracks[index], path, title: tracks[index].title || file.name.replace(/\.[^.]+$/, '') };
        return { ...old, extraAudioTracks: tracks };
      }
      return { ...old, [field]: path };
    });
  }, []);
  const uploads = useAssetUploads(onUploaded);
  useEffect(() => { uploads.cancelAll(); }, [profile?.id, uploads.cancelAll]);

  // Premium background files stay local in this preview-only experience; they are never uploaded.
  useEffect(() => {
    if (!premiumBackgroundFile) {
      setPremiumBackgroundPreview(null);
      return;
    }
    const url = URL.createObjectURL(premiumBackgroundFile);
    const preview: LocalBackgroundPreview = {
      url,
      type: premiumBackgroundFile.type.startsWith('video/') || /\.(mp4|webm)$/i.test(premiumBackgroundFile.name) ? 'video' : 'image',
      name: premiumBackgroundFile.name,
      size: premiumBackgroundFile.size,
    };
    setPremiumBackgroundPreview(preview);
    return () => URL.revokeObjectURL(url);
  }, [premiumBackgroundFile]);

  // Username check (debounced)
  const rawUsername = draft?.username ?? '';
  const normalized = rawUsername.toLowerCase();
  const validUsername = usernameRule.test(rawUsername);
  const isOwn = !!baseline && normalized === baseline.username;
  const [debounced, setDebounced] = useState(normalized);
  useEffect(() => { const t = window.setTimeout(() => setDebounced(normalized), 350); return () => window.clearTimeout(t); }, [normalized]);
  const usernameQuery = useCheckUsernameAvailability({ username: debounced }, {
    query: { enabled: validUsername && !isOwn && debounced === normalized && usernameRule.test(debounced), queryKey: getCheckUsernameAvailabilityQueryKey({ username: debounced }), retry: false },
  });
  const usernameStatus: UsernameStatus = isOwn ? { tone: 'own', text: 'ชื่อผู้ใช้นี้เป็นของคุณ' }
    : !validUsername ? { tone: 'bad', text: 'ใช้ 3–20 ตัวอักษร: a–z, 0–9 และ _ เท่านั้น' }
    : debounced !== normalized || usernameQuery.isFetching ? { tone: 'pending', text: 'กำลังตรวจสอบชื่อผู้ใช้…' }
    : usernameQuery.isError ? { tone: 'warn', text: 'ตรวจสอบชื่อไม่ได้ในตอนนี้ (ปัญหาการเชื่อมต่อ ไม่ใช่ชื่อถูกใช้)' }
    : usernameQuery.data?.available ? { tone: 'ok', text: 'ชื่อนี้ใช้ได้' }
    : usernameQuery.data ? { tone: 'bad', text: usernameQuery.data.reason || 'ชื่อนี้ถูกใช้หรือสงวนไว้แล้ว' }
    : { tone: 'pending', text: 'กำลังตรวจสอบชื่อผู้ใช้…' };
  const usernameOk = usernameStatus.tone === 'own' || usernameStatus.tone === 'ok';

  const dirty = !!draft && !!baseline && !sameDraft(draft, baseline);
  const badColors = draft ? invalidColorKeys(draft) : [];
  const saving = update.isPending;
  const premiumStyleKeys: (keyof Draft)[] = ['premiumBackground', 'premiumBackgroundStrength', 'premiumFont', 'premiumTextEffect', 'showCredit'];
  const premiumStyleDirty = !!draft && !!baseline && premiumStyleKeys.some(key => draft[key] !== baseline[key]);
  const proBadgeDirty = !!draft && !!baseline && draft.showProBadge !== baseline.showProBadge;
  const proTracksDirty = !!draft && !!baseline && JSON.stringify(draft.extraAudioTracks) !== JSON.stringify(baseline.extraAudioTracks);
  const membershipReady = !membershipQuery.isLoading && !membershipQuery.isError;
  const canSave = dirty && usernameOk && badColors.length === 0 && !uploads.busy && !saving
    && (!premiumStyleDirty || (membershipReady && hasBasicAccess))
    && (!proBadgeDirty || !draft?.showProBadge || (membershipReady && hasProAccess))
    && (!proTracksDirty || (membershipReady && hasProAccess));

  // Guard tab close / reload
  const guard = useRef(false);
  guard.current = dirty || uploads.busy;
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (guard.current) { e.preventDefault(); e.returnValue = ''; } };
    const onNavigate = (event: MouseEvent) => {
      if (!guard.current || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const next = new URL(anchor.href, window.location.href);
      if (next.origin === window.location.origin && next.pathname === window.location.pathname && next.search === window.location.search) return;
      if (!window.confirm('มีการแก้ไขที่ยังไม่บันทึก ต้องการออกจากหน้านี้และทิ้งฉบับร่างหรือไม่?')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', h);
    document.addEventListener('click', onNavigate, true);
    return () => {
      window.removeEventListener('beforeunload', h);
      document.removeEventListener('click', onNavigate, true);
    };
  }, []);

  const mutateRef = useRef(update.mutateAsync);
  mutateRef.current = update.mutateAsync;

  async function save() {
    if (!draft || !baseline || !canSave) return;
    const sent = draft;
    const oldUsername = baseline.username;
    setNotice(null);
    try {
      const result = await mutateRef.current({ data: toUpdateInput(sent, hasBasicAccess, hasProAccess) });
      if (result.id !== initFor.current) return;
      const fresh = draftFromProfile(result);
      setBaseline(fresh);
      setDraft(cur => (cur ? mergeAfterSave(cur, sent, fresh) : fresh));
      client.setQueryData<ProfileWithLinks>(getGetMyProfileQueryKey(), old => (old ? { ...old, profile: result } : old));
      setNotice({ kind: 'ok', text: 'บันทึกและเผยแพร่แล้ว' });
      void client.invalidateQueries({ queryKey: getGetAccountSummaryQueryKey() });
      void client.invalidateQueries({ queryKey: getGetPublicProfileQueryKey(result.username) });
      if (oldUsername !== result.username) void client.invalidateQueries({ queryKey: getGetPublicProfileQueryKey(oldUsername) });
    } catch (e) {
      const msg = (e as { data?: { error?: string } })?.data?.error;
      setNotice({ kind: 'error', text: `บันทึกไม่สำเร็จ ฉบับร่างยังอยู่ครบ${msg ? ` · ${msg}` : ''}` });
    }
  }

  function discard() {
    if (!baseline) return;
    uploads.cancelAll();
    setDraft(baseline);
    setNotice(null);
  }

  const preview = useMemo(() => (profile && draft && baseline ? previewProfile(profile, draft, baseline) : null), [profile, draft, baseline]);
  const premiumPreviewProfile = useMemo(() => {
    if (!preview || !premiumBackgroundPreview) return preview;
    return { ...preview, backgroundPath: premiumBackgroundPreview.url, backgroundType: premiumBackgroundPreview.type } as Profile;
  }, [preview, premiumBackgroundPreview]);

  if (query.isError && !draft) return <ErrorPanel message="ไม่สามารถเปิดข้อมูลโปรไฟล์ได้" retry={() => query.refetch()} />;
  if (!draft || !baseline || !preview) return <div className="customize-page"><div className="cz-skeleton" role="status" aria-label="กำลังโหลด">
    <i className="w40" /><i className="w70" /><div className="cz-skel-card" /><div className="cz-skel-card" /></div></div>;

  const changes = changedKeys(draft, baseline).length;
  const blocker = uploads.busy ? 'รออัปโหลดให้เสร็จก่อนบันทึก'
    : badColors.length ? `มีรหัสสีไม่ถูกต้อง ${badColors.length} ช่อง`
    : membershipQuery.isError && premiumStyleDirty ? 'ตรวจสอบสมาชิกไม่สำเร็จ ลองโหลดหน้าใหม่ก่อนบันทึกสไตล์'
    : premiumStyleDirty && !hasBasicAccess ? 'สไตล์ Basic จะบันทึกได้เมื่อบัญชีมีสมาชิก Basic หรือ Pro'
    : proBadgeDirty && draft.showProBadge && !hasProAccess ? 'เครื่องหมาย Pro ใช้ได้เฉพาะสมาชิก Pro'
    : proTracksDirty && !hasProAccess ? 'เสียงเพิ่มเติมต้องใช้สมาชิก Pro'
    : !usernameOk && dirty ? 'ตรวจชื่อผู้ใช้ให้ผ่านก่อนบันทึก' : '';
  const sectionProps = { draft, baseline, set, uploads, preview };
  const openGroup = (id: string) => {
    setExpandedGroup(id);
    window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const premiumVisual: PremiumVisualPreview = {
    background: draft.premiumBackground,
    backgroundStrength: draft.premiumBackgroundStrength,
    font: draft.premiumFont,
    textEffect: draft.premiumTextEffect,
    showProBadge: draft.showProBadge,
    showCredit: draft.showCredit,
  };

  return <div className="customize-page">
    <div className="cz-head">
      <div><span className="cz-eyebrow">01 / ตัวตนและหน้าตา</span><h1>ปรับแต่งหน้าโปรไฟล์</h1><p>ทุกอย่างเป็นฉบับร่างจนกว่าคุณจะกดบันทึก</p></div>
    </div>

    <div className="cz-savebar" role="region" aria-label="สถานะฉบับร่าง">
      <div className={`cz-state ${uploads.busy ? 'is-busy' : dirty ? 'is-dirty' : 'is-clean'}`} data-testid="status-draft" aria-live="polite">
        <span className="cz-state-dot" />
        {uploads.busy ? 'กำลังอัปโหลดไฟล์' : dirty ? `ฉบับร่างยังไม่บันทึก · ${changes} รายการ` : 'ตรงกับที่บันทึกล่าสุด'}
        {blocker && <small>{blocker}</small>}
      </div>
      <div className="cz-actions">
        {publicProfileHref
          ? <a href={publicProfileHref} target="_blank" rel="noopener noreferrer" className="cz-pill" data-testid="link-open-public-profile">
              <ExternalLink size={15} />เปิดหน้าสาธารณะ
            </a>
          : <button type="button" className="cz-pill" disabled><ExternalLink size={15} />เปิดหน้าสาธารณะ</button>}
        <button type="button" className="cz-pill" onClick={discard} disabled={!dirty || saving || uploads.busy} data-testid="button-discard"><RotateCcw size={15} />ย้อนกลับ</button>
        <button type="button" className="cz-pill cz-save" onClick={save} disabled={!canSave} data-testid="button-save-profile">
          {saving ? <LoaderCircle className="cz-spin" size={15} /> : <Save size={15} />}{saving ? 'กำลังบันทึก' : 'บันทึก'}</button>
      </div>
    </div>
    {notice && <div className={`cz-notice is-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'} data-testid="status-save">
      {notice.kind === 'ok' ? <Check size={15} /> : <AlertCircle size={15} />}{notice.text}</div>}

    <div className="cz-layout">
      <nav className="cz-rail" aria-label="หมวดการปรับแต่ง">
        {rail.map((r, i) => <a key={r.id} href={`#${r.id}`} className={`cz-rail-link${expandedGroup === r.id ? ' is-current' : ''}`}
          onClick={e => { e.preventDefault(); openGroup(r.id); }} aria-current={expandedGroup === r.id ? 'location' : undefined}
          data-testid={`link-section-${r.id}`}><span>{String(i + 1).padStart(2, '0')}</span><span className="cz-rail-copy"><strong>{r.label}</strong></span></a>)}
      </nav>
      <div className="cz-stack cz-organized-stack">
        <CzGroup id="group-profile" index="01" title="โปรไฟล์" lede="ตัวตนที่คนอื่นเห็นเมื่อเปิดหน้าโปรไฟล์ · ชื่อ คำอธิบาย และรูปประจำตัว"
          expanded={expandedGroup === 'group-profile'} onToggle={() => setExpandedGroup(expandedGroup === 'group-profile' ? '' : 'group-profile')}>
          <IdentitySection {...sectionProps} usernameStatus={usernameStatus} onRetryUsername={() => usernameQuery.refetch()} />
          <AvatarSection {...sectionProps} />
        </CzGroup>
        <CzGroup id="group-scene" index="02" title="พื้นหลัง" lede="ภาพพื้นหลัง จุดโฟกัส และกรอบโปรไฟล์"
          expanded={expandedGroup === 'group-scene'} onToggle={() => setExpandedGroup(expandedGroup === 'group-scene' ? '' : 'group-scene')}>
          <ProfileFrameSection {...sectionProps} />
          <BackgroundSection {...sectionProps} />
        </CzGroup>
        <CzGroup id="group-style" index="03" title="สไตล์สี" lede="สี เอฟเฟกต์ และรูปแบบโปรไฟล์"
          expanded={expandedGroup === 'group-style'} onToggle={() => setExpandedGroup(expandedGroup === 'group-style' ? '' : 'group-style')}>
          <ColorsSection {...sectionProps} />
          <PremiumVisualSection draft={draft} style={premiumVisual}
            onStyleChange={next => {
              set('premiumBackground', next.background);
              set('premiumBackgroundStrength', next.backgroundStrength);
              set('premiumFont', next.font);
              set('premiumTextEffect', next.textEffect);
              set('showProBadge', next.showProBadge);
              set('showCredit', next.showCredit);
            }}
            isBasicActive={hasBasicAccess} isProActive={hasProAccess} onSave={() => void save()}
            backgroundPreview={premiumBackgroundPreview} onBackgroundFileChange={setPremiumBackgroundFile}
            onPreview={() => { setPreviewInitialEntry('after'); setPreviewOpen(true); }} previewButtonRef={previewButton} />
        </CzGroup>
        <CzGroup id="group-visitor" index="04" title="เสียง" lede="เสียง เครื่องเล่น และหน้าต้อนรับ"
          expanded={expandedGroup === 'group-visitor'} onToggle={() => setExpandedGroup(expandedGroup === 'group-visitor' ? '' : 'group-visitor')}>
          <MusicSection {...sectionProps} isProActive={hasProAccess} />
        </CzGroup>
      </div>
    </div>
    {previewOpen && <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} onRestoreFocus={() => previewButton.current?.focus()}
      profile={premiumPreviewProfile ?? preview} links={links} stylePreview={premiumVisual} initiallyEntered={previewInitialEntry === 'after'} />}
  </div>;
}
