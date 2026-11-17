import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, AudioLines, Check, ChevronRight, Eye, Link2, LoaderCircle, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react';
import {
  getGetAccountSummaryQueryKey, getGetMyProfileQueryKey, useGetMyMembership, useGetMyProfile, useReplaceMyProfileLinks,
} from '@workspace/api-client-react';
import type { ProfileLinkInput } from '@workspace/api-client-react';
import { directUrlPlatforms, ErrorPanel, LoadingPanel, platformGroups, platformLabels, SignedInOnly } from '@/components/gbloc-shared';
import { CustomLinkGlyph, customLinkIconOptions } from '@/components/custom-link-icons';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import '@/styles/social-links.css';

const platformUrlBase: Record<string, string> = {
  instagram: 'https://www.instagram.com/',
  facebook: 'https://www.facebook.com/',
  tiktok: 'https://www.tiktok.com/@',
  threads: 'https://www.threads.net/@',
  youtube: 'https://www.youtube.com/@',
  soundcloud: 'https://soundcloud.com/',
  discord: 'https://discord.gg/',
  github: 'https://github.com/',
  gitlab: 'https://gitlab.com/',
  codepen: 'https://codepen.io/',
  devto: 'https://dev.to/',
  spotify: 'https://open.spotify.com/user/',
  twitch: 'https://www.twitch.tv/',
  x: 'https://x.com/',
  pinterest: 'https://www.pinterest.com/',
  snapchat: 'https://www.snapchat.com/add/',
  reddit: 'https://www.reddit.com/user/',
  bluesky: 'https://bsky.app/profile/',
  telegram: 'https://t.me/',
  messenger: 'https://m.me/',
  vimeo: 'https://vimeo.com/',
  kick: 'https://kick.com/',
  vk: 'https://vk.com/',
  patreon: 'https://www.patreon.com/',
  kofi: 'https://ko-fi.com/',
  buymeacoffee: 'https://buymeacoffee.com/',
  onlyfans: 'https://onlyfans.com/',
  medium: 'https://medium.com/@',
  behance: 'https://www.behance.net/',
  dribbble: 'https://dribbble.com/',
  artstation: 'https://www.artstation.com/',
  deviantart: 'https://www.deviantart.com/',
  linktree: 'https://linktr.ee/',
};

function getLinkPreviewValue(link: ProfileLinkInput) {
  const value = link.value.trim();
  if (link.mode === 'text') return `คัดลอกข้อความ: ${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  if (directUrlPlatforms.has(link.platform)) return value ? 'กรอก URL โปรไฟล์เต็ม' : 'วาง URL โปรไฟล์';
  if (link.platform === 'website' || link.platform === 'custom') {
    return value ? `https://${value}` : 'ใส่ URL เว็บไซต์';
  }
  const username = value.replace(/^@/, '');
  if (link.platform === 'whatsapp') {
    const phone = value.replace(/[^\d]/g, '');
    return /^\d{7,15}$/.test(phone) ? `https://wa.me/${phone}` : 'กรอกเบอร์พร้อมรหัสประเทศ';
  }
  if (link.platform === 'tumblr') {
    return username ? `https://${encodeURIComponent(username)}.tumblr.com` : 'ใส่ชื่อผู้ใช้';
  }
  const base = platformUrlBase[link.platform];
  return username && base ? `${base}${encodeURIComponent(username)}` : 'ใส่ชื่อผู้ใช้';
}

function linkValueLabel(platform: string) {
  if (directUrlPlatforms.has(platform) || platform === 'website' || platform === 'custom') return 'URL โปรไฟล์หรือเว็บไซต์';
  if (platform === 'discord') return 'รหัสคำเชิญหรือ URL';
  if (platform === 'whatsapp') return 'เบอร์โทรพร้อมรหัสประเทศ';
  return 'ชื่อผู้ใช้';
}

function linkValuePlaceholder(platform: string, mode: string) {
  if (mode === 'text') return 'เขียนข้อความที่อยากให้คนคัดลอก';
  if (directUrlPlatforms.has(platform)) return 'https://example.com/your-profile';
  if (platform === 'website' || platform === 'custom') return 'https://example.com';
  if (platform === 'discord') return 'รหัสคำเชิญ หรือ https://discord.gg/...';
  if (platform === 'whatsapp') return 'เช่น 66812345678';
  if (platform === 'tiktok') return 'ชื่อผู้ใช้ เช่น yourname';
  return 'ชื่อผู้ใช้ของช่องทาง';
}

function linkValueHint(platform: string, mode: string) {
  if (mode === 'text') return 'เมื่อกดบนหน้าโปรไฟล์ ข้อความนี้จะถูกคัดลอกแทนการเปิดเว็บไซต์';
  if (directUrlPlatforms.has(platform)) return 'วาง URL โปรไฟล์เต็ม รวมถึง https://';
  if (platform === 'website' || platform === 'custom') return 'วาง URL เว็บไซต์ที่ต้องการให้เปิด';
  if (platform === 'discord') return 'ใส่รหัสคำเชิญ หรือวาง URL คำเชิญเต็ม';
  if (platform === 'whatsapp') return 'ใส่รหัสประเทศและเบอร์โทร โดยไม่ต้องใส่เครื่องหมาย +';
  if (platform === 'tumblr') return 'กรอกชื่อบล็อก เช่น yourname';
  return 'กรอกชื่อผู้ใช้เท่านั้น ระบบจะสร้าง URL ของแพลตฟอร์มให้เมื่อบันทึก';
}

function saveErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
      return `บันทึกลิงก์ไม่สำเร็จ · ${data.error}`;
    }
  }
  return 'บันทึกลิงก์ไม่สำเร็จ กรุณาลองอีกครั้ง';
}

export default function SocialLinksPage() {
  const profileQuery = useGetMyProfile();
  const membershipQuery = useGetMyMembership();
  const replaceLinks = useReplaceMyProfileLinks();
  const client = useQueryClient();
  const [links, setLinks] = useState<ProfileLinkInput[]>([]);
  const [savedLinks, setSavedLinks] = useState<ProfileLinkInput[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState('');
  const linkLimit = membershipQuery.data?.plan === 'basic' || membershipQuery.data?.plan === 'pro' ? 5 : 2;

  useEffect(() => {
    if (profileQuery.data && !loaded) {
      const initial = profileQuery.data.links.map(({ platform, mode, value, label, icon }) => ({ platform, mode, value, label, icon }));
      setLinks(initial);
      setSavedLinks(initial);
      setLoaded(true);
    }
  }, [profileQuery.data, loaded]);

  function change(index: number, patch: Partial<ProfileLinkInput>) {
    setLinks(old => old.map((item, i) => i === index ? { ...item, ...patch } : item));
    setMessage('');
  }
  function move(index: number, by: number) {
    setLinks(old => {
      const next = [...old];
      const target = index + by;
      if (target < 0 || target >= next.length) return old;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setMessage('');
  }
  function addLink(platform: ProfileLinkInput['platform'] = 'custom') {
    setLinks(old => membershipQuery.isLoading || old.length >= linkLimit
      ? old
      : [...old, { platform, mode: 'url', value: '', label: '' }]);
    setMessage('');
  }
  function discard() {
    setLinks(savedLinks.map(item => ({ ...item })));
    setMessage('');
  }
  async function save() {
    if (replaceLinks.isPending) return;
    setMessage('');
    const body = links.filter(item => item.value.trim()).map(item => ({
      ...item,
      value: item.value.trim(),
      label: item.label?.trim() || '',
    }));
    try {
      const result = await replaceLinks.mutateAsync({ data: { links: body } });
      const saved = result.map(({ platform, mode, value, label, icon }) => ({ platform, mode, value, label, icon }));
      setLinks(saved);
      setSavedLinks(saved);
      setMessage('บันทึกลิงก์เรียบร้อยแล้ว');
      await client.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
      await client.invalidateQueries({ queryKey: getGetAccountSummaryQueryKey() });
    } catch (error) { setMessage(saveErrorMessage(error)); }
  }

  const busy = replaceLinks.isPending;
  const dirty = JSON.stringify(links) !== JSON.stringify(savedLinks);

  if (profileQuery.isLoading) return <SignedInOnly current="/link"><LoadingPanel message="กำลังโหลดลิงก์ของคุณ" /></SignedInOnly>;
  if (profileQuery.isError) return <SignedInOnly current="/link"><ErrorPanel message="โหลดลิงก์ไม่สำเร็จ" retry={() => profileQuery.refetch()} /></SignedInOnly>;

  return <SignedInOnly current="/link"><div className="links-page route-arrive">
    <header className="ln-head">
      <div><span className="ln-eyebrow">02 / ช่องทางของคุณ</span><h1>ลิงก์ของฉัน</h1><p>เลือกช่องทางที่อยากแชร์ แล้วจัดลำดับให้เป็นแบบของคุณ</p></div>
    </header>
    <div className="ln-savebar" role="region" aria-label="สถานะการแก้ไขลิงก์">
      <div className={`ln-state ${dirty ? 'is-dirty' : 'is-clean'}`} data-testid="status-links" aria-live="polite">
        <span className="ln-state-dot" />{dirty ? `มีการแก้ไขที่ยังไม่บันทึก · ${links.length} ช่องทาง` : 'ลิงก์ตรงกับที่บันทึกล่าสุด'}
      </div>
      <div className="ln-actions">
        <button type="button" className="ln-pill" onClick={() => addLink()} disabled={busy || membershipQuery.isLoading || links.length >= linkLimit} data-testid="button-add-link"><Plus size={15} />เพิ่มช่องทาง <span>{links.length}/{membershipQuery.isLoading ? '…' : linkLimit}</span></button>
        <button type="button" className="ln-pill" onClick={discard} disabled={busy || !dirty} data-testid="button-discard-links"><RotateCcw size={15} />ย้อนกลับ</button>
        <button type="button" className="ln-pill ln-save" onClick={save} disabled={busy || !dirty} data-testid="button-save-links">{busy ? <LoaderCircle className="ln-spin" size={15} /> : <Save size={15} />}{busy ? 'กำลังบันทึก' : 'บันทึกลิงก์'}</button>
      </div>
    </div>
    <div className="ln-layout">
      <nav className="ln-rail" aria-label="หมวดลิงก์">
        <a className="ln-rail-link" href="#ln-list" onClick={e => { e.preventDefault(); document.getElementById('ln-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><span>01</span> ช่องทางของคุณ</a>
        <a className="ln-rail-link" href="#ln-preview" onClick={e => { e.preventDefault(); document.getElementById('ln-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><span>02</span> ตัวอย่างโปรไฟล์</a>
        <div className="ln-rail-count"><Link2 size={14} />{links.length} / {membershipQuery.isLoading ? '…' : linkLimit} ลิงก์</div>
      </nav>
      <div className="ln-content">
        <section className="ln-list" id="ln-list" aria-labelledby="ln-list-title">
          <header className="ln-section-head"><span className="ln-section-index">01</span><div><h2 id="ln-list-title">ช่องทางของคุณ</h2><p>เรียงลำดับด้วยปุ่มลูกศร · บัญชีทั่วไปได้ 2 รายการ, Basic/Pro ได้ 5 รายการ</p></div><span className="ln-count">{String(links.length).padStart(2, '0')} / {membershipQuery.isLoading ? '…' : linkLimit}</span></header>
          {!membershipQuery.isLoading && savedLinks.length > linkLimit && <div className="ln-notice is-warning" role="status" data-testid="notice-existing-links-over-limit">
            มีลิงก์เดิมเกินโควตาของแพ็กปัจจุบัน ระบบจะไม่ลบให้อัตโนมัติ หากต้องการเพิ่มลิงก์ใหม่ ให้ลดและบันทึกจำนวนลิงก์ให้อยู่ในโควตาก่อน
          </div>}
          {membershipQuery.isError && <div className="ln-notice is-error" role="alert">ตรวจสอบแพ็กเกจไม่สำเร็จ จึงใช้โควตาบัญชีทั่วไปชั่วคราว กรุณาลองโหลดหน้าใหม่</div>}
          {links.length === 0 && <div className="ln-empty"><div className="ln-empty-icon"><Link2 size={22} /></div><h3>ยังไม่มีลิงก์</h3><p>เพิ่มช่องทางแรกของคุณ แล้วคนที่เข้ามาจะได้ไปต่อ</p><button className="ln-pill" type="button" onClick={() => addLink('instagram')} disabled={busy || membershipQuery.isLoading} data-testid="button-add-first-link"><Plus size={15} />เพิ่มลิงก์แรก</button></div>}
          {links.map((item, index) => <section className="ln-card" key={index}>
            <div className="ln-card-top">
              <div className="ln-order"><span>{String(index + 1).padStart(2, '0')}</span><div>
                <button type="button" onClick={() => move(index, -1)} disabled={busy || index === 0} aria-label={`เลื่อน ${platformLabels[item.platform]} ขึ้น`} data-testid={`button-link-up-${index}`}><ArrowUp size={14} /></button>
                <button type="button" onClick={() => move(index, 1)} disabled={busy || index === links.length - 1} aria-label={`เลื่อน ${platformLabels[item.platform]} ลง`} data-testid={`button-link-down-${index}`}><ArrowDown size={14} /></button>
              </div></div>
              <label className="ln-mode"><span>รูปแบบ</span><Select value={item.mode} disabled={busy} onValueChange={value => change(index, { mode: value as 'url' | 'text' })}>
                <SelectTrigger className="ln-select-trigger" aria-label="รูปแบบลิงก์" data-testid={`select-link-mode-${index}`}><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="url">เปิดลิงก์</SelectItem><SelectItem value="text">คัดลอกข้อความ</SelectItem></SelectContent>
              </Select></label>
              <button type="button" className="ln-delete" onClick={() => { setLinks(old => old.filter((_, i) => i !== index)); setMessage(''); }} disabled={busy} aria-label={`ลบ ${platformLabels[item.platform]}`} data-testid={`button-delete-link-${index}`}><Trash2 size={15} /></button>
            </div>
            <div className="ln-fields">
              <label className="ln-platform-field"><span>แพลตฟอร์ม</span><Select value={item.platform} disabled={busy} onValueChange={value => change(index, { platform: value as ProfileLinkInput['platform'] })}>
                <SelectTrigger className="ln-select-trigger" aria-label="แพลตฟอร์ม" data-testid={`select-platform-${index}`}><SelectValue /></SelectTrigger>
                <SelectContent>{platformGroups.map(group => <SelectGroup key={group.label}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.platforms.map(platform => <SelectItem value={platform} key={platform}>{platformLabels[platform]}</SelectItem>)}
                </SelectGroup>)}</SelectContent>
              </Select></label>
              <label><span>ชื่อที่แสดง <small>ไม่บังคับ</small></span><input value={item.label || ''} maxLength={48} disabled={busy} onChange={e => change(index, { label: e.target.value })} placeholder={item.platform === 'custom' ? 'เช่น Portfolio' : platformLabels[item.platform] || 'ชื่อช่องทาง'} data-testid={`input-link-label-${index}`} /></label>
              {item.platform === 'custom' && <label className="ln-custom-icon-field"><span>ไอคอน</span><Select value={item.icon || 'none'} disabled={busy} onValueChange={value => change(index, { icon: value === 'none' ? null : customLinkIconOptions.find(option => option.value === value)?.value ?? null })}>
                <SelectTrigger className="ln-select-trigger" aria-label="ไอคอนลิงก์กำหนดเอง" data-testid={`select-custom-link-icon-${index}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none"><span className="ln-icon-option"><Link2 size={15} />ไอคอนทั่วไป</span></SelectItem>
                  {customLinkIconOptions.map(({ value, label }) => <SelectItem value={value} key={value}><span className="ln-icon-option"><CustomLinkGlyph icon={value} size={15} />{label}</span></SelectItem>)}
                </SelectContent>
              </Select></label>}
            </div>
            <label className="ln-value-label" htmlFor={`link-value-${index}`}>{linkValueLabel(item.platform)}</label>
            <input id={`link-value-${index}`} className="ln-value-input" value={item.value} maxLength={200} disabled={busy} onChange={e => change(index, { value: e.target.value })} placeholder={linkValuePlaceholder(item.platform, item.mode)} data-testid={`input-link-value-${index}`} />
            <p className="ln-hint">{linkValueHint(item.platform, item.mode)}</p>
          </section>)}
          {links.length > 0 && <button type="button" className="ln-add-row" disabled={busy || membershipQuery.isLoading || links.length >= linkLimit} onClick={() => addLink()} data-testid="button-add-link-bottom"><Plus size={15} />เพิ่มช่องทาง <span>{links.length}/{membershipQuery.isLoading ? '…' : linkLimit}</span></button>}
          {message && <div className={`ln-notice ${message.includes('ไม่สำเร็จ') ? 'is-error' : 'is-success'}`} role={message.includes('ไม่สำเร็จ') ? 'alert' : 'status'} data-testid="status-save-links">{message.includes('ไม่สำเร็จ') ? <X size={15} /> : <Check size={15} />}{message}</div>}
        </section>
        <div className="ln-aside">
          <section className="ln-preview" id="ln-preview" aria-labelledby="ln-preview-title">
            <header className="ln-section-head"><span className="ln-section-index"><Eye size={15} /></span><div><span className="ln-live">LIVE PREVIEW</span><h2 id="ln-preview-title">ตัวอย่างบนโปรไฟล์</h2><p>ลำดับและรูปแบบที่ผู้เข้าชมจะเห็น</p></div></header>
            <div className="ln-preview-list">{links.filter(item => item.value.trim()).map((item, index) => <div className="ln-preview-item" key={`${index}-${item.platform}`}><span className="ln-preview-mark">{item.platform === 'custom' ? <CustomLinkGlyph icon={item.icon} size={14} /> : <ChevronRight size={14} />}</span><div><strong>{item.label?.trim() || platformLabels[item.platform] || item.platform}</strong><small>{getLinkPreviewValue(item)}</small></div></div>)}{links.every(item => !item.value.trim()) && <div className="ln-preview-empty">เพิ่มลิงก์แรก แล้วตัวอย่างจะขึ้นตรงนี้</div>}</div>
          </section>
          <section className="ln-tip"><AudioLines size={16} /><div><strong>URL หรือข้อความ</strong><p>ใส่ชื่อผู้ใช้เพื่อให้ระบบสร้างลิงก์ให้ หรือเลือกข้อความให้คนกดคัดลอกได้เลย</p></div></section>
        </div>
      </div>
    </div>
  </div></SignedInOnly>;
}
