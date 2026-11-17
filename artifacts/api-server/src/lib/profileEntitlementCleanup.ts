import { and, asc, eq, inArray, lte } from "drizzle-orm";
import {
  billingPurchasesTable,
  billingSubscriptionsTable,
  db,
  membershipsTable,
  profileLinksTable,
  profilesTable,
} from "@workspace/db";
import { getActiveMembership } from "./membershipAccess";
import { logger } from "./logger";
import {
  BASIC_PROFILE_PRO_DEFAULTS,
  EXPIRED_MEMBERSHIP_PROFILE_DEFAULTS,
  getExcessProfileLinkIds,
  getProfileLinkLimit,
} from "./profileLinkQuota";

const WORKER_INTERVAL_MS = 60 * 1000;
const WORKER_BATCH_SIZE = 10;

let workerStarted = false;
let workerRunning = false;

async function hasExpiredMembershipRecord(
  ownerId: string,
  now: Date,
): Promise<boolean> {
  const [giftedMembership] = await db
    .select({ ownerId: membershipsTable.ownerId })
    .from(membershipsTable)
    .where(
      and(
        eq(membershipsTable.ownerId, ownerId),
        lte(membershipsTable.expiresAt, now),
      ),
    )
    .limit(1);
  if (giftedMembership) return true;

  const [purchase] = await db
    .select({ ownerId: billingPurchasesTable.ownerId })
    .from(billingPurchasesTable)
    .where(
      and(
        eq(billingPurchasesTable.ownerId, ownerId),
        eq(billingPurchasesTable.status, "paid"),
        lte(billingPurchasesTable.expiresAt, now),
      ),
    )
    .limit(1);
  if (purchase) return true;

  const [subscription] = await db
    .select({ ownerId: billingSubscriptionsTable.ownerId })
    .from(billingSubscriptionsTable)
    .where(
      and(
        eq(billingSubscriptionsTable.ownerId, ownerId),
        lte(billingSubscriptionsTable.currentPeriodEnd, now),
      ),
    )
    .limit(1);
  return Boolean(subscription);
}

async function listExpiredMembershipOwners(now: Date): Promise<string[]> {
  const [gifted, purchases, subscriptions] = await Promise.all([
    db
      .select({ ownerId: membershipsTable.ownerId })
      .from(membershipsTable)
      .where(lte(membershipsTable.expiresAt, now)),
    db
      .select({ ownerId: billingPurchasesTable.ownerId })
      .from(billingPurchasesTable)
      .where(
        and(
          eq(billingPurchasesTable.status, "paid"),
          lte(billingPurchasesTable.expiresAt, now),
        ),
      ),
    db
      .select({ ownerId: billingSubscriptionsTable.ownerId })
      .from(billingSubscriptionsTable)
      .where(lte(billingSubscriptionsTable.currentPeriodEnd, now)),
  ]);
  return [
    ...new Set([
      ...gifted.map(({ ownerId }) => ownerId),
      ...purchases.map(({ ownerId }) => ownerId),
      ...subscriptions.map(({ ownerId }) => ownerId),
    ]),
  ];
}

export async function cleanupExpiredProfileEntitlements(
  ownerId: string,
  expiredMembershipRecordKnown = false,
): Promise<void> {
  const now = new Date();
  const membership = await getActiveMembership(ownerId);
  if (
    !membership &&
    !expiredMembershipRecordKnown &&
    !(await hasExpiredMembershipRecord(ownerId, now))
  ) {
    return;
  }

  const [profile] = await db
    .select({ id: profilesTable.id })
    .from(profilesTable)
    .where(eq(profilesTable.ownerId, ownerId))
    .limit(1);
  if (!profile) return;

  const result = await db.transaction(async (tx) => {
    const [lockedProfile] = await tx
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.id, profile.id))
      .for("update")
      .limit(1);
    if (!lockedProfile) {
      return { skipped: true, removedLinks: 0, resetPremium: false };
    }
    const currentMembership = await getActiveMembership(ownerId);
    if (
      !currentMembership &&
      !expiredMembershipRecordKnown &&
      !(await hasExpiredMembershipRecord(ownerId, new Date()))
    ) {
      return { skipped: true, removedLinks: 0, resetPremium: false };
    }
    const linkLimit = getProfileLinkLimit(currentMembership?.plan);

    const currentLinks = await tx
      .select({
        id: profileLinksTable.id,
      })
      .from(profileLinksTable)
      .where(eq(profileLinksTable.profileId, profile.id))
      .orderBy(asc(profileLinksTable.sortOrder), asc(profileLinksTable.createdAt));
    const excessLinkIds = getExcessProfileLinkIds(
      currentLinks,
      linkLimit,
    );
    if (excessLinkIds.length) {
      await tx
        .delete(profileLinksTable)
        .where(inArray(profileLinksTable.id, excessLinkIds));
    }

    const [currentProfile] = await tx
      .select({
        premiumBackground: profilesTable.premiumBackground,
        premiumBackgroundStrength: profilesTable.premiumBackgroundStrength,
        premiumFont: profilesTable.premiumFont,
        premiumTextEffect: profilesTable.premiumTextEffect,
        showProBadge: profilesTable.showProBadge,
        showCredit: profilesTable.showCredit,
        extraAudioTracks: profilesTable.extraAudioTracks,
      })
      .from(profilesTable)
      .where(eq(profilesTable.id, profile.id))
      .limit(1);
    const resetValues = currentMembership?.plan === "pro"
      ? null
      : currentMembership?.plan === "basic"
        ? BASIC_PROFILE_PRO_DEFAULTS
        : EXPIRED_MEMBERSHIP_PROFILE_DEFAULTS;
    const resetPremium = !!currentProfile && !!resetValues && (
      currentProfile.showProBadge !== false ||
      currentProfile.extraAudioTracks.length > 0 ||
      (
        resetValues === EXPIRED_MEMBERSHIP_PROFILE_DEFAULTS &&
        (
          currentProfile.premiumBackground !== EXPIRED_MEMBERSHIP_PROFILE_DEFAULTS.premiumBackground ||
          currentProfile.premiumBackgroundStrength !== EXPIRED_MEMBERSHIP_PROFILE_DEFAULTS.premiumBackgroundStrength ||
          currentProfile.premiumFont !== EXPIRED_MEMBERSHIP_PROFILE_DEFAULTS.premiumFont ||
          currentProfile.premiumTextEffect !== EXPIRED_MEMBERSHIP_PROFILE_DEFAULTS.premiumTextEffect ||
          currentProfile.showCredit !== EXPIRED_MEMBERSHIP_PROFILE_DEFAULTS.showCredit
        )
      )
    );
    if (resetPremium) {
      await tx
        .update(profilesTable)
        .set({
          ...resetValues,
          extraAudioTracks: [],
        })
        .where(eq(profilesTable.id, profile.id));
    }
    return {
      skipped: false,
      removedLinks: excessLinkIds.length,
      resetPremium,
    };
  });

  if (!result.skipped && (result.removedLinks > 0 || result.resetPremium)) {
    logger.info(
      { ownerId, removedLinks: result.removedLinks, resetPremium: result.resetPremium },
      "Expired membership profile entitlements reset",
    );
  }
}

export async function processExpiredProfileEntitlements(): Promise<void> {
  if (workerRunning) return;
  workerRunning = true;
  try {
    const owners = await listExpiredMembershipOwners(new Date());
    for (let start = 0; start < owners.length; start += WORKER_BATCH_SIZE) {
      const batch = owners.slice(start, start + WORKER_BATCH_SIZE);
      await Promise.all(
        batch.map(async (ownerId) => {
          try {
            await cleanupExpiredProfileEntitlements(ownerId, true);
          } catch (error) {
            logger.error(
              {
                ownerId,
                errorName: error instanceof Error ? error.name : "UnknownError",
              },
              "Expired membership profile cleanup failed and will retry",
            );
          }
        }),
      );
    }
  } finally {
    workerRunning = false;
  }
}

export function startExpiredProfileEntitlementWorker(): void {
  if (workerStarted) return;
  workerStarted = true;
  const run = () => {
    void processExpiredProfileEntitlements().catch((error: unknown) => {
      logger.error(
        { errorName: error instanceof Error ? error.name : "UnknownError" },
        "Expired membership profile cleanup worker could not run",
      );
    });
  };
  run();
  const interval = setInterval(run, WORKER_INTERVAL_MS);
  interval.unref();
}
