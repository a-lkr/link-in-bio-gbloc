import {
  SiBluesky,
  SiDiscord,
  SiFacebook,
  SiGithub,
  SiInstagram,
  SiKofi,
  SiLinktree,
  SiMastodon,
  SiMedium,
  SiPatreon,
  SiPinterest,
  SiReddit,
  SiSoundcloud,
  SiSpotify,
  SiTelegram,
  SiThreads,
  SiTiktok,
  SiTwitch,
  SiWhatsapp,
  SiX,
  SiYoutube,
} from 'react-icons/si';
import type { IconType } from 'react-icons';
import type { ProfileLinkInputIcon } from '@workspace/api-client-react';
import { Link2 } from 'lucide-react';

export const customLinkIconOptions = [
  { value: 'bluesky', label: 'Bluesky', Icon: SiBluesky },
  { value: 'discord', label: 'Discord', Icon: SiDiscord },
  { value: 'facebook', label: 'Facebook', Icon: SiFacebook },
  { value: 'github', label: 'GitHub', Icon: SiGithub },
  { value: 'instagram', label: 'Instagram', Icon: SiInstagram },
  { value: 'kofi', label: 'Ko-fi', Icon: SiKofi },
  { value: 'linktree', label: 'Linktree', Icon: SiLinktree },
  { value: 'mastodon', label: 'Mastodon', Icon: SiMastodon },
  { value: 'medium', label: 'Medium', Icon: SiMedium },
  { value: 'patreon', label: 'Patreon', Icon: SiPatreon },
  { value: 'pinterest', label: 'Pinterest', Icon: SiPinterest },
  { value: 'reddit', label: 'Reddit', Icon: SiReddit },
  { value: 'soundcloud', label: 'SoundCloud', Icon: SiSoundcloud },
  { value: 'spotify', label: 'Spotify', Icon: SiSpotify },
  { value: 'telegram', label: 'Telegram', Icon: SiTelegram },
  { value: 'threads', label: 'Threads', Icon: SiThreads },
  { value: 'tiktok', label: 'TikTok', Icon: SiTiktok },
  { value: 'twitch', label: 'Twitch', Icon: SiTwitch },
  { value: 'whatsapp', label: 'WhatsApp', Icon: SiWhatsapp },
  { value: 'x', label: 'X', Icon: SiX },
  { value: 'youtube', label: 'YouTube', Icon: SiYoutube },
] satisfies { value: Exclude<ProfileLinkInputIcon, null>; label: string; Icon: IconType }[];

export function CustomLinkGlyph({ icon, size = 22 }: { icon?: string | null; size?: number }) {
  const Icon = customLinkIconOptions.find(option => option.value === icon)?.Icon;
  return Icon ? <Icon size={size} aria-hidden="true" /> : <Link2 size={size} strokeWidth={2} aria-hidden="true" />;
}
