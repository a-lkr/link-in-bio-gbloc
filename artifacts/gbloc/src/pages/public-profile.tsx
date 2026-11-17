import { publicProfileUrl } from '@/lib/public-origin';
import { useProfileFont } from '@/hooks/use-profile-font';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import {
  AlertTriangle, BadgeCheck, Copy, Eye, Globe, Link2, LoaderCircle, MapPin, Music2, Pause, Play,
  SkipBack, SkipForward, Volume2, VolumeX,
} from 'lucide-react';
import {
  SiApplemusic, SiArtstation, SiBandcamp, SiBehance, SiBluesky, SiBuymeacoffee, SiDeviantart,
  SiDiscord, SiDribbble, SiFacebook, SiFlickr, SiGitlab, SiKick, SiKofi, SiLine, SiLinktree,
  SiMastodon, SiMedium, SiMessenger, SiOnlyfans, SiPatreon, SiPinterest, SiReddit, SiRoblox,
  SiSnapchat, SiSoundcloud, SiSpotify, SiStackoverflow, SiSteam, SiSubstack, SiThreads, SiTiktok,
  SiTelegram, SiTumblr, SiTwitch, SiVk, SiVimeo, SiWechat, SiWhatsapp, SiX, SiXiaohongshu,
  SiGumroad,
  SiYoutube, SiGithub, SiInstagram, SiItchdotio, SiDevdotto,
} from 'react-icons/si';
import { FaCodepen, FaLinkedin } from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { CustomLinkGlyph } from '@/components/custom-link-icons';
import {
  getGetPublicProfileQueryKey,
  useCreateProfileReport,
  useGetPublicProfile,
  useRecordProfileView,
} from '@workspace/api-client-react';
import type { ProfileLink, ProfileReportInputReason, PublicProfile } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { useUser } from '@/components/auth-context';
import { brandFullLogoUrl, brandMarkLogoUrl, objectUrl, platformLabels } from '@/components/gbloc-shared';
import { avatarImageStyle } from '@/components/profile-appearance';
import { RandomAurora } from '@/components/random-aurora';
import { RandomRain } from '@/components/random-rain';
import { RandomStars, ShootingStars } from '@/components/shooting-stars';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import '@/styles/profile-renderer.css';
import '@/styles/moderation.css';

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

const brandIcons: Record<string, IconType> = {
  instagram: SiInstagram,
  facebook: SiFacebook,
  tiktok: SiTiktok,
  threads: SiThreads,
  x: SiX,
  linkedin: FaLinkedin,
  pinterest: SiPinterest,
  snapchat: SiSnapchat,
  reddit: SiReddit,
  bluesky: SiBluesky,
  mastodon: SiMastodon,
  tumblr: SiTumblr,
  vk: SiVk,
  wechat: SiWechat,
  xiaohongshu: SiXiaohongshu,
  line: SiLine,
  telegram: SiTelegram,
  whatsapp: SiWhatsapp,
  messenger: SiMessenger,
  youtube: SiYoutube,
  vimeo: SiVimeo,
  twitch: SiTwitch,
  kick: SiKick,
  spotify: SiSpotify,
  soundcloud: SiSoundcloud,
  applemusic: SiApplemusic,
  bandcamp: SiBandcamp,
  behance: SiBehance,
  dribbble: SiDribbble,
  artstation: SiArtstation,
  deviantart: SiDeviantart,
  flickr: SiFlickr,
  patreon: SiPatreon,
  kofi: SiKofi,
  buymeacoffee: SiBuymeacoffee,
  onlyfans: SiOnlyfans,
  medium: SiMedium,
  substack: SiSubstack,
  gumroad: SiGumroad,
  discord: SiDiscord,
  github: SiGithub,
  gitlab: SiGitlab,
  stackoverflow: SiStackoverflow,
  codepen: FaCodepen,
  devto: SiDevdotto,
  steam: SiSteam,
  roblox: SiRoblox,
  itchio: SiItchdotio,
  linktree: SiLinktree,
};

function SocialGlyph({ platform, icon }: { platform: string; icon?: string | null }) {
  if (platform === 'custom') return <CustomLinkGlyph icon={icon} />;
  const BrandIcon = brandIcons[platform];
  if (BrandIcon) return <BrandIcon size={22} aria-hidden="true" />;
  if (platform === 'website') return <Globe size={22} strokeWidth={2} />;
  return <Link2 size={22} strokeWidth={2} />;
}

const reportReasons: { value: ProfileReportInputReason; label: string }[] = [
  { value: 'spam', label: 'สแปม' }, { value: 'scam', label: 'หลอกลวงหรือฟิชชิง' },
  { value: 'impersonation', label: 'แอบอ้างตัวตน' }, { value: 'harassment', label: 'คุกคามหรือกลั่นแกล้ง' },
  { value: 'sexual_content', label: 'เนื้อหาทางเพศ' }, { value: 'other', label: 'อื่น ๆ' },
];

function reportErrorCopy(error: unknown) {
  const value = error as { message?: string; status?: number; response?: { status?: number; data?: { error?: string; message?: string } } };
  const text = `${value?.response?.data?.error || value?.response?.data?.message || value?.message || ''}`.toLowerCase();
  if (value?.status === 409 || value?.response?.status === 409 || /duplicate|already reported|already exists|already.*report/.test(text)) return 'คุณส่งรายงานโปรไฟล์นี้ไปแล้ว ขอบคุณที่ช่วยดูแลชุมชน';
  if (value?.status === 429 || value?.response?.status === 429 || /rate.?limit|too many|try again later/.test(text)) return 'ส่งรายงานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่';
  return 'ส่งรายงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
}

const PROFILE_MEDIA_LOAD_TIMEOUT_MS = 15_000;

function setMetaContent(selector: string, content: string | null) {
  const meta = document.querySelector<HTMLMetaElement>(selector);
  if (content === null) {
    meta?.remove();
    return;
  }
  if (meta) {
    meta.setAttribute('content', content);
    return;
  }
  const match = selector.match(/^meta\[(name|property)="([^"]+)"\]$/);
  if (!match) return;
  const created = document.createElement('meta');
  created.setAttribute(match[1], match[2]);
  created.setAttribute('content', content);
  document.head.append(created);
}

function preloadImageSource(source: string): Promise<boolean> {
  return new Promise(resolve => {
    const image = new Image();
    let finished = false;
    const timeout = window.setTimeout(() => finish(false), PROFILE_MEDIA_LOAD_TIMEOUT_MS);
    const finish = (loaded: boolean) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      resolve(loaded);
    };
    image.onload = () => {
      if (typeof image.decode === 'function') {
        void image.decode().then(() => finish(true)).catch(() => finish(image.naturalWidth > 0));
      } else {
        finish(image.naturalWidth > 0);
      }
    };
    image.onerror = () => finish(false);
    image.src = source;
    if (image.complete) finish(image.naturalWidth > 0);
  });
}

export default function PublicProfilePage({
  username, profileOverride, linksOverride, initiallyEntered = false, preview = false,
  previewAurora = false, previewStars = false, previewRain = false,
}: {
  username: string;
  profileOverride?: PublicProfile;
  linksOverride?: ProfileLink[];
  initiallyEntered?: boolean;
  preview?: boolean;
  previewAurora?: boolean;
  previewStars?: boolean;
  previewRain?: boolean;
}) {
  const canonicalUsername = username.toLowerCase();
  const query = useGetPublicProfile(canonicalUsername, {
    query: { queryKey: getGetPublicProfileQueryKey(canonicalUsername), enabled: !profileOverride },
  });
  const recordView = useRecordProfileView();
  const createReport = useCreateProfileReport();
  const { isSignedIn } = useUser();
  const recordedForVisit = useRef('');
  const recordViewMutation = useRef(recordView.mutate);
  recordViewMutation.current = recordView.mutate;
  const [entered, setEntered] = useState(initiallyEntered);
  const [gateLeaving, setGateLeaving] = useState(false);
  const [viewRecordedFor, setViewRecordedFor] = useState('');
  const [copyState, setCopyState] = useState('');
  const [audioError, setAudioError] = useState('');
  const [readyImageKey, setReadyImageKey] = useState('');
  const [failedImageKey, setFailedImageKey] = useState('');
  const [readyAudioPath, setReadyAudioPath] = useState('');
  const [failedAudioPath, setFailedAudioPath] = useState('');
  const [readyVideoPath, setReadyVideoPath] = useState('');
  const [failedVideoPath, setFailedVideoPath] = useState('');
  const [mediaRetryCount, setMediaRetryCount] = useState(0);
  const [volumePanelOpen, setVolumePanelOpen] = useState(false);
  const [playbackVolume, setPlaybackVolume] = useState(80);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ProfileReportInputReason>('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);
  const gateTimer = useRef<number | null>(null);
  const [audioState, setAudioState] = useState({ currentTime: 0, duration: 0, playing: false });
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const resumeAfterTrackChange = useRef(false);
  const profile = profileOverride ?? query.data?.profile;
  useProfileFont(profile?.premiumFont);
  const links = useMemo(() => linksOverride ?? query.data?.links ?? [], [linksOverride, query.data?.links]);
  const audioTracks = useMemo(() => {
    if (!profile) return [];
    return [
      ...(profile.audioPath ? [{ path: profile.audioPath, title: profile.audioTitle.trim() || 'เสียงของฉัน' }] : []),
      ...(profile.extraAudioTracks ?? []).filter(track => !!track.path).map(track => ({ path: track.path!, title: track.title.trim() || 'เสียงของฉัน' })),
    ];
  }, [profile?.audioPath, profile?.audioTitle, profile?.extraAudioTracks]);
  const safeTrackIndex = audioTracks.length ? activeTrackIndex % audioTracks.length : 0;
  const activeTrack = audioTracks[safeTrackIndex];
  const isPreviewProfile = preview || !!profileOverride;
  const avatarPath = profile?.avatarPath ?? null;
  const coverPath = profile?.audioCoverPath ?? null;
  const avatarSourcePath = profile?.showAvatar || (activeTrack && !coverPath) ? avatarPath : null;
  const backgroundPath = profile?.backgroundPath ?? null;
  const backgroundType = profile?.backgroundType ?? 'image';
  const imageKey = profile
    ? JSON.stringify([canonicalUsername, avatarSourcePath, coverPath, backgroundType === 'video' ? null : backgroundPath])
    : '';
  const videoPath = backgroundType === 'video' ? backgroundPath : null;
  const imagesReady = isPreviewProfile || !imageKey || readyImageKey === imageKey;
  const audioReady = isPreviewProfile || !activeTrack || readyAudioPath === activeTrack.path;
  const videoReady = isPreviewProfile || !videoPath || readyVideoPath === videoPath;
  const mediaFailed = !isPreviewProfile && (
    failedImageKey === imageKey ||
    (!!activeTrack && failedAudioPath === activeTrack.path) ||
    (!!videoPath && failedVideoPath === videoPath)
  );
  const mediaReady = imagesReady && audioReady && videoReady;
  const showMediaSpinner = !isPreviewProfile && !mediaReady && !mediaFailed;

  useEffect(() => {
    if (!profile || isPreviewProfile) return;
    let cancelled = false;
    const imageSources = [avatarSourcePath, coverPath, backgroundType === 'video' ? null : backgroundPath]
      .filter((path): path is string => !!path)
      .filter((path, index, paths) => paths.indexOf(path) === index)
      .map(objectUrl);
    const loadImages = Promise.all(imageSources.map(preloadImageSource));
    void loadImages.then(results => {
      if (cancelled) return;
      if (results.every(Boolean)) {
        setReadyImageKey(imageKey);
        setFailedImageKey('');
      } else {
        setFailedImageKey(imageKey);
      }
    });
    return () => { cancelled = true; };
  }, [!!profile, isPreviewProfile, avatarSourcePath, coverPath, backgroundType, backgroundPath, imageKey, mediaRetryCount]);

  useEffect(() => {
    if (!activeTrack?.path || isPreviewProfile || readyAudioPath === activeTrack.path) return;
    const path = activeTrack.path;
    const timeout = window.setTimeout(() => setFailedAudioPath(path), PROFILE_MEDIA_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [activeTrack?.path, isPreviewProfile, mediaRetryCount, readyAudioPath]);

  useEffect(() => {
    if (!videoPath || isPreviewProfile || readyVideoPath === videoPath) return;
    const path = videoPath;
    const timeout = window.setTimeout(() => setFailedVideoPath(path), PROFILE_MEDIA_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [videoPath, isPreviewProfile, mediaRetryCount, readyVideoPath]);

  useEffect(() => {
    setPlaybackVolume(Math.max(0, Math.min(100, profile?.musicVolume ?? 80)));
    setVolumePanelOpen(false);
  }, [canonicalUsername, profile?.musicVolume]);

  useEffect(() => {
    if (!profile || preview) return;

    const displayName = profile.displayName.trim() || `@${profile.username}`;
    const title = `@${profile.username}`;
    const description = profile.bio.trim() ? profile.bio.trim().slice(0, 300) : null;
    const imagePath = profile.avatarPath
      ? objectUrl(profile.avatarPath)
      : `${window.location.origin}/brand-full.png`;
    const imageUrl = new URL(imagePath, window.location.origin).toString();
    const pageUrl = publicProfileUrl(profile.username);

    document.title = title;
    setMetaContent('meta[name="description"]', description);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', pageUrl);
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[property="og:description"]', description);
    setMetaContent('meta[property="og:image"]', imageUrl);
    setMetaContent('meta[property="og:url"]', pageUrl);
    setMetaContent('meta[name="twitter:title"]', title);
    setMetaContent('meta[name="twitter:description"]', description);
    setMetaContent('meta[name="twitter:image"]', imageUrl);

    return () => {
      document.title = 'gbloc';
    };
  }, [profile, preview]);

  useEffect(() => {
    if (preview || profile || query.isLoading || !query.isError) return;
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (robots) robots.content = 'noindex, nofollow';
  }, [preview, profile, query.isError, query.isLoading]);

  useEffect(() => {
    setEntered(initiallyEntered);
    setGateLeaving(false);
    setAudioState({ currentTime: 0, duration: 0, playing: false });
    setActiveTrackIndex(0);
    resumeAfterTrackChange.current = false;
    if (gateTimer.current !== null) window.clearTimeout(gateTimer.current);
  }, [canonicalUsername, initiallyEntered]);

  useEffect(() => () => {
    if (gateTimer.current !== null) window.clearTimeout(gateTimer.current);
  }, []);
  useEffect(() => () => {
    audioRef.current?.pause();
    const context = audioContextRef.current;
    audioContextRef.current = null;
    audioGainRef.current = null;
    if (context && context.state !== 'closed') void context.close();
  }, []);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setAudioState({ currentTime: 0, duration: 0, playing: false });
    audio.load();
    if (resumeAfterTrackChange.current) {
      resumeAfterTrackChange.current = false;
      void audio.play().catch(() => setAudioError('เล่นเสียงไม่ได้ กรุณาตรวจสอบไฟล์เสียง'));
    }
    return () => audio.pause();
  }, [activeTrack?.path, mediaRetryCount]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const syncAudio = () => setAudioState(current => ({
      ...current,
      currentTime: audio.currentTime || 0,
      duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      playing: !audio.paused,
    }));
    const volume = Math.max(0, Math.min(100, playbackVolume)) / 100;
    if (audioGainRef.current && audioContextRef.current) {
      audio.volume = 1;
      audioGainRef.current.gain.setTargetAtTime(volume, audioContextRef.current.currentTime, 0.035);
    } else {
      audio.volume = volume;
    }
    audio.addEventListener('timeupdate', syncAudio);
    audio.addEventListener('loadedmetadata', syncAudio);
    audio.addEventListener('durationchange', syncAudio);
    audio.addEventListener('play', syncAudio);
    audio.addEventListener('pause', syncAudio);
    audio.addEventListener('ended', syncAudio);
    syncAudio();
    return () => {
      audio.removeEventListener('timeupdate', syncAudio);
      audio.removeEventListener('loadedmetadata', syncAudio);
      audio.removeEventListener('durationchange', syncAudio);
      audio.removeEventListener('play', syncAudio);
      audio.removeEventListener('pause', syncAudio);
      audio.removeEventListener('ended', syncAudio);
    };
  }, [activeTrack?.path, playbackVolume]);

  useEffect(() => {
    if (profileOverride || !query.data || recordedForVisit.current === canonicalUsername) return;
    recordedForVisit.current = canonicalUsername;
    setViewRecordedFor('');
    recordViewMutation.current(
      { username: canonicalUsername },
      { onSuccess: () => setViewRecordedFor(canonicalUsername) },
    );
  }, [query.data, canonicalUsername, profileOverride]);

  async function copyText(link: ProfileLink) {
    try {
      await navigator.clipboard.writeText(link.value);
      setCopyState(link.id);
      window.setTimeout(() => setCopyState(''), 1600);
    } catch {
      setCopyState('');
    }
  }

  function connectAudioOutput() {
    const audio = audioRef.current;
    if (!audio) return;
    const volume = Math.max(0, Math.min(100, playbackVolume)) / 100;
    if (!window.AudioContext) {
      audio.volume = volume;
      return;
    }
    try {
      let context = audioContextRef.current;
      if (!context) {
        context = new AudioContext();
        const source = context.createMediaElementSource(audio);
        const gain = context.createGain();
        source.connect(gain);
        gain.connect(context.destination);
        audioContextRef.current = context;
        audioGainRef.current = gain;
      }
      audio.volume = 1;
      audioGainRef.current!.gain.setTargetAtTime(volume, context.currentTime, 0.035);
      if (context.state === 'suspended') void context.resume().catch(() => {});
    } catch {
      audio.volume = volume;
    }
  }

  function enterProfile() {
    if (gateLeaving) return;
    setGateLeaving(true);
    if (audioTracks.length && audioRef.current) {
      connectAudioOutput();
      setAudioError('');
      void audioRef.current.play().catch(() => setAudioError('เล่นเสียงไม่ได้ กรุณาลองกดเล่นอีกครั้ง'));
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gateTimer.current = window.setTimeout(() => setEntered(true), reduceMotion ? 30 : 720);
  }

  function toggleAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      connectAudioOutput();
      setAudioError('');
      void audio.play().catch(() => setAudioError('เล่นเสียงไม่ได้ กรุณาตรวจสอบไฟล์เสียง'));
    }
    else audio.pause();
  }

  function changeTrack(direction: -1 | 1) {
    if (audioTracks.length < 2) return;
    resumeAfterTrackChange.current = !!audioRef.current && !audioRef.current.paused;
    setActiveTrackIndex(index => (index + direction + audioTracks.length) % audioTracks.length);
  }

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSignedIn || createReport.isPending) return;
    const details = reportDetails.trim();
    if (!details) {
      setReportError('กรุณาเขียนเหตุผลประกอบก่อนส่งรายงาน');
      return;
    }
    setReportError('');
    createReport.mutate({ data: { username: canonicalUsername, reason: reportReason, details } }, {
      onSuccess: () => {
        setReportSent(true);
        setReportOpen(false);
        setReportDetails('');
      },
      onError: error => setReportError(reportErrorCopy(error)),
    });
  }

  function retryProfileMedia() {
    setReadyImageKey('');
    setFailedImageKey('');
    setReadyAudioPath('');
    setFailedAudioPath('');
    setReadyVideoPath('');
    setFailedVideoPath('');
    setAudioError('');
    setMediaRetryCount(count => count + 1);
  }

  if (!profileOverride && query.isLoading) {
    return <div className="public-profile-loading-shell">
      <button type="button" className="enter-gate" disabled aria-label="กำลังโหลดโปรไฟล์">
        <span><LoaderCircle className="enter-gate-spinner" size={17} />Click to enter</span>
      </button>
    </div>;
  }
  if ((!profileOverride && query.isError) || !profile) {
    return <div className="public-error"><img className="public-error-logo" src={brandMarkLogoUrl} alt="gbloc" /><h1>ไม่พบพื้นที่นี้</h1><p>ลิงก์อาจไม่ถูกต้อง หรือเจ้าของยังไม่ได้สร้างหน้าโปรไฟล์</p><Link href="/" className="button button-outline" data-testid="link-public-home">กลับหน้าแรก</Link></div>;
  }

  const background = objectUrl(profile.backgroundPath);
  const backgroundStyle = {
    backgroundColor: profile.backgroundColor || '#000000',
    backgroundImage: 'none',
    '--profile-music-color': profile.musicColor || '#dfd7e8',
    '--profile-glow-strength': `${Math.max(0, Math.min(100, profile.glowIntensity ?? 45))}%`,
    '--profile-frame-color': profile.profileFrameColor || '#c296ff',
    '--profile-frame-background-color': profile.profileFrameBackgroundColor || '#17121d',
    '--profile-frame-blur': `${Math.max(0, Math.min(20, profile.profileFrameBlur ?? 8))}px`,
  } as CSSProperties;
  const mediaStyle: CSSProperties = {
    backgroundImage: background && profile.backgroundType !== 'video' ? `url("${background}")` : undefined,
    backgroundPosition: `${profile.focusX}% ${profile.focusY}%`,
    objectPosition: `${profile.focusX}% ${profile.focusY}%`,
    filter: profile.backgroundEffect === 'blur' ? `blur(${profile.dimOpacity / 5}px)` : undefined,
    transform: profile.backgroundEffect === 'blur' ? 'scale(1.08)' : undefined,
  };

  const premiumBackground = preview
    ? (previewAurora ? 'aurora' : previewStars ? 'stars' : previewRain ? 'rain' : profile.premiumBackground)
    : profile.premiumBackground;
  return <>
    <main className={`public-profile theme-${profile.theme}${preview ? ' profile-experience-preview' : ''}`}
    data-premium-background={premiumBackground}
    data-premium-font={profile.premiumFont}
    data-premium-text={profile.premiumTextEffect}
    style={{
      ...backgroundStyle,
      '--premium-background-strength': profile.premiumBackgroundStrength / 100,
    } as CSSProperties}>
    <div className="profile-background-frame" aria-hidden="true">{profile.backgroundType === 'video' && background
      ? <video
          key={`${background}-${mediaRetryCount}`}
          className="profile-background-layer"
          style={mediaStyle}
          src={background}
          autoPlay
          muted
          loop
          playsInline
          onLoadedData={() => {
            if (videoPath) {
              setReadyVideoPath(videoPath);
              setFailedVideoPath('');
            }
          }}
          onError={() => {
            if (videoPath) setFailedVideoPath(videoPath);
          }}
        />
      : <div className="profile-background-layer" style={mediaStyle} />}</div>
    <div className="profile-background-shade" style={{ opacity: profile.backgroundEffect === 'blur' ? 0 : profile.dimOpacity / 100 }} aria-hidden="true" />
    <div className="public-grain" aria-hidden="true" />
    {premiumBackground === 'aurora' && <RandomAurora className="profile-aurora" />}
    {premiumBackground === 'rain' && <RandomRain className="profile-rain" />}
    {premiumBackground === 'stars' && <>
      <RandomStars className="profile-random-stars" />
      <ShootingStars className="profile-shooting-stars" />
    </>}
    <div className={`public-column${profile.showProfileFrame ? '' : ' profile-frame-hidden'}`}>
      {profile.showAvatar && <div className={`public-avatar${profile.avatarPath ? ' has-image' : ''}`} style={{ color: profile.displayNameColor }}>
            {profile.avatarPath
              ? <img src={objectUrl(profile.avatarPath)} style={avatarImageStyle(profile)} alt={profile.displayName || 'รูปโปรไฟล์'} />
              : <span>{(profile.displayName || profile.username).slice(0, 1)}</span>}
          </div>}
      <h1 className="public-display-name" style={{ color: profile.displayNameColor }}>{profile.displayName || profile.username}</h1>
      {profile.showProBadge && <span className="public-pro-badge" aria-label="Pro member" title="Pro member"><BadgeCheck size={14} /> PRO</span>}
      {profile.bio && <p className="public-description" style={{ color: profile.descriptionColor }}>{profile.bio}</p>}
      {profile.location && <div className="public-location" style={{ color: profile.locationColor }}><MapPin size={14} style={{ color: 'inherit' }} />{profile.location}</div>}
      <div className="public-socials">
        {links.map(link => {
          const label = link.label || platformLabels[link.platform] || link.platform;
          return link.mode === 'text'
            ? <button className="public-social" style={{ color: profile.socialColor }} key={link.id} onClick={() => copyText(link)} aria-label={copyState === link.id ? `${label} คัดลอกแล้ว` : `คัดลอก ${label}`} data-testid={`button-copy-link-${link.id}`}>
                {copyState === link.id ? <Copy size={20} /> : <SocialGlyph platform={link.platform} icon={link.icon} />}
                <span className="public-social-tooltip" aria-hidden="true">{copyState === link.id ? 'คัดลอกแล้ว' : label}</span>
              </button>
            : <a className="public-social" style={{ color: profile.socialColor }} key={link.id} href={link.resolvedUrl || link.value} target="_blank" rel="noreferrer" aria-label={label} data-testid={`link-profile-${link.id}`}>
                <SocialGlyph platform={link.platform} icon={link.icon} />
                <span className="public-social-tooltip" aria-hidden="true">{label}</span>
              </a>;
        })}
      </div>
      <div className="public-media-area">
        {profile.showViews && <div className="public-views" style={{ color: profile.viewsColor }}><Eye size={14} />{(profile.viewCount + (viewRecordedFor === canonicalUsername ? 1 : 0)).toLocaleString('th-TH')}</div>}
        {activeTrack && profile.showMusicPlayer && <div className="public-player">
          <div className={`player-cover${profile.audioCoverPath || profile.avatarPath ? ' has-image' : ''}`}>
            {profile.audioCoverPath
              ? <img src={objectUrl(profile.audioCoverPath)} alt="" />
              : profile.avatarPath
                ? <img src={objectUrl(profile.avatarPath)} alt="" />
                : <Music2 size={23} />}
          </div>
          <div className="player-track">
            <strong className="player-title" title={activeTrack.title}>{activeTrack.title}</strong>
            <div className="player-timeline">
              <span>{formatTime(audioState.currentTime)}</span>
              <input
                type="range"
                min="0"
                max={audioState.duration || 0}
                step="0.1"
                value={Math.min(audioState.currentTime, audioState.duration || 0)}
                style={{ '--player-progress': `${audioState.duration > 0 ? Math.min(100, Math.max(0, (audioState.currentTime / audioState.duration) * 100)) : 0}%` } as CSSProperties}
                aria-label="ตำแหน่งเสียง"
                onChange={event => {
                if (audioRef.current) audioRef.current.currentTime = Number(event.target.value);
              }} />
              <span>{formatTime(audioState.duration)}</span>
            </div>
          </div>
          {audioTracks.length > 1 && <button className="player-button" onClick={() => changeTrack(-1)} aria-label="เสียงก่อนหน้า" data-testid="button-previous-audio">
            <SkipBack size={16} fill="currentColor" />
          </button>}
          <button className="player-button" onClick={toggleAudio} aria-label={audioState.playing ? 'หยุดเสียง' : 'เล่นเสียง'} data-testid="button-toggle-audio">
            {audioState.playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          {audioTracks.length > 1 && <button className="player-button" onClick={() => changeTrack(1)} aria-label="เสียงถัดไป" data-testid="button-next-audio">
            <SkipForward size={16} fill="currentColor" />
          </button>}
        </div>}
        {audioError && <p className="profile-audio-error" role="alert">{audioError}</p>}
      </div>
    </div>
    {activeTrack && profile.showVolumeControl && <div className="profile-volume-control">
      {volumePanelOpen && <div className="profile-volume-panel">
        <span>{playbackVolume}%</span>
        <input className="profile-volume-slider" type="range" min="0" max="100" step="1" value={playbackVolume}
          onChange={event => setPlaybackVolume(Number(event.target.value))}
          aria-label="ระดับเสียง" data-testid="input-profile-volume" />
      </div>}
      <button className="profile-volume-toggle" type="button" onClick={() => setVolumePanelOpen(open => !open)}
        aria-label={volumePanelOpen ? 'ซ่อนแถบปรับเสียง' : 'เปิดแถบปรับเสียง'} aria-expanded={volumePanelOpen}
        title="ระดับเสียง" data-testid="button-profile-volume">
        {playbackVolume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
      </button>
    </div>}
    {profile.showCredit && <a className="public-credit" href="/" data-testid="link-gbloc-credit">สร้างพื้นที่ของคุณด้วย <img className="public-credit-logo" src={brandFullLogoUrl} alt="gbloc" /></a>}
    {!preview && <>
      <button type="button" className="report-trigger" onClick={() => { setReportOpen(true); setReportError(''); }}
        aria-label="รายงานโปรไฟล์" title="รายงานโปรไฟล์" data-testid="button-report-profile">
        <AlertTriangle size={15} />
      </button>
      {reportSent && <div className="report-success" role="status" data-testid="status-report-sent">ส่งรายงานแล้ว ขอบคุณที่ช่วยดูแลชุมชน</div>}
      {reportOpen && <div className="report-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setReportOpen(false); }}>
        <section className="report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title" data-testid="dialog-report-profile">
          <h2 id="report-dialog-title">รายงานโปรไฟล์</h2>
          <p>ช่วยบอกเราเมื่อพบสิ่งที่ไม่เหมาะสม ทีมงานจะตรวจสอบอย่างระมัดระวัง</p>
          {!isSignedIn ? <div className="report-dialog-error" data-testid="status-report-sign-in-required">ต้องเข้าสู่ระบบก่อนส่งรายงาน <Link href="/sign-in" data-testid="link-report-sign-in">เข้าสู่ระบบ</Link></div>
            : <form onSubmit={submitReport}>
              <label className="report-field">ประเภทเหตุผล
                <Select value={reportReason} onValueChange={value => setReportReason(value as ProfileReportInputReason)}>
                  <SelectTrigger className="report-select-trigger" aria-label="ประเภทเหตุผล" data-testid="select-report-reason"><SelectValue /></SelectTrigger>
                  <SelectContent>{reportReasons.map(reason => <SelectItem key={reason.value} value={reason.value}>{reason.label}</SelectItem>)}</SelectContent>
                </Select>
              </label>
              <label className="report-field">เหตุผลประกอบ <span>จำเป็น</span>
                <textarea value={reportDetails} onChange={event => { setReportDetails(event.target.value); if (event.target.value.trim()) setReportError(''); }} required minLength={1} maxLength={1000} placeholder="อธิบายสิ่งที่พบ เพื่อให้ทีมงานตรวจสอบได้" data-testid="input-report-details" />
              </label>
              {reportError && <div className="report-dialog-error" role="alert" data-testid="status-report-error">{reportError}</div>}
              <div className="report-dialog-actions">
                <button type="button" className="moderation-action" onClick={() => setReportOpen(false)} data-testid="button-cancel-report">ยกเลิก</button>
                <button type="submit" className="moderation-action primary" disabled={createReport.isPending} data-testid="button-submit-report">{createReport.isPending ? 'กำลังส่ง…' : 'ส่งรายงาน'}</button>
              </div>
            </form>}
          {!isSignedIn && <div className="report-dialog-actions"><button type="button" className="moderation-action" onClick={() => setReportOpen(false)} data-testid="button-close-report">ปิด</button></div>}
        </section>
      </div>}
    </>}
    {!entered && <button
      className={`enter-gate ${gateLeaving ? 'is-leaving' : ''}`}
      onClick={enterProfile}
      disabled={gateLeaving || (!mediaReady && !mediaFailed)}
      aria-label={profile.enterText || 'Click to enter'}
      data-testid="button-enter-profile"
    >
      <span style={{ color: profile.enterTextColor }}>
        {showMediaSpinner && <LoaderCircle className="enter-gate-spinner" size={17} aria-hidden="true" />}
        {mediaFailed && <AlertTriangle className="enter-gate-warning" size={15} aria-hidden="true" />}
        {profile.enterText || 'Click to enter'}
      </span>
    </button>}
    {!entered && mediaFailed && <button type="button" className="enter-gate-retry" onClick={retryProfileMedia} data-testid="button-retry-profile-media">ลองโหลดสื่อใหม่</button>}
    </main>
    <audio
      ref={audioRef}
      className="profile-audio-source"
      src={activeTrack ? objectUrl(activeTrack.path) : undefined}
      preload={isPreviewProfile ? 'metadata' : 'auto'}
      loop={audioTracks.length < 2}
      onCanPlayThrough={() => {
        if (activeTrack?.path) {
          setReadyAudioPath(activeTrack.path);
          setFailedAudioPath('');
          setAudioError('');
        }
      }}
      onError={() => {
        if (activeTrack?.path) {
          setFailedAudioPath(activeTrack.path);
          setAudioError('โหลดเสียงไม่สำเร็จ ตรวจสอบไฟล์แล้วลองใหม่');
        }
      }}
      onEnded={() => {
        if (audioTracks.length > 1) {
          resumeAfterTrackChange.current = true;
          setActiveTrackIndex(index => (index + 1) % audioTracks.length);
        }
      }}
    />
  </>;
}
