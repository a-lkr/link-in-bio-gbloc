import type { ProfileLink, PublicProfile } from '@workspace/api-client-react';
import PublicProfilePage from '@/pages/public-profile';

/** The same renderer as the public route, but never records views or fetches a profile. */
export function ProfileExperience({
  profile, links, initiallyEntered = false, preview = false, previewAurora = false, previewStars = false, previewRain = false,
}: {
  profile: PublicProfile;
  links: ProfileLink[];
  initiallyEntered?: boolean;
  preview?: boolean;
  previewAurora?: boolean;
  previewStars?: boolean;
  previewRain?: boolean;
}) {
  return <PublicProfilePage
    username={profile.username}
    profileOverride={profile}
    linksOverride={links}
    initiallyEntered={initiallyEntered}
    preview={preview}
    previewAurora={previewAurora}
    previewStars={previewStars}
    previewRain={previewRain}
  />;
}
