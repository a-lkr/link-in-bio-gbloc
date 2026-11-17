import { useState, type CSSProperties } from 'react';
import { DoorOpen, Monitor, Play, Smartphone } from 'lucide-react';
import type { Profile, ProfileLink } from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ProfileExperience } from '@/components/profile-experience';
import { CzSegmented } from './controls';
import type { PremiumVisualPreview } from './premium-visuals';

type Entry = 'before' | 'after';
type Size = 'desktop' | 'mobile';
// Instantiate outside JSX so development metadata injection cannot split the tag.
const EntrySegments = CzSegmented<Entry>;
const SizeSegments = CzSegmented<Size>;

export function PreviewDialog({
  open, onOpenChange, onRestoreFocus, profile, links, stylePreview, initiallyEntered = false,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onRestoreFocus: () => void;
  profile: Profile;
  links: ProfileLink[];
  stylePreview: PremiumVisualPreview;
  initiallyEntered?: boolean;
}) {
  const [entry, setEntry] = useState<Entry>(initiallyEntered ? 'after' : 'before');
  const [size, setSize] = useState<Size>('desktop');
  const frameStyle = { '--premium-background-strength': stylePreview.backgroundStrength / 100 } as CSSProperties;
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="cz-preview-dialog" data-testid="dialog-preview" onCloseAutoFocus={event => {
      event.preventDefault();
      window.requestAnimationFrame(onRestoreFocus);
    }}>
      <div className="cz-preview-bar">
        <div><DialogTitle className="cz-preview-title">ตัวอย่างหน้าโปรไฟล์</DialogTitle>
          <DialogDescription className="cz-preview-desc">แสดงจากฉบับร่างปัจจุบัน ยังไม่เผยแพร่จนกว่าจะบันทึก</DialogDescription></div>
        <div className="cz-preview-controls">
          <EntrySegments label="สถานะหน้ากดเข้า" value={entry} onChange={setEntry} testId="preview-entry"
            options={[{ value: 'before' as const, label: 'ก่อนกดเข้า', icon: <DoorOpen size={14} /> }, { value: 'after' as const, label: 'หลังกดเข้า', icon: <Play size={14} /> }]} />
          <SizeSegments label="ขนาดหน้าจอ" value={size} onChange={setSize} testId="preview-size"
            options={[{ value: 'desktop' as const, label: 'เดสก์ท็อป', icon: <Monitor size={14} /> }, { value: 'mobile' as const, label: 'มือถือ', icon: <Smartphone size={14} /> }]} />
        </div>
      </div>
      <div className="cz-preview-stage">
        <div className={`cz-preview-frame is-${size}`} data-premium-background={stylePreview.background}
          data-premium-font={stylePreview.font} data-premium-text={stylePreview.textEffect} style={frameStyle}>
          <ProfileExperience
            key={`${entry}-${size}`}
            profile={{ ...profile, showProBadge: stylePreview.showProBadge }}
            links={links}
            initiallyEntered={entry === 'after'}
            preview
            previewAurora={stylePreview.background === 'aurora'}
            previewStars={stylePreview.background === 'stars'}
            previewRain={stylePreview.background === 'rain'}
          />
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}
