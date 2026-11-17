import { useId, useState, type CSSProperties, type Ref } from 'react';
import { BadgeCheck, Eye, LockKeyhole, Sparkles, Type, X } from 'lucide-react';
import { CzSection, CzSegmented, CzSlider, CzSwitch } from './controls';
import type { Draft } from './draft';
import type { LocalBackgroundPreview, PremiumVisualPreview } from './premium-visuals';
import { RandomRain } from '@/components/random-rain';
import { RandomAurora } from '@/components/random-aurora';
import { RandomStars, ShootingStars } from '@/components/shooting-stars';
import { useProfileFont } from '@/hooks/use-profile-font';

const MiB = 1024 * 1024;

function getBackgroundKind(file: File): 'image' | 'video' | null {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (file.type) {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'image';
    if (['video/mp4', 'video/webm'].includes(file.type)) return 'video';
    return null;
  }
  if (['jpg', 'jpeg', 'png', 'webp'].includes(extension ?? '')) return 'image';
  if (['mp4', 'webm'].includes(extension ?? '')) return 'video';
  return null;
}

export function PremiumVisualSection({
  draft, style, onStyleChange, backgroundPreview, onBackgroundFileChange, onPreview,
  isBasicActive, isProActive, onSave, previewButtonRef,
}: {
  draft: Draft;
  style: PremiumVisualPreview;
  onStyleChange: (next: PremiumVisualPreview) => void;
  backgroundPreview: LocalBackgroundPreview | null;
  onBackgroundFileChange: (file: File | null) => void;
  onPreview: () => void;
  isBasicActive: boolean;
  isProActive: boolean;
  onSave: () => void;
  previewButtonRef: Ref<HTMLButtonElement>;
}) {
  const inputId = useId();
  useProfileFont(style.font);
  const [fileError, setFileError] = useState('');
  const setStyle = <K extends keyof PremiumVisualPreview>(key: K, value: PremiumVisualPreview[K]) =>
    onStyleChange({ ...style, [key]: value });

  function chooseBackground(file: File | undefined) {
    if (!file) return;
    const kind = getBackgroundKind(file);
    if (!kind) {
      setFileError('รองรับภาพ JPEG, PNG, WebP หรือวิดีโอ MP4, WebM');
      return;
    }
    const limit = (kind === 'image' ? 10 : 20) * MiB;
    if (file.size > limit) {
      setFileError(`ไฟล์${kind === 'image' ? 'ภาพ' : 'วิดีโอ'}ใหญ่เกิน ${kind === 'image' ? 10 : 20} MB`);
      return;
    }
    setFileError('');
    onBackgroundFileChange(file);
  }

  const sampleStyle = {
    '--premium-background-strength': style.backgroundStrength / 100,
  } as CSSProperties;

  return <CzSection id="cz-visuals" index="06" title="ฉากหลัง ฟอนต์ และเอฟเฟกต์" lede="เลือกสไตล์แล้วบันทึกลงโปรไฟล์ได้เมื่อมีสมาชิก Basic หรือ Pro">
    <div className="cz-basic-preview-note">
      <span className="cz-basic-preview-tag"><Sparkles size={13} /> {isProActive ? 'PRO' : isBasicActive ? 'BASIC' : 'BASIC · พรีวิว'}</span>
      <p>{isBasicActive ? 'สมาชิกของคุณใช้งานฉากหลังเสริม ฟอนต์ และเอฟเฟกต์ชื่อได้'
        : 'ทุกคนทดลองพรีวิวได้ การบันทึกสไตล์ต้องมีสมาชิก Basic หรือ Pro'}</p>
    </div>

    <div className="cz-premium-control">
      <div className="cz-premium-label"><strong>ฉากหลังเสริม</strong><small>เพิ่มบรรยากาศทับฉากหลังปัจจุบัน</small></div>
      <CzSegmented label="ฉากหลังเสริม" value={style.background} onChange={value => setStyle('background', value)} testId="premium-background"
        options={[
          { value: 'none', label: 'ไม่มี' }, { value: 'aurora', label: 'ออโรรา' }, { value: 'stars', label: 'ดวงดาว' },
          { value: 'rain', label: 'ฝน' }, { value: 'film', label: 'ฟิล์ม' },
        ]} />
      <CzSlider label="ความเข้มของฉากหลังเสริม" min={0} max={100} value={style.backgroundStrength}
        onChange={value => setStyle('backgroundStrength', value)} disabled={style.background === 'none'} testId="premium-background-strength" />
    </div>

    <CzSwitch label="แสดงเครื่องหมาย Pro หลังชื่อ" description="ใช้ได้เมื่อบัญชีมีสมาชิก Pro ที่ยังไม่หมดอายุ"
      checked={style.showProBadge} onChange={value => setStyle('showProBadge', value)}
      disabled={!isProActive} testId="toggle-pro-badge" />
    <CzSwitch label="แสดง “สร้างพื้นที่ของคุณด้วย GBLOC” ด้านล่าง"
      description="สมาชิก Basic หรือ Pro ซ่อนข้อความนี้ได้ โดยระบบยังเก็บการตั้งค่าไว้"
      checked={style.showCredit} onChange={value => setStyle('showCredit', value)}
      disabled={!isBasicActive} testId="toggle-show-credit" />
    <div className="cz-premium-control">
      <div className="cz-premium-label"><strong><Type size={14} /> ฟอนต์</strong><small>เลือกแบบอักษรสำหรับเนื้อหาโปรไฟล์</small></div>
      <CzSegmented label="ฟอนต์โปรไฟล์" value={style.font} onChange={value => setStyle('font', value)} testId="premium-font"
        options={[
          { value: 'default', label: 'เดิม' }, { value: 'prompt', label: 'Prompt' },
          { value: 'kanit', label: 'Kanit' }, { value: 'chakra', label: 'Chakra' },
          { value: 'ibm-plex', label: 'IBM Plex Thai' }, { value: 'mitr', label: 'Mitr' },
        ]} />
    </div>

    <div className="cz-premium-control">
      <div className="cz-premium-label"><strong>เอฟเฟกต์ชื่อ</strong><small>มีผลกับ Display Name ในตัวอย่าง</small></div>
      <CzSegmented label="เอฟเฟกต์ชื่อ" value={style.textEffect} onChange={value => setStyle('textEffect', value)} testId="premium-text-effect"
        options={[
          { value: 'none', label: 'ไม่มี' }, { value: 'glow', label: 'เรืองแสง' },
          { value: 'gradient', label: 'ไล่สี' }, { value: 'fuzzy', label: 'Fuzzy' },
        ]} />
    </div>

    <div className={`cz-visual-sample${style.background !== 'none' ? ` has-${style.background}` : ''}${backgroundPreview ? ' has-local-background' : ''}`}
      data-premium-background={style.background} data-premium-font={style.font} data-premium-text={style.textEffect} style={sampleStyle}>
      {backgroundPreview?.type === 'image' && <img className="cz-visual-sample-media" src={backgroundPreview.url} alt="" aria-hidden="true" />}
      {backgroundPreview?.type === 'video' && <video className="cz-visual-sample-media" src={backgroundPreview.url} muted autoPlay loop playsInline aria-hidden="true" />}
      {style.background === 'aurora' && <RandomAurora className="cz-random-aurora" />}
      {style.background === 'rain' && <RandomRain className="cz-random-rain" />}
      {style.background === 'stars' && <RandomStars className="cz-random-stars" />}
      <ShootingStars className="cz-shooting-stars" />
      <span className="cz-visual-sample-kicker">GBLOC / YOUR VIBE</span>
      <strong className="cz-visual-sample-name">{draft.displayName || 'ชื่อของคุณ'}</strong>
      <small>{draft.bio || 'พื้นที่เล็ก ๆ ที่เล่าเรื่องของคุณ'}</small>
      <span className="cz-visual-sample-stamp">BASIC STYLE</span>
    </div>

    <div className="cz-premium-upload">
      <label htmlFor={inputId} className="cz-premium-file">
        <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          onChange={event => { chooseBackground(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }}
          data-testid="premium-background-file" />
        <span><strong>{backgroundPreview ? 'เปลี่ยนไฟล์ฉากหลังตัวอย่าง' : 'ทดลองไฟล์ฉากหลังขนาดใหญ่'}</strong>
          <small>ภาพไม่เกิน 10 MB · วิดีโอไม่เกิน 20 MB</small></span>
        {backgroundPreview && <span className="cz-premium-file-name">{backgroundPreview.name}</span>}
      </label>
      {backgroundPreview && <button type="button" className="cz-premium-clear" onClick={() => { onBackgroundFileChange(null); setFileError(''); }}
        aria-label="นำไฟล์ฉากหลังตัวอย่างออก" data-testid="button-clear-premium-background"><X size={14} />นำออก</button>}
      {fileError && <p className="cz-premium-file-error" role="alert">{fileError}</p>}
      <p className="cz-premium-local-note">ไฟล์นี้แสดงตัวอย่างในเบราว์เซอร์เท่านั้น ยังไม่อัปโหลดหรือบันทึก</p>
    </div>

    <div className="cz-premium-actions">
      <button type="button" className={`cz-pill${isBasicActive ? ' active' : ' cz-premium-save-locked'}`}
        disabled={!isBasicActive} aria-disabled={!isBasicActive} onClick={onSave} data-testid="button-save-basic-style">
        {isBasicActive ? <Sparkles size={14} /> : <LockKeyhole size={14} />}
        {isBasicActive ? 'บันทึกสไตล์' : 'บันทึกหลังได้รับสมาชิก'}
      </button>
      <button ref={previewButtonRef} type="button" className="cz-pill active" onClick={onPreview} data-testid="button-preview-basic-style"><Eye size={14} />ดูพรีวิวเต็ม</button>
    </div>
  </CzSection>;
}
