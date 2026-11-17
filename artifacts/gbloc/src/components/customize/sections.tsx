import type { CSSProperties } from 'react';
import { Droplets, Moon, Music2, RotateCcw } from 'lucide-react';
import type { Profile } from '@workspace/api-client-react';
import { objectUrl } from '@/components/gbloc-shared';
import { avatarImageStyle } from '@/components/profile-appearance';
import { CzColorField, CzSection, CzSegmented, CzSlider, CzSwitch, CzUploadBlock } from './controls';
import { colorFields, profileFrameBackgroundColorField, profileFrameColorField, type Draft } from './draft';
import { assetAccept, assetHint, type AssetField, type UploadState } from './use-asset-uploads';

export type SetField = <K extends keyof Draft>(key: K, value: Draft[K]) => void;
type Uploads = { states: Record<AssetField, UploadState>; start: (f: AssetField, file: File) => void; clear: (f: AssetField) => void };
export type SectionProps = { draft: Draft; baseline: Draft; set: SetField; uploads: Uploads; preview: Profile };

export type UsernameStatus = { tone: 'own' | 'ok' | 'bad' | 'pending' | 'warn'; text: string };

export function IdentitySection({ draft, set, usernameStatus, onRetryUsername }: SectionProps & { usernameStatus: UsernameStatus; onRetryUsername: () => void }) {
  return <CzSection id="cz-identity" index="01" title="ข้อมูลแนะนำตัว" lede="ชื่อเด่นด้านบน ตามด้วยคำอธิบายรองใต้ชื่อ">
    <div className="cz-field">
      <label htmlFor="cz-username" className="cz-label">ชื่อผู้ใช้ <em>จำเป็น</em></label>
      <div className={`cz-username tone-${usernameStatus.tone}`}><span>{window.location.host}/@</span>
        <input id="cz-username" value={draft.username} maxLength={20} autoComplete="off" spellCheck={false} aria-invalid={usernameStatus.tone === 'bad'}
          aria-describedby="cz-username-help" onChange={e => set('username', e.target.value)} data-testid="input-username" /></div>
      <p id="cz-username-help" className={`cz-help tone-${usernameStatus.tone}`} role="status" data-testid="status-username">
        {usernameStatus.text}
        {usernameStatus.tone === 'warn' && <button type="button" className="cz-inline-link" onClick={onRetryUsername} data-testid="button-retry-username">ลองตรวจอีกครั้ง</button>}
      </p>
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
  </CzSection>;
}

export function AvatarSection({ draft, set, uploads, preview }: SectionProps) {
  const initial = (draft.displayName || draft.username || 'g').slice(0, 1);
  const hasImg = !!draft.avatarPath;
  return <CzSection id="cz-avatar" index="02" title="รูปโปรไฟล์" lede="ครอปรูปได้ทันที PNG โปร่งใสจะคงความโปร่งใสไว้">
    <CzSwitch label="แสดงรูปโปรไฟล์" description="ปิดเพื่อให้ Display Name เป็นจุดเด่นแทน" checked={draft.showAvatar} onChange={v => set('showAvatar', v)} testId="toggle-show-avatar" />
    <div className="cz-avatar-grid">
      <CzUploadBlock label="อัปโหลดรูปโปรไฟล์" hint={assetHint.avatarPath} accept={assetAccept.avatarPath} state={uploads.states.avatarPath}
        onFile={f => uploads.start('avatarPath', f)} hasAsset={hasImg} removeLabel="นำรูปออก" onRemove={() => { uploads.clear('avatarPath'); set('avatarPath', null); }}
        className="cz-upload-avatar" testId="input-avatar-upload">
        <div className={`cz-avatar-crop${hasImg ? ' has-image' : ''}${draft.showAvatar ? '' : ' is-hidden'}`}>
          {hasImg ? <img src={objectUrl(draft.avatarPath)} alt="ครอปรูปโปรไฟล์" style={avatarImageStyle(preview)} draggable={false} data-testid="img-avatar-crop" /> : <span>{initial}</span>}
        </div>
      </CzUploadBlock>
      <div className="cz-crop-controls">
        <CzSlider label="ซูม" unit="%" min={100} max={300} value={draft.avatarZoom} onChange={v => set('avatarZoom', v)} disabled={!hasImg} testId="input-avatar-zoom" />
        <CzSlider label="แนวนอน" min={0} max={100} value={draft.avatarX} onChange={v => set('avatarX', v)} disabled={!hasImg} testId="input-avatar-x" />
        <CzSlider label="แนวตั้ง" min={0} max={100} value={draft.avatarY} onChange={v => set('avatarY', v)} disabled={!hasImg} testId="input-avatar-y" />
        <button type="button" className="cz-ghost" disabled={!hasImg || (draft.avatarZoom === 100 && draft.avatarX === 50 && draft.avatarY === 50)}
          onClick={() => { set('avatarZoom', 100); set('avatarX', 50); set('avatarY', 50); }} data-testid="button-reset-crop"><RotateCcw size={13} />รีเซ็ตการครอป</button>
      </div>
    </div>
  </CzSection>;
}

export function ColorsSection({ draft, baseline, set }: SectionProps) {
  return <CzSection id="cz-colors" index="03" title="สีของแต่ละส่วน" lede="เลือกจากจานสีหรือพิมพ์รหัส #RRGGBB เอง">
    <div className="cz-color-grid">
      {colorFields.map(c => <CzColorField key={c.key} label={c.label} hint={c.hint} value={draft[c.key]} fallback={baseline[c.key]}
        onChange={v => set(c.key, v)} testId={`input-color-${c.key}`} />)}
    </div>
    <div className="cz-glow-control">
      <div className="cz-glow-heading"><strong>เรืองแสง</strong><span>ปรับความสว่างของแสงทุกจุดพร้อมกัน</span></div>
      <CzSlider label="ความสว่าง" min={0} max={100} value={draft.glowIntensity} onChange={v => set('glowIntensity', v)} testId="input-glow-intensity" />
    </div>
  </CzSection>;
}

export function ProfileFrameSection({ draft, baseline, set }: SectionProps) {
  return <CzSection id="cz-frame" index="04" title="กรอบโปรไฟล์" lede="เปิดหรือปิดกรอบ เลือกสีเส้นขอบ และปรับความเบลอด้านหลังกรอบ">
    <CzSwitch label="แสดงกรอบโปรไฟล์" description="ครอบรูป ชื่อ คำอธิบาย ลิงก์ และเครื่องเล่นเสียง" checked={draft.showProfileFrame}
      onChange={value => set('showProfileFrame', value)} testId="toggle-profile-frame" />
    <div className="cz-frame-options">
      <div className="cz-frame-color-grid">
        <CzColorField label={profileFrameColorField.label} hint={profileFrameColorField.hint}
          value={draft.profileFrameColor} fallback={baseline.profileFrameColor}
          onChange={value => set('profileFrameColor', value)} testId="input-color-profile-frame" />
        <CzColorField label={profileFrameBackgroundColorField.label} hint={profileFrameBackgroundColorField.hint}
          value={draft.profileFrameBackgroundColor} fallback={baseline.profileFrameBackgroundColor}
          onChange={value => set('profileFrameBackgroundColor', value)} testId="input-color-profile-frame-background" />
      </div>
      <CzSlider label="ความเบลอพื้นหลังกรอบ" min={0} max={20} unit="px" value={draft.profileFrameBlur}
        onChange={value => set('profileFrameBlur', value)} disabled={!draft.showProfileFrame} testId="input-profile-frame-blur" />
    </div>
  </CzSection>;
}

export function BackgroundSection({ draft, set, uploads }: SectionProps) {
  const dim = draft.dimOpacity / 100;
  const media = draft.backgroundPath;
  const mediaStyle: CSSProperties = { objectPosition: `${draft.focusX}% ${draft.focusY}%`, filter: draft.backgroundEffect === 'blur' ? `blur(${(dim * 20).toFixed(1)}px)` : undefined };
  return <CzSection id="cz-background" index="05" title="ฉากหลัง" lede="ภาพนิ่งหรือวิดีโอ ปรับจุดโฟกัสและเอฟเฟกต์">
    <CzUploadBlock label="อัปโหลดฉากหลัง" hint={assetHint.backgroundPath} accept={assetAccept.backgroundPath} state={uploads.states.backgroundPath}
      onFile={f => uploads.start('backgroundPath', f)} hasAsset={!!media} removeLabel="นำฉากหลังออก"
      onRemove={() => { uploads.clear('backgroundPath'); set('backgroundPath', null); set('backgroundType', null); }} className="cz-upload-bg" testId="input-background-upload">
      <div className="cz-bg-preview" style={{ backgroundColor: draft.backgroundColor.match(/^#[0-9A-Fa-f]{6}$/) ? draft.backgroundColor : undefined }}>
        {media && draft.backgroundType === 'video' ? <video src={objectUrl(media)} muted autoPlay loop playsInline style={mediaStyle} />
          : media ? <img src={objectUrl(media)} alt="ตัวอย่างฉากหลัง" style={mediaStyle} /> : null}
        {draft.backgroundEffect === 'black' && <div className="cz-bg-dim" style={{ opacity: dim }} />}
        {media && <span className="cz-focus-dot" style={{ left: `${draft.focusX}%`, top: `${draft.focusY}%` }} aria-hidden="true" />}
      </div>
    </CzUploadBlock>
    <div className="cz-row-label">เอฟเฟกต์ฉากหลัง</div>
    <CzSegmented label="เอฟเฟกต์ฉากหลัง" value={draft.backgroundEffect} onChange={v => set('backgroundEffect', v)} testId="button-effect"
      options={[{ value: 'black', label: 'ทับสีดำ', icon: <Moon size={14} /> }, { value: 'blur', label: 'เบลอ', icon: <Droplets size={14} /> }]} />
    <div className="cz-slider-stack">
      <CzSlider label={draft.backgroundEffect === 'blur' ? `ความเบลอ (สูงสุด 20px · ตอนนี้ ${(dim * 20).toFixed(1)}px)` : 'ความเข้มของสีดำ'} min={0} max={100} value={draft.dimOpacity} onChange={v => set('dimOpacity', v)} testId="input-dim-opacity" />
      <CzSlider label="จุดโฟกัสแนวนอน" min={0} max={100} value={draft.focusX} onChange={v => set('focusX', v)} disabled={!media} testId="input-focus-x" />
      <CzSlider label="จุดโฟกัสแนวตั้ง" min={0} max={100} value={draft.focusY} onChange={v => set('focusY', v)} disabled={!media} testId="input-focus-y" />
    </div>
  </CzSection>;
}

export function MusicSection({ draft, set, uploads, isProActive }: SectionProps & { isProActive: boolean }) {
  return <CzSection id="cz-music" index="07" title="เสียงและหน้าต้อนรับ" lede="ผู้เข้าชมกดเข้าแล้วเสียงจะเริ่มเล่น">
    <div className="cz-music-playlist">
      <div className="cz-music-playlist-head"><strong>เสียงในโปรไฟล์</strong><span>Basic เพิ่มเสียงได้ 1 รายการ · Pro เพิ่มเสียงได้สูงสุด 4 รายการ</span></div>
      <div className="cz-playlist-track">
        <span className="cz-playlist-number">01</span>
        <div className="cz-playlist-track-body">
          <div className="cz-music-grid">
            <CzUploadBlock label="อัปโหลดเสียง" hint={assetHint.audioPath} accept={assetAccept.audioPath} state={uploads.states.audioPath}
              onFile={f => uploads.start('audioPath', f)} hasAsset={!!draft.audioPath} removeLabel="นำเสียงออก" onRemove={() => { uploads.clear('audioPath'); set('audioPath', null); }}
              className="cz-upload-audio" testId="input-audio-upload">
              <div className={`cz-track${draft.audioPath ? ' has-audio' : ''}`}><Music2 size={18} /><span>{draft.audioPath ? (draft.audioTitle || 'มีเสียงประกอบแล้ว') : 'ยังไม่มีเสียง'}</span>
                {draft.audioPath && <i className="cz-eq" aria-hidden="true"><b /><b /><b /></i>}</div>
            </CzUploadBlock>
            <CzUploadBlock label="อัปโหลดภาพปก" hint={assetHint.audioCoverPath} accept={assetAccept.audioCoverPath} state={uploads.states.audioCoverPath}
              onFile={f => uploads.start('audioCoverPath', f)} hasAsset={!!draft.audioCoverPath} removeLabel="นำภาพปกออก" onRemove={() => { uploads.clear('audioCoverPath'); set('audioCoverPath', null); }}
              className="cz-upload-cover" testId="input-audio-cover-upload">
              <div className={`cz-cover${draft.audioCoverPath ? ' has-image' : ''}`}>{draft.audioCoverPath ? <img src={objectUrl(draft.audioCoverPath)} alt="ภาพปกไฟล์เสียง" /> : <Music2 size={20} />}</div>
            </CzUploadBlock>
          </div>
          <div className="cz-field">
            <label htmlFor="cz-audio-title" className="cz-label">ชื่อไฟล์เสียง <small>{draft.audioTitle.length}/80</small></label>
            <input id="cz-audio-title" className="cz-input" maxLength={80} value={draft.audioTitle} onChange={e => set('audioTitle', e.target.value)} placeholder="เช่น just listen..." data-testid="input-audio-title" />
          </div>
        </div>
      </div>
      {[0, 1, 2].map(index => {
        const field = `audioPath${index + 2}` as AssetField;
        const track = draft.extraAudioTracks[index] ?? { path: null, title: '' };
        return <div className={`cz-pro-track${isProActive ? '' : ' is-locked'}`} key={field}>
          <span className="cz-playlist-number">{String(index + 2).padStart(2, '0')}</span>
          <strong>เสียงรายการที่ {index + 2} · Pro</strong>
          {isProActive ? <>
            <div className="cz-playlist-track-body">
              <CzUploadBlock label={track.path ? 'เปลี่ยนไฟล์เสียง' : 'อัปโหลดเสียงเพิ่มเติม'} hint={assetHint[field]} accept={assetAccept[field]}
                state={uploads.states[field]} onFile={file => uploads.start(field, file)} hasAsset={!!track.path}
                removeLabel="นำเสียงออก" onRemove={() => { uploads.clear(field); set('extraAudioTracks', draft.extraAudioTracks.map((item, i) => i === index ? { ...item, path: null } : item)); }}
                className="cz-upload-audio" testId={`input-audio-upload-${index + 2}`}>
                <div className={`cz-track${track.path ? ' has-audio' : ''}`}><Music2 size={18} /><span>{track.title || (track.path ? 'มีเสียงประกอบแล้ว' : 'ยังไม่มีเสียง')}</span></div>
              </CzUploadBlock>
              <input className="cz-input" maxLength={80} value={track.title} onChange={event => {
                const next = [0, 1, 2].map(i => draft.extraAudioTracks[i] ?? { path: null, title: '' });
                next[index] = { ...next[index], title: event.target.value };
                set('extraAudioTracks', next);
              }} placeholder="ชื่อไฟล์เสียง (ไม่บังคับ)" aria-label={`ชื่อไฟล์เสียง ${index + 2}`} data-testid={`input-audio-title-${index + 2}`} />
            </div>
          </> : <p>ปลดล็อกด้วย Pro เพื่ออัปโหลดและจัดการเสียงนี้</p>}
        </div>;
      })}
    </div>
    <CzSwitch label="แสดงแถบเครื่องเล่นเสียง" description="ปิดได้ เสียงยังเล่นต่อหลังกดเข้า" checked={draft.showMusicPlayer} onChange={v => set('showMusicPlayer', v)} testId="toggle-show-music-player" />
    <CzSwitch label="แสดงปุ่มปรับระดับเสียง" description="ซ่อนได้โดยเสียงยังเล่นตามปกติ" checked={draft.showVolumeControl} onChange={v => set('showVolumeControl', v)} testId="toggle-show-volume-control" />
    {draft.showMusicPlayer && <CzSlider label={`ระดับเสียง · ${draft.musicVolume}%`} min={0} max={100} value={draft.musicVolume} onChange={v => set('musicVolume', v)} testId="input-music-volume" />}
    <CzSwitch label="แสดงยอดเข้าชม" checked={draft.showViews} onChange={v => set('showViews', v)} testId="toggle-show-views" />
    <div className="cz-field">
      <label htmlFor="cz-enter" className="cz-label">ข้อความบนหน้ากดเข้า <small>{draft.enterText.length}/40</small></label>
      <input id="cz-enter" className="cz-input" maxLength={40} value={draft.enterText} onChange={e => set('enterText', e.target.value)} placeholder="Click to Enter" data-testid="input-enter-text" />
    </div>
  </CzSection>;
}
