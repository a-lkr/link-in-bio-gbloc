import { useId, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react';
import { AlertCircle, Check, ChevronDown, CloudUpload, LoaderCircle, Trash2 } from 'lucide-react';
import { hexRule } from './draft';
import type { UploadState } from './use-asset-uploads';

export function CzSection({ id, index, title, lede, children }: { id: string; index: string; title: string; lede: string; children: ReactNode }) {
  return <section className="cz-card" id={id} aria-labelledby={`${id}-title`}>
    <header className="cz-card-head"><span className="cz-index">{index}</span><div><h2 id={`${id}-title`}>{title}</h2><p>{lede}</p></div></header>
    {children}
  </section>;
}

export function CzGroup({ id, index, title, lede, expanded, onToggle, children }: {
  id: string; index: string; title: string; lede: string; expanded: boolean; onToggle: () => void; children: ReactNode;
}) {
  return <section className={`cz-group${expanded ? ' is-open' : ''}`} id={id}>
    <button type="button" className="cz-group-head" aria-expanded={expanded} aria-controls={`${id}-content`} onClick={onToggle}>
      <span className="cz-group-index">{index}</span>
      <span className="cz-group-title"><strong>{title}</strong><small>{lede}</small></span>
      <ChevronDown size={17} aria-hidden="true" />
    </button>
    {expanded && <div className="cz-group-content" id={`${id}-content`}>{children}</div>}
  </section>;
}

export function CzSwitch({ checked, onChange, label, description, disabled, testId }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean; testId: string }) {
  const id = useId();
  return <div className={`cz-switch-row${checked ? ' is-on' : ''}${disabled ? ' is-disabled' : ''}`}>
    <div className="cz-switch-copy"><span id={`${id}-l`}>{label}</span>{description && <small id={`${id}-d`}>{description}</small>}</div>
    <button type="button" role="switch" disabled={disabled} aria-checked={checked} aria-labelledby={`${id}-l`} aria-describedby={description ? `${id}-d` : undefined}
      className="cz-switch" onClick={() => onChange(!checked)} data-testid={testId}><span className="cz-switch-thumb" /></button>
  </div>;
}

export function CzSlider({ label, value, min, max, unit = '%', onChange, disabled, testId }: { label: string; value: number; min: number; max: number; unit?: string; onChange: (v: number) => void; disabled?: boolean; testId: string }) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return <div className={`cz-slider${disabled ? ' is-disabled' : ''}`}>
    <label htmlFor={id}><span>{label}</span><output htmlFor={id}>{value}{unit}</output></label>
    <input id={id} type="range" min={min} max={max} step={1} value={value} disabled={disabled}
      onChange={e => onChange(Math.round(Number(e.target.value)))} style={{ '--pct': `${pct}%` } as CSSProperties} data-testid={testId} />
  </div>;
}

export function CzSegmented<T extends string>({ label, value, options, onChange, testId }: { label: string; value: T; options: { value: T; label: string; icon?: ReactNode }[]; onChange: (v: T) => void; testId: string }) {
  return <div className="cz-segmented" role="radiogroup" aria-label={label}>
    {options.map(o => <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={`cz-pill${value === o.value ? ' active' : ''}`}
      onClick={() => onChange(o.value)} data-testid={`${testId}-${o.value}`}>{o.icon}{o.label}{value === o.value && <span className="cz-dot" />}</button>)}
  </div>;
}

export function CzColorField({ label, hint, value, fallback, onChange, testId }: { label: string; hint: string; value: string; fallback: string; onChange: (v: string) => void; testId: string }) {
  const id = useId();
  const valid = hexRule.test(value);
  const swatch = valid ? value : fallback;
  return <div className={`cz-color${valid ? '' : ' is-invalid'}`}>
    <label className="cz-color-swatch" style={{ '--swatch': swatch } as CSSProperties} title={`เลือกสี ${label}`}>
      <input type="color" value={swatch.toLowerCase()} onChange={e => onChange(e.target.value)} aria-label={`ตัวเลือกสี ${label}`} data-testid={`${testId}-picker`} />
    </label>
    <div className="cz-color-body">
      <label htmlFor={id}>{label}<small>{hint}</small></label>
      <input id={id} className="cz-hex" value={value} maxLength={7} spellCheck={false} autoComplete="off" aria-invalid={!valid} aria-describedby={valid ? undefined : `${id}-e`}
        onChange={e => onChange(e.target.value.trim())} data-testid={`${testId}-hex`} />
      {!valid && <span className="cz-color-error" id={`${id}-e`} role="alert">ต้องเป็นรูปแบบ #RRGGBB</span>}
    </div>
  </div>;
}

const phaseLabel = (s: UploadState) => {
  if (s.phase === 'signing') return 'กำลังขอสิทธิ์อัปโหลด';
  if (s.phase === 'sending') return `กำลังส่งไฟล์ ${s.progress}%`;
  if (s.phase === 'confirming') {
    return /\.(mp4|webm|mov|hevc|m4v)$/i.test(s.fileName ?? '')
      ? 'กำลังแปลงวิดีโอให้เล่นได้หลายอุปกรณ์ · อาจใช้เวลาสักครู่'
      : 'กำลังยืนยันไฟล์';
  }
  return '';
};

export function CzUploadBlock({ label, hint, accept, state, onFile, onRemove, removeLabel, hasAsset, children, className = '', testId }: {
  label: string; hint: string; accept: string; state: UploadState; onFile: (f: File) => void; onRemove?: () => void; removeLabel?: string;
  hasAsset: boolean; children?: ReactNode; className?: string; testId: string;
}) {
  const id = useId();
  const [over, setOver] = useState(false);
  const busy = ['signing', 'sending', 'confirming'].includes(state.phase);
  const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f && !busy) onFile(f); };
  return <div className={`cz-upload ${className}${over ? ' is-over' : ''}${busy ? ' is-busy' : ''}${state.phase === 'error' ? ' is-error' : ''}${hasAsset ? ' has-asset' : ''}`}>
    <label htmlFor={id} className="cz-upload-target" onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
      <input id={id} type="file" className="cz-visually-hidden" accept={accept} disabled={busy} aria-describedby={`${id}-h ${id}-s`}
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f); }} data-testid={testId} />
      {children && <div className="cz-upload-media">{children}</div>}
      <div className="cz-upload-copy">
        <span className="cz-upload-icon">{busy ? <LoaderCircle className="cz-spin" size={18} /> : <CloudUpload size={18} />}</span>
        <strong>{label}</strong>
        <small id={`${id}-h`}>{over ? 'ปล่อยไฟล์ตรงนี้ได้เลย' : `คลิกหรือลากไฟล์มาวาง · ${hint}`}</small>
      </div>
      {busy && <div className="cz-progress" aria-hidden="true"><i style={{ transform: `scaleX(${state.phase === 'sending' ? state.progress / 100 : state.phase === 'confirming' ? 1 : .06})` }} /></div>}
    </label>
    <div className="cz-upload-status" id={`${id}-s`} role="status" aria-live="polite">
      {busy && <span><LoaderCircle className="cz-spin" size={13} />{phaseLabel(state)}{state.fileName ? ` · ${state.fileName}` : ''}</span>}
      {state.phase === 'error' && <span className="cz-err"><AlertCircle size={13} />{state.message}</span>}
      {state.phase === 'done' && <span className="cz-ok"><Check size={13} />อัปโหลดแล้ว จะเผยแพร่เมื่อกดบันทึก</span>}
    </div>
    {hasAsset && onRemove && !busy && <button type="button" className="cz-remove" onClick={onRemove} data-testid={`${testId}-remove`}><Trash2 size={13} />{removeLabel ?? 'นำออก'}</button>}
  </div>;
}
