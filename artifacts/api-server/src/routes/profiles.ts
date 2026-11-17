import { getAuth } from "../lib/auth";
import { and, asc, count, eq, inArray, notExists, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  CheckUsernameAvailabilityQueryParams,
  CheckUsernameAvailabilityResponse,
  GetAccountSummaryResponse,
  GetMyProfileResponse,
  GetPublicProfileParams,
  GetPublicProfileResponse,
  RecordProfileViewParams,
  RecordProfileViewResponse,
  ReplaceMyProfileLinksBody,
  ReplaceMyProfileLinksResponse,
  type ProfileLinkInput,
  UpdateMyProfileBody,
  UpdateMyProfileResponse,
} from "@workspace/api-zod";
import {
  db,
  accountDeletionRequestsTable,
  profileAssetsTable,
  profileLinksTable,
  profilesTable,
} from "@workspace/db";
import { hasActiveAccountDeletion } from "../lib/accountDeletion";
import { getActiveMembership } from "../lib/membershipAccess";
import { cleanupExpiredProfileEntitlements } from "../lib/profileEntitlementCleanup";
import {
  canReplaceProfileLinkCount,
  getProfileLinkLimit,
} from "../lib/profileLinkQuota";
import {
  buildProfileShareDocument,
  profileShareImageUrl,
} from "../lib/profileShare";
import { buildSitemapXml } from "../lib/sitemap";
import {
  profileViewLimiter,
  publicProfileLimiter,
  usernameAvailabilityLimiter,
} from "../middlewares/rateLimits";

const router: IRouter = Router();
export const publicProfileShareRouter: IRouter = Router();

router.get("/sitemap.xml", async (_req, res): Promise<void> => {
  const profiles = await db
    .select({
      username: profilesTable.username,
      updatedAt: profilesTable.updatedAt,
    })
    .from(profilesTable)
    .where(
      and(
        eq(profilesTable.isSuspended, false),
        notExists(
          db
            .select({ id: accountDeletionRequestsTable.id })
            .from(accountDeletionRequestsTable)
            .where(eq(accountDeletionRequestsTable.ownerId, profilesTable.ownerId)),
        ),
      ),
    )
    .orderBy(asc(profilesTable.username));

  res
    .set("Cache-Control", "public, max-age=900, stale-while-revalidate=3600")
    .type("application/xml")
    .send(buildSitemapXml(profiles, process.env.GBLOC_PUBLIC_ORIGIN));
});

const platformLabels: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  threads: "Threads",
  x: "X",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
  reddit: "Reddit",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  tumblr: "Tumblr",
  vk: "VK",
  wechat: "WeChat",
  xiaohongshu: "Xiaohongshu",
  line: "LINE",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  messenger: "Messenger",
  youtube: "YouTube",
  vimeo: "Vimeo",
  kick: "Kick",
  applemusic: "Apple Music",
  soundcloud: "SoundCloud",
  bandcamp: "Bandcamp",
  behance: "Behance",
  dribbble: "Dribbble",
  artstation: "ArtStation",
  deviantart: "DeviantArt",
  flickr: "Flickr",
  patreon: "Patreon",
  kofi: "Ko-fi",
  buymeacoffee: "Buy Me a Coffee",
  onlyfans: "OnlyFans",
  medium: "Medium",
  substack: "Substack",
  gumroad: "Gumroad",
  discord: "Discord",
  github: "GitHub",
  gitlab: "GitLab",
  stackoverflow: "Stack Overflow",
  codepen: "CodePen",
  devto: "Dev.to",
  spotify: "Spotify",
  twitch: "Twitch",
  steam: "Steam",
  roblox: "Roblox",
  itchio: "itch.io",
  linktree: "Linktree",
  website: "Website",
  custom: "Link",
};

const usernameBases: Record<string, string> = {
  instagram: "https://www.instagram.com/",
  facebook: "https://www.facebook.com/",
  tiktok: "https://www.tiktok.com/@",
  threads: "https://www.threads.net/@",
  youtube: "https://www.youtube.com/@",
  soundcloud: "https://soundcloud.com/",
  discord: "https://discord.gg/",
  github: "https://github.com/",
  gitlab: "https://gitlab.com/",
  codepen: "https://codepen.io/",
  devto: "https://dev.to/",
  spotify: "https://open.spotify.com/user/",
  twitch: "https://www.twitch.tv/",
  x: "https://x.com/",
  pinterest: "https://www.pinterest.com/",
  snapchat: "https://www.snapchat.com/add/",
  reddit: "https://www.reddit.com/user/",
  bluesky: "https://bsky.app/profile/",
  telegram: "https://t.me/",
  messenger: "https://m.me/",
  vimeo: "https://vimeo.com/",
  kick: "https://kick.com/",
  vk: "https://vk.com/",
  patreon: "https://www.patreon.com/",
  kofi: "https://ko-fi.com/",
  buymeacoffee: "https://buymeacoffee.com/",
  onlyfans: "https://onlyfans.com/",
  medium: "https://medium.com/@",
  behance: "https://www.behance.net/",
  dribbble: "https://dribbble.com/",
  artstation: "https://www.artstation.com/",
  deviantart: "https://www.deviantart.com/",
  linktree: "https://linktr.ee/",
};
const directUrlPlatforms = new Set([
  "linkedin",
  "mastodon",
  "line",
  "wechat",
  "xiaohongshu",
  "applemusic",
  "bandcamp",
  "flickr",
  "substack",
  "gumroad",
  "stackoverflow",
  "steam",
  "roblox",
  "itchio",
]);

function userIdFromRequest(req: Parameters<typeof getAuth>[0]): string | null {
  return getAuth(req).userId ?? null;
}

function invalidUsernameReason(value: string): string | null {
  if (!/^[A-Za-z0-9_]{3,20}$/.test(value)) {
    return "Use 3–20 letters, numbers, or underscores.";
  }
  return null;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export function resolveLinkUrl(platform: string, mode: string, value: string): string | null {
  if (mode === "text") return null;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Use a valid website URL.");
    }
    return parsed.toString();
  }
  if (platform === "website" || platform === "custom") {
    const parsed = new URL(`https://${trimmed}`);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Use a valid website URL.");
    }
    return parsed.toString();
  }
  if (directUrlPlatforms.has(platform)) {
    throw new Error("Paste the full profile URL, including https://.");
  }

  const username = trimmed.replace(/^@/, "");
  if (platform === "whatsapp") {
    if (!/^\+?[\d\s().-]+$/.test(trimmed)) {
      throw new Error("Enter a phone number with country code.");
    }
    const phone = trimmed.replace(/[^\d]/g, "");
    if (!/^\d{7,15}$/.test(phone)) {
      throw new Error("Enter a phone number with country code.");
    }
    return `https://wa.me/${phone}`;
  }
  if (platform === "tumblr") {
    if (username.length > 63 || !/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(username)) {
      throw new Error("Enter a valid Tumblr blog name.");
    }
    return `https://${username}.tumblr.com`;
  }
  const base = usernameBases[platform];
  if (!base) throw new Error("This link type is not supported.");
  if (!username || /[\s/?#]/.test(username)) {
    throw new Error("Enter a username without a URL or spaces.");
  }
  return `${base}${encodeURIComponent(username)}`;
}

function serializeLink(link: typeof profileLinksTable.$inferSelect) {
  return {
    id: link.id,
    platform: link.platform,
    mode: link.mode,
    value: link.value,
    label: link.label,
    icon: link.icon,
    resolvedUrl: resolveLinkUrl(link.platform, link.mode, link.value),
    sortOrder: link.sortOrder,
  };
}

async function getOrCreateProfile(ownerId: string) {
  const [existing] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.ownerId, ownerId))
    .limit(1);
  if (existing) return existing;

  const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
  const [created] = await db
    .insert(profilesTable)
    .values({
      ownerId,
      username: `user_${suffix}`,
      displayName: "",
    })
    .onConflictDoNothing({ target: profilesTable.ownerId })
    .returning();
  if (created) return created;

  const [raced] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.ownerId, ownerId))
    .limit(1);
  if (!raced) throw new Error("Could not create the profile.");
  return raced;
}

async function getLinks(profileId: string) {
  return db
    .select()
    .from(profileLinksTable)
    .where(eq(profileLinksTable.profileId, profileId))
    .orderBy(asc(profileLinksTable.sortOrder), asc(profileLinksTable.createdAt));
}

async function validateOwnedAssetPaths(
  ownerId: string,
  paths: Array<string | null | undefined>,
): Promise<boolean> {
  const requested = [...new Set(paths.filter((path): path is string => !!path))];
  if (!requested.length) return true;
  const matches = await db
    .select({ objectPath: profileAssetsTable.objectPath })
    .from(profileAssetsTable)
    .where(
      and(
        eq(profileAssetsTable.ownerId, ownerId),
        eq(profileAssetsTable.isPublic, true),
        inArray(profileAssetsTable.objectPath, requested),
      ),
    );
  return matches.length === requested.length;
}

router.get("/profiles/me", async (req, res): Promise<void> => {
  const ownerId = userIdFromRequest(req);
  if (!ownerId) {
    res.status(401).json({ error: "Sign-in required." });
    return;
  }
  await cleanupExpiredProfileEntitlements(ownerId);
  const profile = await getOrCreateProfile(ownerId);
  const links = await getLinks(profile.id);
  res.json(
    GetMyProfileResponse.parse({
      profile,
      links: links.map(serializeLink),
    }),
  );
});

router.use("/profiles/username-availability", usernameAvailabilityLimiter);
router.use("/profiles/:username/views", profileViewLimiter);
router.use("/profiles/:username", (req, res, next) => {
  if (
    req.method !== "GET" ||
    req.params.username === "username-availability"
  ) {
    next();
    return;
  }
  publicProfileLimiter(req, res, next);
});

router.get("/profiles/username-availability", async (req, res): Promise<void> => {
  const parsed = CheckUsernameAvailabilityQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const username = parsed.data.username.toLowerCase();
  const reason = invalidUsernameReason(parsed.data.username);
  if (reason) {
    res.json(
      CheckUsernameAvailabilityResponse.parse({
        available: false,
        username,
        reason,
      }),
    );
    return;
  }

  const ownerId = userIdFromRequest(req);
  const [ownProfile] = ownerId
    ? await db
        .select({ id: profilesTable.id })
        .from(profilesTable)
        .where(
          and(
            eq(profilesTable.ownerId, ownerId),
            eq(profilesTable.username, username),
          ),
        )
        .limit(1)
    : [];
  const [claimed] = await db
    .select({ id: profilesTable.id })
    .from(profilesTable)
    .where(eq(profilesTable.username, username))
    .limit(1);
  const available = !claimed || claimed.id === ownProfile?.id;
  res.json(
    CheckUsernameAvailabilityResponse.parse({
      available,
      username,
      reason: available ? null : "That username is already taken.",
    }),
  );
});

router.patch("/profiles/me", async (req, res): Promise<void> => {
  const ownerId = userIdFromRequest(req);
  if (!ownerId) {
    res.status(401).json({ error: "Sign-in required." });
    return;
  }
  if (await hasActiveAccountDeletion(ownerId)) {
    res.status(409).json({ error: "Cancel account deletion before editing your profile." });
    return;
  }
  await cleanupExpiredProfileEntitlements(ownerId);
  const parsed = UpdateMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const profile = await getOrCreateProfile(ownerId);
  const membership = await getActiveMembership(ownerId);
  const premiumStyleRequested = [
    parsed.data.premiumBackground,
    parsed.data.premiumBackgroundStrength,
    parsed.data.premiumFont,
    parsed.data.premiumTextEffect,
  ].some((value) => value !== undefined);
  if (parsed.data.showCredit === false && !membership) {
    res.status(403).json({ error: "An active Basic or Pro membership is required to hide the GBLOC credit." });
    return;
  }
  if (premiumStyleRequested && !membership) {
    res.status(403).json({ error: "An active Basic or Pro membership is required." });
    return;
  }
  if (parsed.data.extraAudioTracks !== undefined && membership?.plan !== "pro") {
    res.status(403).json({ error: "An active Pro membership is required for extra profile songs." });
    return;
  }
  if (parsed.data.showProBadge === true && membership?.plan !== "pro") {
    res.status(403).json({ error: "An active Pro membership is required for the Pro badge." });
    return;
  }
  const update: Partial<typeof profilesTable.$inferInsert> = {};
  const body = parsed.data;

  if (body.username !== undefined) {
    const reason = invalidUsernameReason(body.username);
    if (reason) {
      res.status(400).json({ error: reason });
      return;
    }
    const username = body.username.toLowerCase();
    const [claimed] = await db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.username, username))
      .limit(1);
    if (claimed && claimed.id !== profile.id) {
      res.status(409).json({ error: "That username is already taken." });
      return;
    }
    update.username = username;
  }

  if (body.avatarPath !== undefined) update.avatarPath = body.avatarPath;
  if (body.backgroundPath !== undefined) {
    update.backgroundPath = body.backgroundPath;
  }
  if (body.backgroundType !== undefined) {
    update.backgroundType = body.backgroundType;
  }
  if (body.audioPath !== undefined) update.audioPath = body.audioPath;
  if (body.audioCoverPath !== undefined) update.audioCoverPath = body.audioCoverPath;

  const requestedAssets = [
    body.avatarPath,
    body.backgroundPath,
    body.audioPath,
    body.audioCoverPath,
    ...(body.extraAudioTracks ?? []).map((track) => track.path),
  ];
  if (!(await validateOwnedAssetPaths(ownerId, requestedAssets))) {
    res.status(400).json({ error: "Choose an uploaded file from this account." });
    return;
  }
  if (
    body.backgroundPath !== undefined &&
    body.backgroundPath !== null &&
    body.backgroundType === undefined &&
    profile.backgroundType === null
  ) {
    res.status(400).json({ error: "Choose whether the background is an image or video." });
    return;
  }

  if (body.displayName !== undefined) update.displayName = body.displayName;
  if (body.bio !== undefined) update.bio = body.bio;
  if (body.showAvatar !== undefined) update.showAvatar = body.showAvatar;
  if (body.location !== undefined) update.location = body.location;
  if (body.theme !== undefined) update.theme = body.theme;
  if (body.backgroundColor !== undefined) update.backgroundColor = body.backgroundColor;
  for (const key of [
    "displayNameColor", "descriptionColor", "locationColor", "socialColor",
    "musicColor", "viewsColor", "enterTextColor", "profileFrameColor", "profileFrameBackgroundColor", "profileFrameBlur", "backgroundEffect",
    "avatarX", "avatarY", "avatarZoom", "glowIntensity",
  ] as const) {
    const value = body[key];
    if (value !== undefined) Object.assign(update, { [key]: value });
  }
  if (body.showProfileFrame !== undefined) update.showProfileFrame = body.showProfileFrame;
  if (body.audioTitle !== undefined) update.audioTitle = body.audioTitle;
  if (body.extraAudioTracks !== undefined) update.extraAudioTracks = body.extraAudioTracks;
  if (body.showMusicPlayer !== undefined) update.showMusicPlayer = body.showMusicPlayer;
  if (body.showVolumeControl !== undefined) update.showVolumeControl = body.showVolumeControl;
  if (body.focusX !== undefined) update.focusX = body.focusX;
  if (body.focusY !== undefined) update.focusY = body.focusY;
  if (body.dimOpacity !== undefined) update.dimOpacity = body.dimOpacity;
  if (body.enterText !== undefined) update.enterText = body.enterText;
  if (body.showViews !== undefined) update.showViews = body.showViews;
  if (body.premiumBackground !== undefined) update.premiumBackground = body.premiumBackground;
  if (body.premiumBackgroundStrength !== undefined) update.premiumBackgroundStrength = body.premiumBackgroundStrength;
  if (body.premiumFont !== undefined) update.premiumFont = body.premiumFont;
  if (body.premiumTextEffect !== undefined) update.premiumTextEffect = body.premiumTextEffect;
  if (body.showProBadge !== undefined) update.showProBadge = body.showProBadge;
  if (body.showCredit !== undefined) update.showCredit = body.showCredit;

  if (body.backgroundPath === null && body.backgroundType === undefined) {
    update.backgroundType = null;
  }

  try {
    const [updated] = await db
      .update(profilesTable)
      .set(update)
      .where(eq(profilesTable.id, profile.id))
      .returning();
    res.json(UpdateMyProfileResponse.parse(updated));
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "That username is already taken." });
      return;
    }
    throw error;
  }
});

router.put("/profiles/me/links", async (req, res): Promise<void> => {
  const ownerId = userIdFromRequest(req);
  if (!ownerId) {
    res.status(401).json({ error: "Sign-in required." });
    return;
  }
  if (await hasActiveAccountDeletion(ownerId)) {
    res.status(409).json({ error: "Cancel account deletion before editing your profile." });
    return;
  }
  const parsed = ReplaceMyProfileLinksBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let prepared: Array<{
    profileId: string;
    platform: string;
    mode: string;
    value: string;
    label: string | null;
    icon: string | null;
    sortOrder: number;
  }>;
  try {
    prepared = parsed.data.links.map(
      (link: ProfileLinkInput, sortOrder: number) => {
        if (!link.value.trim()) throw new Error("Link value cannot be empty.");
        resolveLinkUrl(link.platform, link.mode, link.value);
        return {
          profileId: "",
          platform: link.platform,
          mode: link.mode,
          value: link.value.trim(),
          label: link.label?.trim() || null,
          icon: link.icon ?? null,
          sortOrder,
        };
      },
    );
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Invalid link.",
    });
    return;
  }

  await cleanupExpiredProfileEntitlements(ownerId);
  const membership = await getActiveMembership(ownerId);
  const linkLimit = getProfileLinkLimit(membership?.plan);
  const profile = await getOrCreateProfile(ownerId);
  const links = await db.transaction(async (tx) => {
    await tx
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.id, profile.id))
      .for("update");
    const currentLinks = await tx
      .select({ id: profileLinksTable.id })
      .from(profileLinksTable)
      .where(eq(profileLinksTable.profileId, profile.id));
    if (
      !canReplaceProfileLinkCount(
        prepared.length,
        currentLinks.length,
        linkLimit,
      )
    ) {
      return null;
    }
    await tx
      .delete(profileLinksTable)
      .where(eq(profileLinksTable.profileId, profile.id));
    if (!prepared.length) return [];
    return tx
      .insert(profileLinksTable)
      .values(prepared.map((link) => ({ ...link, profileId: profile.id })))
      .returning();
  });
  if (links === null) {
    res.status(403).json({
      error: `บัญชีทั่วไปมีลิงก์ได้สูงสุด 2 รายการ ส่วน Basic และ Pro ได้สูงสุด 5 รายการ`,
    });
    return;
  }
  res.json(
    ReplaceMyProfileLinksResponse.parse(
      links.map((link) => ({
        ...link,
        resolvedUrl: resolveLinkUrl(link.platform, link.mode, link.value),
      })),
    ),
  );
});

router.get("/profiles/:username", async (req, res): Promise<void> => {
  const params = GetPublicProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }
  const username = params.data.username.toLowerCase();
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(
      and(
        eq(profilesTable.username, username),
        eq(profilesTable.isSuspended, false),
        notExists(
          db
            .select({ id: accountDeletionRequestsTable.id })
            .from(accountDeletionRequestsTable)
            .where(eq(accountDeletionRequestsTable.ownerId, profilesTable.ownerId)),
        ),
      ),
    )
    .limit(1);
  if (!profile) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }
  const membership = await getActiveMembership(profile.ownerId);
  const links = await getLinks(profile.id);
  const { ownerId: _ownerId, id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...publicProfile } = profile;
  res.json(
    GetPublicProfileResponse.parse({
      profile: {
        ...publicProfile,
        premiumBackground: membership ? profile.premiumBackground : "none",
        premiumBackgroundStrength: membership ? profile.premiumBackgroundStrength : 0,
        premiumFont: membership ? profile.premiumFont : "default",
        premiumTextEffect: membership ? profile.premiumTextEffect : "none",
        showProBadge: membership?.plan === "pro" && profile.showProBadge,
        showCredit: membership ? profile.showCredit : true,
        extraAudioTracks: membership?.plan === "pro" ? profile.extraAudioTracks : [],
      },
      links: links
        .slice(0, getProfileLinkLimit(membership?.plan))
        .map(serializeLink),
    }),
  );
});

publicProfileShareRouter.get(
  "/@:username",
  publicProfileLimiter,
  async (req, res): Promise<void> => {
    const params = GetPublicProfileParams.safeParse(req.params);
    const origin = new URL(process.env.GBLOC_PUBLIC_ORIGIN || `${req.protocol}://${req.get("host")}`).origin;
    let pageUrl: string;
    try {
      const resolvedPageUrl = new URL(req.originalUrl, origin);
      resolvedPageUrl.search = "";
      resolvedPageUrl.hash = "";
      pageUrl = resolvedPageUrl.toString();
    } catch {
      res.status(400).send("Invalid profile URL.");
      return;
    }

    if (!params.success) {
      res
        .status(404)
        .type("html")
        .send(buildProfileShareDocument({
          title: "ไม่พบโปรไฟล์ | GBLOC",
          description: "ไม่พบโปรไฟล์ที่ต้องการบน GBLOC",
          imageUrl: new URL("/brand-full.png", origin).toString(),
          pageUrl,
          robots: "noindex, nofollow",
        }));
      return;
    }

    const username = params.data.username.toLowerCase();
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(
        and(
          eq(profilesTable.username, username),
          eq(profilesTable.isSuspended, false),
          notExists(
            db
              .select({ id: accountDeletionRequestsTable.id })
              .from(accountDeletionRequestsTable)
              .where(eq(accountDeletionRequestsTable.ownerId, profilesTable.ownerId)),
          ),
        ),
      )
      .limit(1);

    if (!profile) {
      res
        .status(404)
        .type("html")
        .send(buildProfileShareDocument({
          title: "ไม่พบโปรไฟล์ | GBLOC",
          description: "ไม่พบโปรไฟล์ที่ต้องการบน GBLOC",
          imageUrl: new URL("/brand-full.png", origin).toString(),
          pageUrl,
          robots: "noindex, nofollow",
        }));
      return;
    }

    pageUrl = new URL(`/@${encodeURIComponent(profile.username.toLowerCase())}`, origin).href;
    const requestPath = new URL(req.originalUrl, origin).pathname;
    if (requestPath !== new URL(pageUrl).pathname) {
      res.redirect(301, pageUrl);
      return;
    }
    const membership = await getActiveMembership(profile.ownerId);
    const links = (await getLinks(profile.id))
      .slice(0, getProfileLinkLimit(membership?.plan))
      .map(serializeLink);

    let publicAvatarPath: string | null = null;
    if (profile.avatarPath) {
      const [publicAvatar] = await db
        .select({ objectPath: profileAssetsTable.objectPath })
        .from(profileAssetsTable)
        .where(
          and(
            eq(profileAssetsTable.ownerId, profile.ownerId),
            eq(profileAssetsTable.objectPath, profile.avatarPath),
            eq(profileAssetsTable.isPublic, true),
          ),
        )
        .limit(1);
      publicAvatarPath = publicAvatar?.objectPath ?? null;
    }
    const avatarUrl = profileShareImageUrl({
      origin,
      avatarPath: profile.avatarPath,
      publicAvatarPath,
    });

    const description = profile.bio.trim() ? profile.bio.trim().slice(0, 300) : null;
    res
      .status(200)
      .type("html")
      .send(buildProfileShareDocument({
        title: `@${profile.username}`,
        description,
        imageUrl: avatarUrl,
        pageUrl,
        profile: {
          displayName: profile.displayName,
          username: profile.username,
          bio: profile.bio,
          location: profile.location,
          links,
        },
      }));
  },
);

router.post("/profiles/:username/views", async (req, res): Promise<void> => {
  const params = RecordProfileViewParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }
  const [profile] = await db
    .update(profilesTable)
    .set({ viewCount: sql`${profilesTable.viewCount} + 1` })
    .where(
      and(
        eq(profilesTable.username, params.data.username.toLowerCase()),
        eq(profilesTable.isSuspended, false),
        notExists(
          db
            .select({ id: accountDeletionRequestsTable.id })
            .from(accountDeletionRequestsTable)
            .where(eq(accountDeletionRequestsTable.ownerId, profilesTable.ownerId)),
        ),
      ),
    )
    .returning({ viewCount: profilesTable.viewCount });
  if (!profile) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }
  res.json(RecordProfileViewResponse.parse(profile));
});

router.get("/account/summary", async (req, res): Promise<void> => {
  const ownerId = userIdFromRequest(req);
  if (!ownerId) {
    res.status(401).json({ error: "Sign-in required." });
    return;
  }
  const profile = await getOrCreateProfile(ownerId);
  const links = await getLinks(profile.id);
  const completeFields = [
    !!profile.displayName.trim(),
    !!profile.bio.trim(),
    !!profile.avatarPath,
    !!profile.backgroundPath,
    links.length > 0,
  ].filter(Boolean).length;
  res.json(
    GetAccountSummaryResponse.parse({
      username: profile.username,
      profileUrl: `/@${profile.username}`,
      profileCompletePercent: Math.round((completeFields / 5) * 100),
      linkCount: links.length,
      viewCount: profile.viewCount,
      updatedAt: profile.updatedAt,
    }),
  );
});

export default router;
