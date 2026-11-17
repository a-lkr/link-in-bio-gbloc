import type { Profile, ProfileUpdateInput } from '@workspace/api-client-react';

export const hexRule = /^#[0-9A-Fa-f]{6}$/;

export const colorFields = [
  { key: 'displayNameColor', label: 'Display Name', hint: 'ชื่อตัวใหญ่' },
  { key: 'descriptionColor', label: 'Description', hint: 'ข้อความใต้ชื่อ' },
  { key: 'locationColor', label: 'Location', hint: 'ตำแหน่ง/สถานะ' },
  { key: 'socialColor', label: 'ไอคอนโซเชียล', hint: 'ลิงก์ทั้งหมด' },
  { key: 'musicColor', label: 'เครื่องเล่นเสียง', hint: 'ชื่อแทร็กและปุ่ม' },
  { key: 'viewsColor', label: 'ยอดเข้าชม', hint: 'ตัวนับผู้เข้าชม' },
  { key: 'enterTextColor', label: 'ข้อความหน้ากดเข้า', hint: 'Click to Enter' },
  { key: 'backgroundColor', label: 'สีพื้นหลังสำรอง', hint: 'ใช้เมื่อไม่มีภาพ' },
] as const;

export const profileFrameColorField = { key: 'profileFrameColor', label: 'สีกรอบโปรไฟล์', hint: 'เส้นขอบกรอบ' } as const;
export const profileFrameBackgroundColorField = { key: 'profileFrameBackgroundColor', label: 'สีพื้นหลังกรอบ', hint: 'พื้นด้านในกรอบ' } as const;
const allColorFields = [...colorFields, profileFrameColorField, profileFrameBackgroundColorField] as const;

export type ColorKey = typeof allColorFields[number]['key'];

export type Draft = {
  username: string;
  displayName: string;
  bio: string;
  location: string;
  showAvatar: boolean;
  showProfileFrame: boolean;
  profileFrameBlur: number;
  avatarPath: string | null;
  avatarZoom: number;
  avatarX: number;
  avatarY: number;
  backgroundType: Profile['backgroundType'];
  backgroundPath: string | null;
  backgroundEffect: Profile['backgroundEffect'];
  focusX: number;
  focusY: number;
  dimOpacity: number;
  audioPath: string | null;
  audioTitle: string;
  audioCoverPath: string | null;
  extraAudioTracks: { path: string | null; title: string }[];
  showMusicPlayer: boolean;
  showVolumeControl: boolean;
  musicVolume: number;
  showViews: boolean;
  enterText: string;
  glowIntensity: number;
  premiumBackground: Profile['premiumBackground'];
  premiumBackgroundStrength: number;
  premiumFont: Profile['premiumFont'];
  premiumTextEffect: Profile['premiumTextEffect'];
  showProBadge: boolean;
  showCredit: boolean;
} & Record<ColorKey, string>;

export const draftKeys: (keyof Draft)[] = [
  'username', 'displayName', 'bio', 'location', 'showAvatar', 'avatarPath', 'avatarZoom', 'avatarX', 'avatarY',
  'showProfileFrame', 'profileFrameBlur',
  'backgroundType', 'backgroundPath', 'backgroundEffect', 'focusX', 'focusY', 'dimOpacity', 'audioPath', 'audioTitle',
  'audioCoverPath', 'extraAudioTracks', 'showMusicPlayer', 'showVolumeControl', 'musicVolume', 'showViews', 'enterText', 'glowIntensity',
  'premiumBackground', 'premiumBackgroundStrength', 'premiumFont', 'premiumTextEffect', 'showProBadge', 'showCredit',
  ...allColorFields.map(c => c.key),
];

export function draftFromProfile(p: Profile): Draft {
  return {
    username: p.username,
    displayName: p.displayName ?? '',
    bio: p.bio ?? '',
    location: p.location ?? '',
    showAvatar: p.showAvatar,
    showProfileFrame: p.showProfileFrame ?? true,
    profileFrameBlur: p.profileFrameBlur ?? 8,
    avatarPath: p.avatarPath,
    avatarZoom: p.avatarZoom ?? 100,
    avatarX: p.avatarX ?? 50,
    avatarY: p.avatarY ?? 50,
    backgroundType: p.backgroundType,
    backgroundPath: p.backgroundPath,
    backgroundEffect: p.backgroundEffect ?? 'black',
    focusX: p.focusX ?? 50,
    focusY: p.focusY ?? 50,
    dimOpacity: p.dimOpacity ?? 0,
    audioPath: p.audioPath,
    audioTitle: p.audioTitle ?? '',
    audioCoverPath: p.audioCoverPath,
    extraAudioTracks: [0, 1, 2].map(index => ({
      path: p.extraAudioTracks?.[index]?.path ?? null,
      title: p.extraAudioTracks?.[index]?.title ?? '',
    })),
    showMusicPlayer: p.showMusicPlayer,
    showVolumeControl: p.showVolumeControl,
    musicVolume: p.musicVolume ?? 80,
    showViews: p.showViews,
    enterText: p.enterText ?? '',
    glowIntensity: p.glowIntensity ?? 45,
    premiumBackground: p.premiumBackground,
    premiumBackgroundStrength: p.premiumBackgroundStrength,
    premiumFont: p.premiumFont,
    premiumTextEffect: p.premiumTextEffect,
    showProBadge: p.showProBadge,
    showCredit: p.showCredit,
    profileFrameColor: p.profileFrameColor ?? '#c296ff',
    profileFrameBackgroundColor: p.profileFrameBackgroundColor ?? '#17121d',
    displayNameColor: p.displayNameColor,
    descriptionColor: p.descriptionColor,
    locationColor: p.locationColor,
    socialColor: p.socialColor,
    musicColor: p.musicColor,
    viewsColor: p.viewsColor,
    enterTextColor: p.enterTextColor,
    backgroundColor: p.backgroundColor,
  };
}

function sameValue(key: keyof Draft, a: Draft[keyof Draft], b: Draft[keyof Draft]) {
  return key === 'extraAudioTracks' ? JSON.stringify(a) === JSON.stringify(b) : a === b;
}
export const sameDraft = (a: Draft, b: Draft) => draftKeys.every(k => sameValue(k, a[k], b[k]));
export const changedKeys = (a: Draft, b: Draft) => draftKeys.filter(k => !sameValue(k, a[k], b[k]));

/** After a save, keep any field edited while the request was in flight. */
export function mergeAfterSave(current: Draft, sent: Draft, fresh: Draft): Draft {
  const next = { ...current } as Record<keyof Draft, unknown>;
  for (const k of draftKeys) if (sameValue(k, current[k], sent[k])) next[k] = fresh[k];
  return next as Draft;
}

export const invalidColorKeys = (d: Draft) => allColorFields.filter(c => !hexRule.test(d[c.key])).map(c => c.key);

const int = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));

/** Explicit whitelist: never send server-only Profile fields. */
export function toUpdateInput(d: Draft, includePremium: boolean, includePro: boolean): ProfileUpdateInput {
  return {
    username: d.username.toLowerCase(),
    displayName: d.displayName,
    bio: d.bio,
    location: d.location,
    showAvatar: d.showAvatar,
    showProfileFrame: d.showProfileFrame,
    profileFrameColor: d.profileFrameColor,
    profileFrameBackgroundColor: d.profileFrameBackgroundColor,
    profileFrameBlur: int(d.profileFrameBlur, 0, 20),
    avatarPath: d.avatarPath,
    avatarZoom: int(d.avatarZoom, 100, 300),
    avatarX: int(d.avatarX, 0, 100),
    avatarY: int(d.avatarY, 0, 100),
    backgroundType: d.backgroundPath ? d.backgroundType : null,
    backgroundPath: d.backgroundPath,
    backgroundEffect: d.backgroundEffect,
    focusX: int(d.focusX, 0, 100),
    focusY: int(d.focusY, 0, 100),
    dimOpacity: int(d.dimOpacity, 0, 100),
    audioPath: d.audioPath,
    audioTitle: d.audioTitle,
    audioCoverPath: d.audioCoverPath,
    showMusicPlayer: d.showMusicPlayer,
    showVolumeControl: d.showVolumeControl,
    musicVolume: int(d.musicVolume, 0, 100),
    showViews: d.showViews,
    enterText: d.enterText,
    glowIntensity: int(d.glowIntensity, 0, 100),
    ...(includePremium ? {
      premiumBackground: d.premiumBackground,
      premiumBackgroundStrength: int(d.premiumBackgroundStrength, 0, 100),
      premiumFont: d.premiumFont,
      premiumTextEffect: d.premiumTextEffect,
      showCredit: d.showCredit,
    } : {}),
    ...(includePro ? { showProBadge: d.showProBadge, extraAudioTracks: d.extraAudioTracks } : {}),
    ...(!includePro && !d.showProBadge ? { showProBadge: false } : {}),
    displayNameColor: d.displayNameColor,
    descriptionColor: d.descriptionColor,
    locationColor: d.locationColor,
    socialColor: d.socialColor,
    musicColor: d.musicColor,
    viewsColor: d.viewsColor,
    enterTextColor: d.enterTextColor,
    backgroundColor: d.backgroundColor,
  };
}

/** Profile-shaped object for previews; invalid in-progress hex falls back to last saved. */
export function previewProfile(server: Profile, d: Draft, base: Draft): Profile {
  const colors = Object.fromEntries(allColorFields.map(c => [c.key, hexRule.test(d[c.key]) ? d[c.key] : base[c.key]]));
  return { ...server, ...d, ...colors, username: d.username.toLowerCase() } as Profile;
}
