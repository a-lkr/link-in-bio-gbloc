import { useState, type CSSProperties, type ReactNode } from 'react';
import {
  ChevronRight, CloudUpload, Droplets, ExternalLink, Eye, LockKeyhole,
  LogOut, Moon, Music2, RotateCcw, Save, Sparkles, Type, WandSparkles,
} from 'lucide-react';
import './_group.css';

type Track = { path: string | null; title: string };
type Draft = {
  username: string; displayName: string; bio: string; location: string; showAvatar: boolean; showProfileFrame: boolean;
  profileFrameBlur: number; avatarPath: string | null; avatarZoom: number; avatarX: number; avatarY: number;
  backgroundType: 'image' | 'video' | null; backgroundPath: string | null; backgroundEffect: 'black' | 'blur';
  focusX: number; focusY: number; dimOpacity: number; audioPath: string | null; audioTitle: string; audioCoverPath: string | null;
  extraAudioTracks: Track[]; showMusicPlayer: boolean; showVolumeControl: boolean; musicVolume: number; showViews: boolean;
  enterText: string; glowIntensity: number; premiumBackground: string; premiumBackgroundStrength: number;
  premiumFont: string; premiumTextEffect: string; showProBadge: boolean; showCredit: boolean;
  displayNameColor: string; descriptionColor: string; locationColor: string; socialColor: string; musicColor: string;
  viewsColor: string; enterTextColor: string; backgroundColor: string; profileFrameColor: string; profileFrameBackgroundColor: string;
};

const initialDraft: Draft = {
  username: 'mali_art', displayName: 'Mali Suthida', bio: 'นักวาดภาพประกอบและคนรักแมว ✨', location: 'Bangkok, Thailand',
  showAvatar: true, showProfileFrame: true, profileFrameBlur: 8, avatarPath: null, avatarZoom: 100, avatarX: 50, avatarY: 50,
  backgroundType: null, backgroundPath: null, backgroundEffect: 'black', focusX: 50, focusY: 50, dimOpacity: 0,
  audioPath: null, audioTitle: 'just listen...', audioCoverPath: null,
  extraAudioTracks: [{ path: null, title: '' }, { path: null, title: '' }, { path: null, title: '' }],
  showMusicPlayer: true, showVolumeControl: true, musicVolume: 80, showViews: true, enterText: 'Click to Enter', glowIntensity: 45,
  premiumBackground: 'none', premiumBackgroundStrength: 55, premiumFont: 'default', premiumTextEffect: 'none',
  showProBadge: false, showCredit: true,
  displayNameColor: '#ffffff', descriptionColor: '#c6b9d8', locationColor: '#a79caf', socialColor: '#c295ff',
  musicColor: '#c295ff', viewsColor: '#a79caf', enterTextColor: '#ffffff', backgroundColor: '#17121d',
  profileFrameColor: '#c296ff', profileFrameBackgroundColor: '#17121d',
};

const rail = [
  { id: 'cz-identity', label: 'ข้อมูล' }, { id: 'cz-avatar', label: 'รูปโปรไฟล์' }, { id: 'cz-colors', label: 'สี' },
  { id: 'cz-frame', label: 'กรอบโปรไฟล์' }, { id: 'cz-background', label: 'ฉากหลัง' }, { id: 'cz-visuals', label: 'Basic' }, { id: 'cz-music', label: 'เสียง' },
];
const colorFields = [
  { key: 'displayNameColor', label: 'Display Name', hint: 'ชื่อตัวใหญ่' },
  { key: 'descriptionColor', label: 'Description', hint: 'ข้อความใต้ชื่อ' },
  { key: 'locationColor', label: 'Location', hint: 'ตำแหน่ง/สถานะ' },
  { key: 'socialColor', label: 'ไอคอนโซเชียล', hint: 'ลิงก์ทั้งหมด' },
  { key: 'musicColor', label: 'เครื่องเล่นเสียง', hint: 'ชื่อแทร็กและปุ่ม' },
  { key: 'viewsColor', label: 'ยอดเข้าชม', hint: 'ตัวนับผู้เข้าชม' },
  { key: 'enterTextColor', label: 'ข้อความหน้ากดเข้า', hint: 'Click to Enter' },
  { key: 'backgroundColor', label: 'สีพื้นหลังสำรอง', hint: 'ใช้เมื่อไม่มีภาพ' },
];
const uploadHints: Record<string, string> = {
  avatarPath: 'JPEG, PNG (โปร่งใสได้), WebP · ไม่เกิน 10 MB',
  audioCoverPath: 'JPEG, PNG, WebP · ไม่เกิน 10 MB',
  backgroundPath: 'ภาพ JPEG/PNG/WebP ≤ 5 MB · วิดีโอ MP4/WebM/MOV (รวม HEVC) ≤ 10 MB · แปลงเป็น MP4',
  audioPath: 'MP3, M4A, AAC, OGG, WAV, WebM · ไม่เกิน 10 MB',
  audioPath2: 'MP3, M4A, AAC, OGG, WAV, WebM · ไม่เกิน 10 MB',
  audioPath3: 'MP3, M4A, AAC, OGG, WAV, WebM · ไม่เกิน 10 MB',
  audioPath4: 'MP3, M4A, AAC, OGG, WAV, WebM · ไม่เกิน 10 MB',
};
const uploadAccept: Record<string, string> = {
  avatarPath: 'image/jpeg,image/png,image/webp', audioCoverPath: 'image/jpeg,image/png,image/webp',
  backgroundPath: 'image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,video/hevc,.mov,.hevc,.m4v',
  audioPath: 'audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/wav,audio/webm',
  audioPath2: 'audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/wav,audio/webm',
  audioPath3: 'audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/wav,audio/webm',
  audioPath4: 'audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/wav,audio/webm',
};

function CzSection({ id, index, title, lede, children }: { id: string; index: string; title: string; lede: string; children: ReactNode }) {
  return <section className="cz-card" id={id} aria-labelledby={`${id}-title`}>
    <header className="cz-card-head"><span className="cz-index">{index}</span><div><h2 id={`${id}-title`}>{title}</h2><p>{lede}</p></div></header>
    {children}
  </section>;
}

function CzSwitch({ checked, onChange, label, description, disabled, testId }: {
  checked: boolean; onChange: (value: boolean) => void; label: string; description?: string; disabled?: boolean; testId: string;
}) {
  const id = `sw-${testId}`;
  return <div className={`cz-switch-row${checked ? ' is-on' : ''}${disabled ? ' is-disabled' : ''}`}>
    <div className="cz-switch-copy"><span id={`${id}-l`}>{label}</span>{description && <small id={`${id}-d`}>{description}</small>}</div>
    <button type="button" role="switch" disabled={disabled} aria-checked={checked} aria-labelledby={`${id}-l`} aria-describedby={description ? `${id}-d` : undefined}
      className="cz-switch" onClick={() => onChange(!checked)} data-testid={testId}><span className="cz-switch-thumb" /></button>
  </div>;
}

function CzSlider({ label, value, min, max, unit = '%', onChange, disabled, testId }: {
  label: string; value: number; min: number; max: number; unit?: string; onChange: (value: number) => void; disabled?: boolean; testId: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return <div className={`cz-slider${disabled ? ' is-disabled' : ''}`}>
    <label htmlFor={testId}><span>{label}</span><output htmlFor={testId}>{value}{unit}</output></label>
    <input id={testId} type="range" min={min} max={max} step={1} value={value} disabled={disabled}
      onChange={e => onChange(Math.round(Number(e.target.value)))} style={{ '--pct': `${pct}%` } as CSSProperties} data-testid={testId} />
  </div>;
}

function CzSegmented<T extends string>({ label, value, options, onChange, testId }: {
  label: string; value: T; options: { value: T; label: string; icon?: ReactNode }[]; onChange: (value: T) => void; testId: string;
}) {
  return <div className="cz-segmented" role="radiogroup" aria-label={label}>
    {options.map(option => <button key={option.value} type="button" role="radio" aria-checked={value === option.value}
      className={`cz-pill${value === option.value ? ' active' : ''}`} onClick={() => onChange(option.value)} data-testid={`${testId}-${option.value}`}>
      {option.icon}{option.label}{value === option.value && <span className="cz-dot" />}
    </button>)}
  </div>;
}

function CzColorField({ label, hint, value, onChange, testId }: { label: string; hint: string; value: string; onChange: (v: string) => void; testId: string }) {
  const valid = /^#[0-9A-Fa-f]{6}$/.test(value);
  const swatch = valid ? value : '#c296ff';
  return <div className={`cz-color${valid ? '' : ' is-invalid'}`}>
    <label className="cz-color-swatch" style={{ '--swatch': swatch } as CSSProperties} title={`เลือกสี ${label}`}>
      <input type="color" value={swatch.toLowerCase()} onChange={e => onChange(e.target.value)} aria-label={`ตัวเลือกสี ${label}`} data-testid={`${testId}-picker`} />
    </label>
    <div className="cz-color-body">
      <label htmlFor={`${testId}-hex`}>{label}<small>{hint}</small></label>
      <input id={`${testId}-hex`} className="cz-hex" value={value} maxLength={7} spellCheck={false} autoComplete="off" aria-invalid={!valid}
        onChange={e => onChange(e.target.value.trim())} data-testid={`${testId}-hex`} />
      {!valid && <span className="cz-color-error" role="alert">ต้องเป็นรูปแบบ #RRGGBB</span>}
    </div>
  </div>;
}

function CzUploadBlock({ label, field, hasAsset, children, className = '', testId, onRemove }: {
  label: string; field: string; hasAsset: boolean; children?: ReactNode; className?: string; testId: string; onRemove?: () => void;
}) {
  return <div className={`cz-upload ${className}${hasAsset ? ' has-asset' : ''}`}>
    <label htmlFor={testId} className="cz-upload-target">
      <input id={testId} type="file" className="cz-visually-hidden" accept={uploadAccept[field]} aria-describedby={`${testId}-h ${testId}-s`}
        onChange={event => { event.currentTarget.value = ''; }} data-testid={testId} />
      {children && <div className="cz-upload-media">{children}</div>}
      <div className="cz-upload-copy"><span className="cz-upload-icon"><CloudUpload size={18} /></span><strong>{label}</strong>
        <small id={`${testId}-h`}>คลิกหรือลากไฟล์มาวาง · {uploadHints[field]}</small></div>
    </label>
    <div className="cz-upload-status" id={`${testId}-s`} role="status" aria-live="polite" />
    {hasAsset && onRemove && <button type="button" className="cz-remove" onClick={onRemove} data-testid={`${testId}-remove`}>นำออก</button>}
  </div>;
}

export function Current() {
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(old => ({ ...old, [key]: value }));
  const reset = () => setDraft(initialDraft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);

  return <div className="editor-frame">
    <aside className="editor-sidebar">
      <a href="#" className="brand" aria-label="gbloc"><span className="brand-mark">g</span>gbloc</a>
      <div className="sidebar-caption">พื้นที่จัดการ</div>
      <nav className="editor-nav" aria-label="เมนูหลัก">
        {[
          { path: '/customize', label: 'ปรับแต่งหน้า', icon: WandSparkles },
          { path: '/link', label: 'ลิงก์ของฉัน', icon: ChevronRight },
          { path: '/account', label: 'บัญชี', icon: ChevronRight },
          { path: '/price', label: 'แพ็กเกจ', icon: Sparkles },
        ].map(({ path, label, icon: Icon }) => <a href="#" key={path} className={`editor-nav-link${path === '/customize' ? ' active' : ''}`} aria-current={path === '/customize' ? 'page' : undefined}>
          <Icon size={17} />{label}{path === '/customize' && <span className="nav-dot" />}
        </a>)}
      </nav>
      <div className="sidebar-bottom"><a href="#" className="side-preview"><Eye size={16} />หน้าแรก gbloc</a><button className="side-logout" onClick={() => {}}><LogOut size={16} />ออกจากระบบ</button></div>
    </aside>
    <main className="editor-main">
      <div className="customize-page">
        <div className="cz-head">
          <div><span className="cz-eyebrow">01 / ตัวตนและหน้าตา</span><h1>ปรับแต่งหน้าโปรไฟล์</h1><p>ทุกอย่างเป็นฉบับร่างจนกว่าคุณจะกดบันทึก</p></div>
        </div>
        <div className="cz-savebar" role="region" aria-label="สถานะฉบับร่าง">
          <div className={`cz-state ${dirty ? 'is-dirty' : 'is-clean'}`} data-testid="status-draft" aria-live="polite">
            <span className="cz-state-dot" />{dirty ? 'ฉบับร่างยังไม่บันทึก · 1 รายการ' : 'ตรงกับที่บันทึกล่าสุด'}
          </div>
          <div className="cz-actions">
            <a href="#" target="_blank" rel="noopener noreferrer" className="cz-pill" data-testid="link-open-public-profile"><ExternalLink size={15} />เปิดหน้าสาธารณะ</a>
            <button type="button" className="cz-pill" onClick={reset} disabled={!dirty} data-testid="button-discard"><RotateCcw size={15} />ย้อนกลับ</button>
            <button type="button" className="cz-pill cz-save" onClick={() => {}} disabled={!dirty} data-testid="button-save-profile"><Save size={15} />บันทึก</button>
          </div>
        </div>
        <div className="cz-layout">
          <nav className="cz-rail" aria-label="หมวดการปรับแต่ง">
            {rail.map((item, i) => <a key={item.id} href={`#${item.id}`} className="cz-rail-link" data-testid={`link-section-${item.id}`}>
              <span>{String(i + 1).padStart(2, '0')}</span>{item.label}
            </a>)}
          </nav>
          <div className="cz-stack">
            <CzSection id="cz-identity" index="01" title="ข้อมูลแนะนำตัว" lede="ชื่อเด่นด้านบน ตามด้วยคำอธิบายรองใต้ชื่อ">
              <div className="cz-field">
                <label htmlFor="cz-username" className="cz-label">ชื่อผู้ใช้ <em>จำเป็น</em></label>
                <div className="cz-username tone-own"><span>example.com/@</span><input id="cz-username" value={draft.username} maxLength={20} autoComplete="off" spellCheck={false}
                  aria-invalid={false} aria-describedby="cz-username-help" onChange={e => set('username', e.target.value)} data-testid="input-username" /></div>
                <p id="cz-username-help" className="cz-help tone-own" role="status" data-testid="status-username">ชื่อผู้ใช้นี้เป็นของคุณ</p>
                <p className="cz-rule">3–20 ตัว ใช้ได้เฉพาะ a–z, 0–9 และ _ ลิงก์จะเป็นตัวพิมพ์เล็กเสมอ</p>
              </div>
              <div className="cz-field">
                <label htmlFor="cz-display" className="cz-label">Display Name <small>{draft.displayName.length}/32</small></label>
                <input id="cz-display" className="cz-input" maxLength={32} value={draft.displayName} onChange={e => set('displayName', e.target.value)} placeholder="ชื่อที่อยากให้คนจำ" data-testid="input-display-name" />
                <p className="cz-rule">ข้อความหลักตัวใหญ่บนโปรไฟล์ แสดงใต้รูปโปรไฟล์</p>
              </div>
              <div className="cz-field">
                <label htmlFor="cz-bio" className="cz-label">Description <small>{draft.bio.length}/120</small></label>
                <textarea id="cz-bio" className="cz-input cz-textarea" maxLength={120} value={draft.bio} onChange={e => set('bio', e.target.value)} placeholder="ประโยคสั้นๆ ใต้ชื่อ" data-testid="input-bio" />
                <p className="cz-rule">ข้อความรองที่แสดงใต้ Display Name</p>
              </div>
              <div className="cz-field">
                <label htmlFor="cz-location" className="cz-label">Location <small>ไม่บังคับ</small></label>
                <input id="cz-location" className="cz-input" maxLength={80} value={draft.location} onChange={e => set('location', e.target.value)} placeholder="เช่น waiting to play GTA6" data-testid="input-location" />
              </div>
            </CzSection>

            <CzSection id="cz-avatar" index="02" title="รูปโปรไฟล์" lede="ครอปรูปได้ทันที PNG โปร่งใสจะคงความโปร่งใสไว้">
              <CzSwitch label="แสดงรูปโปรไฟล์" description="ปิดเพื่อให้ Display Name เป็นจุดเด่นแทน" checked={draft.showAvatar} onChange={v => set('showAvatar', v)} testId="toggle-show-avatar" />
              <div className="cz-avatar-grid">
                <CzUploadBlock label="อัปโหลดรูปโปรไฟล์" field="avatarPath" hasAsset={!!draft.avatarPath} onRemove={() => set('avatarPath', null)} className="cz-upload-avatar" testId="input-avatar-upload">
                  <div className={`cz-avatar-crop${draft.avatarPath ? ' has-image' : ''}${draft.showAvatar ? '' : ' is-hidden'}`}>
                    {draft.avatarPath ? <img src={draft.avatarPath} alt="ครอปรูปโปรไฟล์" draggable={false} /> : <span>{(draft.displayName || draft.username || 'g').slice(0, 1)}</span>}
                  </div>
                </CzUploadBlock>
                <div className="cz-crop-controls">
                  <CzSlider label="ซูม" unit="%" min={100} max={300} value={draft.avatarZoom} onChange={v => set('avatarZoom', v)} disabled={!draft.avatarPath} testId="input-avatar-zoom" />
                  <CzSlider label="แนวนอน" min={0} max={100} value={draft.avatarX} onChange={v => set('avatarX', v)} disabled={!draft.avatarPath} testId="input-avatar-x" />
                  <CzSlider label="แนวตั้ง" min={0} max={100} value={draft.avatarY} onChange={v => set('avatarY', v)} disabled={!draft.avatarPath} testId="input-avatar-y" />
                  <button type="button" className="cz-ghost" disabled={!draft.avatarPath || (draft.avatarZoom === 100 && draft.avatarX === 50 && draft.avatarY === 50)}
                    onClick={() => { set('avatarZoom', 100); set('avatarX', 50); set('avatarY', 50); }} data-testid="button-reset-crop"><RotateCcw size={13} />รีเซ็ตการครอป</button>
                </div>
              </div>
            </CzSection>

            <CzSection id="cz-colors" index="03" title="สีของแต่ละส่วน" lede="เลือกจากจานสีหรือพิมพ์รหัส #RRGGBB เอง">
              <div className="cz-color-grid">{colorFields.map(field => <CzColorField key={field.key} label={field.label} hint={field.hint}
                value={draft[field.key as keyof Draft] as string} onChange={v => set(field.key as keyof Draft, v as never)} testId={`input-color-${field.key}`} />)}</div>
              <div className="cz-glow-control"><div className="cz-glow-heading"><strong>เรืองแสง</strong><span>ปรับความสว่างของแสงทุกจุดพร้อมกัน</span></div>
                <CzSlider label="ความสว่าง" min={0} max={100} value={draft.glowIntensity} onChange={v => set('glowIntensity', v)} testId="input-glow-intensity" />
              </div>
            </CzSection>

            <CzSection id="cz-frame" index="04" title="กรอบโปรไฟล์" lede="เปิดหรือปิดกรอบ เลือกสีเส้นขอบ และปรับความเบลอด้านหลังกรอบ">
              <CzSwitch label="แสดงกรอบโปรไฟล์" description="ครอบรูป ชื่อ คำอธิบาย ลิงก์ และเครื่องเล่นเสียง" checked={draft.showProfileFrame}
                onChange={value => set('showProfileFrame', value)} testId="toggle-profile-frame" />
              <div className="cz-frame-options">
                <div className="cz-frame-color-grid">
                  <CzColorField label="สีกรอบโปรไฟล์" hint="เส้นขอบกรอบ" value={draft.profileFrameColor} onChange={value => set('profileFrameColor', value)} testId="input-color-profile-frame" />
                  <CzColorField label="สีพื้นหลังกรอบ" hint="พื้นด้านในกรอบ" value={draft.profileFrameBackgroundColor} onChange={value => set('profileFrameBackgroundColor', value)} testId="input-color-profile-frame-background" />
                </div>
                <CzSlider label="ความเบลอพื้นหลังกรอบ" min={0} max={20} unit="px" value={draft.profileFrameBlur}
                  onChange={value => set('profileFrameBlur', value)} disabled={!draft.showProfileFrame} testId="input-profile-frame-blur" />
              </div>
            </CzSection>

            <CzSection id="cz-background" index="05" title="ฉากหลัง" lede="ภาพนิ่งหรือวิดีโอ ปรับจุดโฟกัสและเอฟเฟกต์">
              <CzUploadBlock label="อัปโหลดฉากหลัง" field="backgroundPath" hasAsset={!!draft.backgroundPath} onRemove={() => { set('backgroundPath', null); set('backgroundType', null); }} className="cz-upload-bg" testId="input-background-upload">
                <div className="cz-bg-preview" style={{ backgroundColor: draft.backgroundColor.match(/^#[0-9A-Fa-f]{6}$/) ? draft.backgroundColor : undefined }}>
                  {draft.backgroundPath && draft.backgroundType === 'video' ? <video src={draft.backgroundPath} muted autoPlay loop playsInline />
                    : draft.backgroundPath ? <img src={draft.backgroundPath} alt="ตัวอย่างฉากหลัง" /> : null}
                  {draft.backgroundEffect === 'black' && <div className="cz-bg-dim" style={{ opacity: draft.dimOpacity / 100 }} />}
                  {draft.backgroundPath && <span className="cz-focus-dot" style={{ left: `${draft.focusX}%`, top: `${draft.focusY}%` }} aria-hidden="true" />}
                </div>
              </CzUploadBlock>
              <div className="cz-row-label">เอฟเฟกต์ฉากหลัง</div>
              <CzSegmented label="เอฟเฟกต์ฉากหลัง" value={draft.backgroundEffect} onChange={v => set('backgroundEffect', v)} testId="button-effect"
                options={[{ value: 'black', label: 'ทับสีดำ', icon: <Moon size={14} /> }, { value: 'blur', label: 'เบลอ', icon: <Droplets size={14} /> }]} />
              <div className="cz-slider-stack">
                <CzSlider label={draft.backgroundEffect === 'blur' ? `ความเบลอ (สูงสุด 20px · ตอนนี้ ${((draft.dimOpacity / 100) * 20).toFixed(1)}px)` : 'ความเข้มของสีดำ'}
                  min={0} max={100} value={draft.dimOpacity} onChange={v => set('dimOpacity', v)} testId="input-dim-opacity" />
                <CzSlider label="จุดโฟกัสแนวนอน" min={0} max={100} value={draft.focusX} onChange={v => set('focusX', v)} disabled={!draft.backgroundPath} testId="input-focus-x" />
                <CzSlider label="จุดโฟกัสแนวตั้ง" min={0} max={100} value={draft.focusY} onChange={v => set('focusY', v)} disabled={!draft.backgroundPath} testId="input-focus-y" />
              </div>
            </CzSection>

            <CzSection id="cz-visuals" index="06" title="ฉากหลัง ฟอนต์ และเอฟเฟกต์" lede="เลือกสไตล์แล้วบันทึกลงโปรไฟล์ได้เมื่อมีสมาชิก Basic หรือ Pro">
              <div className="cz-basic-preview-note">
                <span className="cz-basic-preview-tag"><Sparkles size={13} /> BASIC · พรีวิว</span>
                <p>ทุกคนทดลองพรีวิวได้ การบันทึกสไตล์ต้องมีสมาชิก Basic หรือ Pro</p>
              </div>
              <div className="cz-premium-control">
                <div className="cz-premium-label"><strong>ฉากหลังเสริม</strong><small>เพิ่มบรรยากาศทับฉากหลังปัจจุบัน</small></div>
                <CzSegmented label="ฉากหลังเสริม" value={draft.premiumBackground} onChange={value => set('premiumBackground', value)} testId="premium-background"
                  options={[{ value: 'none', label: 'ไม่มี' }, { value: 'aurora', label: 'ออโรรา' }, { value: 'stars', label: 'ดวงดาว' }, { value: 'rain', label: 'ฝน' }, { value: 'film', label: 'ฟิล์ม' }]} />
                <CzSlider label="ความเข้มของฉากหลังเสริม" min={0} max={100} value={draft.premiumBackgroundStrength}
                  onChange={value => set('premiumBackgroundStrength', value)} disabled={draft.premiumBackground === 'none'} testId="premium-background-strength" />
              </div>
              <CzSwitch label="แสดงเครื่องหมาย Pro หลังชื่อ" description="ใช้ได้เมื่อบัญชีมีสมาชิก Pro ที่ยังไม่หมดอายุ"
                checked={draft.showProBadge} onChange={value => set('showProBadge', value)} disabled testId="toggle-pro-badge" />
              <CzSwitch label="แสดง “สร้างพื้นที่ของคุณด้วย GBLOC” ด้านล่าง"
                description="สมาชิก Basic หรือ Pro ซ่อนข้อความนี้ได้ โดยระบบยังเก็บการตั้งค่าไว้"
                checked={draft.showCredit} onChange={value => set('showCredit', value)} disabled testId="toggle-show-credit" />
              <div className="cz-premium-control">
                <div className="cz-premium-label"><strong><Type size={14} /> ฟอนต์</strong><small>เลือกแบบอักษรสำหรับเนื้อหาโปรไฟล์</small></div>
                <CzSegmented label="ฟอนต์โปรไฟล์" value={draft.premiumFont} onChange={value => set('premiumFont', value)} testId="premium-font"
                  options={[{ value: 'default', label: 'เดิม' }, { value: 'prompt', label: 'Prompt' }, { value: 'kanit', label: 'Kanit' }, { value: 'chakra', label: 'Chakra' }, { value: 'ibm-plex', label: 'IBM Plex Thai' }, { value: 'mitr', label: 'Mitr' }]} />
              </div>
              <div className="cz-premium-control">
                <div className="cz-premium-label"><strong>เอฟเฟกต์ชื่อ</strong><small>มีผลกับ Display Name ในตัวอย่าง</small></div>
                <CzSegmented label="เอฟเฟกต์ชื่อ" value={draft.premiumTextEffect} onChange={value => set('premiumTextEffect', value)} testId="premium-text-effect"
                  options={[{ value: 'none', label: 'ไม่มี' }, { value: 'glow', label: 'เรืองแสง' }, { value: 'gradient', label: 'ไล่สี' }, { value: 'fuzzy', label: 'Fuzzy' }]} />
              </div>
              <div className="cz-visual-sample" data-premium-background={draft.premiumBackground} data-premium-font={draft.premiumFont}
                data-premium-text={draft.premiumTextEffect} style={{ '--premium-background-strength': draft.premiumBackgroundStrength / 100 } as CSSProperties}>
                <span className="cz-visual-sample-kicker">GBLOC / YOUR VIBE</span>
                <strong className="cz-visual-sample-name">{draft.displayName || 'ชื่อของคุณ'}</strong>
                <small>{draft.bio || 'พื้นที่เล็ก ๆ ที่เล่าเรื่องของคุณ'}</small><span className="cz-visual-sample-stamp">BASIC STYLE</span>
              </div>
              <div className="cz-premium-upload">
                <label htmlFor="premium-background-file" className="cz-premium-file">
                  <input id="premium-background-file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={() => {}} data-testid="premium-background-file" />
                  <span><strong>ทดลองไฟล์ฉากหลังขนาดใหญ่</strong><small>ภาพไม่เกิน 10 MB · วิดีโอไม่เกิน 20 MB</small></span>
                </label>
                <p className="cz-premium-local-note">ไฟล์นี้แสดงตัวอย่างในเบราว์เซอร์เท่านั้น ยังไม่อัปโหลดหรือบันทึก</p>
              </div>
              <div className="cz-premium-actions">
                <button type="button" className="cz-pill cz-premium-save-locked" disabled aria-disabled="true" onClick={() => {}} data-testid="button-save-basic-style">
                  <LockKeyhole size={14} />บันทึกหลังได้รับสมาชิก
                </button>
                <button type="button" className="cz-pill active" onClick={() => {}} data-testid="button-preview-basic-style"><Eye size={14} />ดูพรีวิวเต็ม</button>
              </div>
            </CzSection>

            <CzSection id="cz-music" index="07" title="เสียงและหน้าต้อนรับ" lede="ผู้เข้าชมกดเข้าแล้วเสียงจะเริ่มเล่น">
              <div className="cz-music-playlist">
                <div className="cz-music-playlist-head"><strong>เสียงในโปรไฟล์</strong><span>Basic เพิ่มเสียงได้ 1 รายการ · Pro เพิ่มเสียงได้สูงสุด 4 รายการ</span></div>
                <div className="cz-playlist-track">
                  <span className="cz-playlist-number">01</span>
                  <div className="cz-playlist-track-body">
                    <div className="cz-music-grid">
                      <CzUploadBlock label="อัปโหลดเสียง" field="audioPath" hasAsset={!!draft.audioPath} onRemove={() => set('audioPath', null)} className="cz-upload-audio" testId="input-audio-upload">
                        <div className={`cz-track${draft.audioPath ? ' has-audio' : ''}`}><Music2 size={18} /><span>{draft.audioTitle || (draft.audioPath ? 'มีเสียงประกอบแล้ว' : 'ยังไม่มีเสียง')}</span>
                          {draft.audioPath && <i className="cz-eq" aria-hidden="true"><b /><b /><b /></i>}</div>
                      </CzUploadBlock>
                      <CzUploadBlock label="อัปโหลดภาพปก" field="audioCoverPath" hasAsset={!!draft.audioCoverPath} onRemove={() => set('audioCoverPath', null)} className="cz-upload-cover" testId="input-audio-cover-upload">
                        <div className={`cz-cover${draft.audioCoverPath ? ' has-image' : ''}`}>{draft.audioCoverPath ? <img src={draft.audioCoverPath} alt="ภาพปกไฟล์เสียง" /> : <Music2 size={20} />}</div>
                      </CzUploadBlock>
                    </div>
                    <div className="cz-field">
                      <label htmlFor="cz-audio-title" className="cz-label">ชื่อไฟล์เสียง <small>{draft.audioTitle.length}/80</small></label>
                      <input id="cz-audio-title" className="cz-input" maxLength={80} value={draft.audioTitle} onChange={e => set('audioTitle', e.target.value)} placeholder="เช่น just listen..." data-testid="input-audio-title" />
                    </div>
                  </div>
                </div>
                {[0, 1, 2].map(index => <div className="cz-pro-track is-locked" key={`audioPath${index + 2}`}>
                  <span className="cz-playlist-number">{String(index + 2).padStart(2, '0')}</span>
                  <strong>เสียงรายการที่ {index + 2} · Pro</strong><p>ปลดล็อกด้วย Pro เพื่ออัปโหลดและจัดการเสียงนี้</p>
                </div>)}
              </div>
              <CzSwitch label="แสดงแถบเครื่องเล่นเสียง" description="ปิดได้ เสียงยังเล่นต่อหลังกดเข้า" checked={draft.showMusicPlayer} onChange={v => set('showMusicPlayer', v)} testId="toggle-show-music-player" />
              <CzSwitch label="แสดงปุ่มปรับระดับเสียง" description="ซ่อนได้โดยเสียงยังเล่นตามปกติ" checked={draft.showVolumeControl} onChange={v => set('showVolumeControl', v)} testId="toggle-show-volume-control" />
              {draft.showMusicPlayer && <CzSlider label={`ระดับเสียง · ${draft.musicVolume}%`} min={0} max={100} value={draft.musicVolume} onChange={v => set('musicVolume', v)} testId="input-music-volume" />}
              <CzSwitch label="แสดงยอดเข้าชม" checked={draft.showViews} onChange={v => set('showViews', v)} testId="toggle-show-views" />
              <div className="cz-field">
                <label htmlFor="cz-enter" className="cz-label">ข้อความบนหน้ากดเข้า <small>{draft.enterText.length}/40</small></label>
                <input id="cz-enter" className="cz-input" maxLength={40} value={draft.enterText} onChange={e => set('enterText', e.target.value)} placeholder="Click to Enter" data-testid="input-enter-text" />
              </div>
            </CzSection>
          </div>
        </div>
      </div>
    </main>
  </div>;
}
