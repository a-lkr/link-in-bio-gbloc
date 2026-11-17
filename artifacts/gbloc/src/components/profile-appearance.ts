import type { CSSProperties } from 'react';
import type { ProfileAppearanceInput } from '@workspace/api-client-react';

/** Non-destructive crop: the original upload (including PNG alpha) is unchanged. */
export function avatarImageStyle(profile: ProfileAppearanceInput): CSSProperties {
  return {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: `${profile.avatarX ?? 50}% ${profile.avatarY ?? 50}%`,
    transform: `scale(${(profile.avatarZoom ?? 100) / 100})`,
    transformOrigin: `${profile.avatarX ?? 50}% ${profile.avatarY ?? 50}%`,
  };
}
