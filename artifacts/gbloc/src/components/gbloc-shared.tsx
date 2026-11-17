import type { ReactNode } from 'react';
import { Show, useAuthActions, useUser } from '@/components/auth-context';
import { Link, Redirect } from 'wouter';
import {
  ChevronRight, CircleUserRound, Eye, ExternalLink, Link2, LogOut, ShieldCheck, Sparkles, WandSparkles,
} from 'lucide-react';
import { getGetModeratorAccessQueryKey, useGetModeratorAccess, useGetMyProfile } from '@workspace/api-client-react';

export const appBasePath = import.meta.env.BASE_URL.replace(/\/$/, '');
export const brandFullLogoUrl = `${appBasePath}/brand-full.png`;
export const brandMarkLogoUrl = `${appBasePath}/brand-g.png`;
export const publicProfileHref = (username: string) => `/@${encodeURIComponent(username.toLowerCase())}`;

export function CopyrightNotice() {
  return <small className="site-copyright">© {new Date().getFullYear()} GBLOC. All rights reserved.</small>;
}

export const objectUrl = (path?: string | null) => {
  if (!path) return '';
  if (path.startsWith('blob:')) return path;
  const objectKey = path.replace(/^\/?objects\//, '').replace(/^\/+/, '');
  return `/api/storage/objects/${objectKey.split('/').map(encodeURIComponent).join('/')}`;
};

export const usernameRule = /^[A-Za-z0-9_]{3,20}$/;
export const themeLabels = {
  ember: 'อุ่นละมุน',
  tide: 'คลื่นสงบ',
  moss: 'สวนเขียว',
  orchid: 'กลีบกล้วยไม้',
} as const;
export const platformLabels: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  threads: 'Threads',
  x: 'X',
  linkedin: 'LinkedIn',
  pinterest: 'Pinterest',
  snapchat: 'Snapchat',
  reddit: 'Reddit',
  bluesky: 'Bluesky',
  mastodon: 'Mastodon',
  tumblr: 'Tumblr',
  vk: 'VK',
  wechat: 'WeChat',
  xiaohongshu: 'Xiaohongshu',
  line: 'LINE',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  messenger: 'Messenger',
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  kick: 'Kick',
  applemusic: 'Apple Music',
  soundcloud: 'SoundCloud',
  bandcamp: 'Bandcamp',
  behance: 'Behance',
  dribbble: 'Dribbble',
  artstation: 'ArtStation',
  deviantart: 'DeviantArt',
  flickr: 'Flickr',
  patreon: 'Patreon',
  kofi: 'Ko-fi',
  buymeacoffee: 'Buy Me a Coffee',
  onlyfans: 'OnlyFans',
  medium: 'Medium',
  substack: 'Substack',
  gumroad: 'Gumroad',
  discord: 'Discord',
  github: 'GitHub',
  gitlab: 'GitLab',
  stackoverflow: 'Stack Overflow',
  codepen: 'CodePen',
  devto: 'Dev.to',
  spotify: 'Spotify',
  twitch: 'Twitch',
  steam: 'Steam',
  roblox: 'Roblox',
  itchio: 'itch.io',
  linktree: 'Linktree',
  website: 'เว็บไซต์',
  custom: 'กำหนดเอง',
};
export const platformGroups = [
  { label: 'โซเชียล', platforms: ['instagram', 'facebook', 'tiktok', 'threads', 'x', 'linkedin', 'pinterest', 'snapchat', 'reddit', 'bluesky', 'mastodon', 'tumblr', 'vk', 'wechat', 'xiaohongshu'] },
  { label: 'แชตและชุมชน', platforms: ['line', 'telegram', 'whatsapp', 'messenger', 'discord'] },
  { label: 'วิดีโอและเสียง', platforms: ['youtube', 'vimeo', 'twitch', 'kick', 'spotify', 'soundcloud', 'applemusic', 'bandcamp'] },
  { label: 'ครีเอเตอร์และผลงาน', platforms: ['patreon', 'kofi', 'buymeacoffee', 'onlyfans', 'medium', 'substack', 'gumroad', 'behance', 'dribbble', 'artstation', 'deviantart', 'flickr', 'linktree'] },
  { label: 'นักพัฒนาและเกม', platforms: ['github', 'gitlab', 'stackoverflow', 'codepen', 'devto', 'steam', 'roblox', 'itchio'] },
  { label: 'อื่น ๆ', platforms: ['website', 'custom'] },
];
export const platforms = platformGroups.flatMap(group => group.platforms);
export const directUrlPlatforms = new Set([
  'linkedin', 'mastodon', 'line', 'wechat', 'xiaohongshu', 'applemusic', 'bandcamp',
  'flickr', 'substack', 'gumroad', 'stackoverflow', 'steam', 'roblox', 'itchio',
]);

export function LoadingPanel({ message = 'กำลังเรียกข้อมูลของคุณ' }: { message?: string }) {
  return <div className="loading-panel" role="status"><div className="skeleton-line wide" /><div className="skeleton-line" /><span>{message}</span></div>;
}

export function ErrorPanel({ message, retry }: { message: string; retry: () => void }) {
  return <div className="notice error-notice"><strong>ยังโหลดข้อมูลไม่สำเร็จ</strong><p>{message}</p><button className="button button-outline" onClick={retry} data-testid="button-retry">ลองอีกครั้ง</button></div>;
}

export function Brand() {
  return <Link href="/" className="brand" aria-label="gbloc" data-testid="link-brand"><img className="brand-full-logo" src={brandFullLogoUrl} alt="gbloc" /></Link>;
}

const editorSections = [
  { path: '/customize', label: 'ปรับแต่งหน้า', icon: WandSparkles },
  { path: '/link', label: 'ลิงก์ของฉัน', icon: Link2 },
  { path: '/account', label: 'บัญชี', icon: CircleUserRound },
  { path: '/price', label: 'แพ็กเกจ', icon: Sparkles },
];

export function EditorNavigation({ current }: { current: string }) {
  const { isSignedIn } = useUser();
  const moderator = useGetModeratorAccess({
    query: { queryKey: getGetModeratorAccessQueryKey(), enabled: !!isSignedIn },
  });
  return <nav className="editor-nav" aria-label="เมนูหลัก">{editorSections.map(({ path, label, icon: Icon }) =>
    <Link href={path} key={path} className={`editor-nav-link ${current === path ? 'active' : ''}`} aria-current={current === path ? 'page' : undefined} data-testid={`nav-${path.slice(1)}`}>
      <Icon size={17} />{label}{current === path && <span className="nav-dot" />}
    </Link>,
  )}{moderator.data?.isModerator && <Link href="/moderation/reports" className={`editor-nav-link ${current === '/moderation/reports' ? 'active' : ''}`} aria-current={current === '/moderation/reports' ? 'page' : undefined} data-testid="nav-moderation-reports"><ShieldCheck size={17} />รายงาน{current === '/moderation/reports' && <span className="nav-dot" />}</Link>}
    {moderator.data?.isOwner && <Link href="/admin" className={`editor-nav-link ${current === '/admin' ? 'active' : ''}`} aria-current={current === '/admin' ? 'page' : undefined} data-testid="nav-admin"><ShieldCheck size={17} />ผู้ดูแล{current === '/admin' && <span className="nav-dot" />}</Link>}
  </nav>;
}

export function PublicHeader({ current = '/' }: { current?: string }) {
  const { isSignedIn } = useUser();
  const { signOut } = useAuthActions();
  return <header className="site-header"><Brand /><EditorNavigation current={current} />
    {isSignedIn
      ? <button type="button" className="nav-login site-logout" onClick={() => signOut({ redirectUrl: appBasePath || '/' })} data-testid="button-logout">ออกจากระบบ</button>
      : <Link href="/sign-in" className="nav-login" data-testid="link-sign-in">เข้าสู่ระบบ <ChevronRight size={15} /></Link>}
  </header>;
}

export function EditorShell({ children, current }: { children: ReactNode; current: string }) {
  const { signOut } = useAuthActions();
  const profile = useGetMyProfile();
  const publicProfilePath = profile.data?.profile.username ? publicProfileHref(profile.data.profile.username) : '/';
  return <div className="editor-frame">
    <aside className="editor-sidebar">
      <Brand /><div className="sidebar-caption">พื้นที่จัดการ</div>
      <EditorNavigation current={current} />
      <div className="sidebar-bottom"><Link href="/" className="side-preview" data-testid="link-home-preview"><Eye size={16} />หน้าแรก gbloc</Link><button className="side-logout" onClick={() => signOut({ redirectUrl: appBasePath || '/' })} data-testid="button-logout"><LogOut size={16} />ออกจากระบบ</button></div>
    </aside>
    <main className="editor-main">
      {!['/customize', '/link', '/account'].includes(current) && <div className="editor-topline">
        <span className="eyebrow">GBLOC / STUDIO</span>
        <Link href={publicProfilePath} className="preview-link" data-testid="link-view-profile">เปิดหน้าสาธารณะ <ExternalLink size={14} /></Link>
      </div>}
      {children}
    </main>
  </div>;
}

export function SignedInOnly({ children, current }: { children: ReactNode; current: string }) {
  return <><Show when="signed-in"><EditorShell current={current}>{children}</EditorShell></Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></>;
}
