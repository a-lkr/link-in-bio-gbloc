export const GENERAL_PROFILE_LINK_LIMIT = 2;
export const MEMBER_PROFILE_LINK_LIMIT = 5;

export const EXPIRED_MEMBERSHIP_PROFILE_DEFAULTS = {
  premiumBackground: "none",
  premiumBackgroundStrength: 55,
  premiumFont: "default",
  premiumTextEffect: "none",
  showProBadge: false,
  showCredit: true,
  extraAudioTracks: [] as { path: string | null; title: string }[],
};

export const BASIC_PROFILE_PRO_DEFAULTS = {
  showProBadge: false,
  extraAudioTracks: [] as { path: string | null; title: string }[],
};

export function getProfileLinkLimit(plan: string | null | undefined): number {
  return plan === "basic" || plan === "pro"
    ? MEMBER_PROFILE_LINK_LIMIT
    : GENERAL_PROFILE_LINK_LIMIT;
}

/**
 * Preserve existing links when a plan change lowers the limit, but never allow
 * a save to increase a profile beyond its current quota.
 */
export function canReplaceProfileLinkCount(
  nextCount: number,
  currentCount: number,
  limit: number,
): boolean {
  return nextCount <= limit || nextCount <= currentCount;
}

export function getExcessProfileLinkIds(
  orderedLinks: readonly { id: string }[],
  limit: number,
): string[] {
  return orderedLinks.slice(limit).map(({ id }) => id);
}
