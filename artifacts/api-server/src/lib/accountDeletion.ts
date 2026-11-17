import { and, asc, eq, inArray, lte, or, sql } from "drizzle-orm";
import {
  accountDeletionRequestsTable,
  accountEmailsTable,
  authChallengesTable,
  authIdentitiesTable,
  authSessionsTable,
  authUsersTable,
  billingSubscriptionsTable,
  db,
  profileAssetsTable,
  profileModeratorsTable,
  profileReportsTable,
  profilesTable,
} from "@workspace/db";
import { logger } from "./logger";
import { PortableObjectStorageService } from "./portableObjectStorage";
import {
  getStripeClient,
  isTerminalSubscriptionStatus,
} from "./stripeBilling";
import type Stripe from "stripe";

const PROCESSING_LEASE_MS = 5 * 60 * 1000;
const WORKER_INTERVAL_MS = 60 * 1000;
const WORKER_BATCH_SIZE = 5;
const DELETED_ACTOR = "deleted-account";

const objectStorage = new PortableObjectStorageService();
let workerStarted = false;
let workerRunning = false;

type AccountDeletionTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export async function deleteStoredAccountEmail(
  transaction: Pick<typeof db, "delete">,
  ownerId: string,
): Promise<void> {
  await transaction
    .delete(accountEmailsTable)
    .where(eq(accountEmailsTable.ownerId, ownerId));
}

export async function withStoredAccountEmailDeletion(
  runTransaction: (
    callback: (tx: AccountDeletionTransaction) => Promise<void>,
  ) => Promise<void>,
  ownerId: string,
  cleanup: (tx: AccountDeletionTransaction) => Promise<void>,
): Promise<void> {
  await runTransaction(async (tx) => {
    await cleanup(tx);
    await deleteStoredAccountEmail(tx, ownerId);
  });
}

export async function cancelStripeSubscriptionBeforeDeletion(
  stripe: Stripe,
  subscriptionId: string,
): Promise<void> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (!isTerminalSubscriptionStatus(subscription.status)) {
    await stripe.subscriptions.cancel(subscriptionId);
  }
}

export async function hasActiveAccountDeletion(ownerId: string): Promise<boolean> {
  const [request] = await db
    .select({ id: accountDeletionRequestsTable.id })
    .from(accountDeletionRequestsTable)
    .where(eq(accountDeletionRequestsTable.ownerId, ownerId))
    .limit(1);
  return Boolean(request);
}

async function claimDueRequests() {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - PROCESSING_LEASE_MS);

  return db.transaction(async (tx) => {
    const due = await tx
      .select()
      .from(accountDeletionRequestsTable)
      .where(
        or(
          and(
            eq(accountDeletionRequestsTable.status, "pending"),
            lte(accountDeletionRequestsTable.scheduledFor, now),
          ),
          and(
            eq(accountDeletionRequestsTable.status, "processing"),
            lte(accountDeletionRequestsTable.processingAt, staleBefore),
          ),
        ),
      )
      .orderBy(asc(accountDeletionRequestsTable.scheduledFor))
      .limit(WORKER_BATCH_SIZE)
      .for("update", { skipLocked: true });

    if (!due.length) return [];

    for (const request of due) {
      await tx
        .update(accountDeletionRequestsTable)
        .set({
          status: "processing",
          processingAt: now,
          attempts: sql`${accountDeletionRequestsTable.attempts} + 1`,
        })
        .where(eq(accountDeletionRequestsTable.id, request.id));
    }

    return due.map((request) => ({
      ...request,
      status: "processing",
      processingAt: now,
    }));
  });
}

export async function deleteAccountData(ownerId: string): Promise<void> {
  const [billingSubscription] = await db
    .select({
      id: billingSubscriptionsTable.stripeSubscriptionId,
      status: billingSubscriptionsTable.status,
    })
    .from(billingSubscriptionsTable)
    .where(eq(billingSubscriptionsTable.ownerId, ownerId))
    .limit(1);
  if (
    billingSubscription &&
    !isTerminalSubscriptionStatus(billingSubscription.status)
  ) {
    await cancelStripeSubscriptionBeforeDeletion(
      getStripeClient(),
      billingSubscription.id,
    );
  }

  const [authUser] = await db
    .select({ email: authUsersTable.email })
    .from(authUsersTable)
    .where(eq(authUsersTable.id, ownerId))
    .limit(1);
  const emailAddresses = authUser ? [authUser.email.trim().toLowerCase()] : [];

  if (emailAddresses.length) {
    await db
      .delete(profileModeratorsTable)
      .where(inArray(profileModeratorsTable.email, emailAddresses));
  }

  await db
    .update(profileModeratorsTable)
    .set({
      addedBy: sql`case when ${profileModeratorsTable.addedBy} = ${ownerId} then ${DELETED_ACTOR} else ${profileModeratorsTable.addedBy} end`,
      removedBy: sql`case when ${profileModeratorsTable.removedBy} = ${ownerId} then ${DELETED_ACTOR} else ${profileModeratorsTable.removedBy} end`,
    })
    .where(
      or(
        eq(profileModeratorsTable.addedBy, ownerId),
        eq(profileModeratorsTable.removedBy, ownerId),
      ),
    );

  const [profile] = await db
    .select({ id: profilesTable.id })
    .from(profilesTable)
    .where(eq(profilesTable.ownerId, ownerId))
    .limit(1);

  const assets = await db
    .select({ objectPath: profileAssetsTable.objectPath })
    .from(profileAssetsTable)
    .where(eq(profileAssetsTable.ownerId, ownerId));

  for (const asset of assets) {
    await objectStorage.deleteObjectEntity(asset.objectPath);
  }

  await withStoredAccountEmailDeletion(
    (callback) => db.transaction(callback),
    ownerId,
    async (tx) => {
      const relatedReportFilter = profile
        ? or(
            eq(profileReportsTable.reporterId, ownerId),
            eq(profileReportsTable.targetProfileId, profile.id),
          )
        : eq(profileReportsTable.reporterId, ownerId);

      await tx
        .delete(profileReportsTable)
        .where(relatedReportFilter);

      await tx
        .update(profileReportsTable)
        .set({ moderatorId: DELETED_ACTOR })
        .where(eq(profileReportsTable.moderatorId, ownerId));

      await tx
        .delete(profileAssetsTable)
        .where(eq(profileAssetsTable.ownerId, ownerId));

      await tx
        .delete(profilesTable)
        .where(eq(profilesTable.ownerId, ownerId));

      await tx
        .delete(accountDeletionRequestsTable)
        .where(eq(accountDeletionRequestsTable.ownerId, ownerId));

      await tx
        .delete(authSessionsTable)
        .where(eq(authSessionsTable.ownerId, ownerId));

      await tx
        .delete(authChallengesTable)
        .where(eq(authChallengesTable.ownerId, ownerId));

      await tx
        .delete(authIdentitiesTable)
        .where(eq(authIdentitiesTable.ownerId, ownerId));

      await tx
        .delete(authUsersTable)
        .where(eq(authUsersTable.id, ownerId));
    },
  );
}

async function processOneRequest(request: {
  id: string;
  ownerId: string;
  processingAt: Date | null;
}): Promise<void> {
  try {
    await deleteAccountData(request.ownerId);
  } catch (error) {
    await db
      .update(accountDeletionRequestsTable)
      .set({ status: "pending", processingAt: null })
      .where(
        and(
          eq(accountDeletionRequestsTable.id, request.id),
          eq(accountDeletionRequestsTable.status, "processing"),
        ),
      );
    logger.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Account deletion failed and will retry",
    );
  }
}

export async function processDueAccountDeletions(): Promise<void> {
  if (workerRunning) return;
  workerRunning = true;
  try {
    const due = await claimDueRequests();
    await Promise.all(due.map((request) => processOneRequest(request)));
  } finally {
    workerRunning = false;
  }
}

export function startAccountDeletionWorker(): void {
  if (workerStarted) return;
  workerStarted = true;
  const run = () => {
    void processDueAccountDeletions().catch((error: unknown) => {
      logger.error(
        { errorName: error instanceof Error ? error.name : "UnknownError" },
        "Account deletion worker could not run",
      );
    });
  };
  run();
  const interval = setInterval(run, WORKER_INTERVAL_MS);
  interval.unref();
}
