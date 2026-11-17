import { and, desc, eq, gt, inArray, lte } from "drizzle-orm";
import {
  billingPurchasesTable,
  billingSubscriptionsTable,
  db,
  membershipsTable,
} from "@workspace/db";

export async function getActiveMembership(ownerId: string) {
  const now = new Date();
  const [subscription, purchase, membership] = await Promise.all([
    db
      .select({
        plan: billingSubscriptionsTable.plan,
        startedAt: billingSubscriptionsTable.currentPeriodStart,
        expiresAt: billingSubscriptionsTable.currentPeriodEnd,
      })
      .from(billingSubscriptionsTable)
      .where(
        and(
          eq(billingSubscriptionsTable.ownerId, ownerId),
          inArray(billingSubscriptionsTable.status, ["active", "trialing"]),
          gt(billingSubscriptionsTable.currentPeriodEnd, now),
        ),
      )
      .limit(1),
    db
      .select({
        plan: billingPurchasesTable.plan,
        startedAt: billingPurchasesTable.startsAt,
        expiresAt: billingPurchasesTable.expiresAt,
      })
      .from(billingPurchasesTable)
      .where(
        and(
          eq(billingPurchasesTable.ownerId, ownerId),
          eq(billingPurchasesTable.status, "paid"),
          lte(billingPurchasesTable.startsAt, now),
          gt(billingPurchasesTable.expiresAt, now),
        ),
      )
      .orderBy(desc(billingPurchasesTable.expiresAt))
      .limit(1),
    db
      .select({
        plan: membershipsTable.plan,
        startedAt: membershipsTable.startedAt,
        expiresAt: membershipsTable.expiresAt,
        giftedAt: membershipsTable.updatedAt,
      })
      .from(membershipsTable)
      .where(
        and(
          eq(membershipsTable.ownerId, ownerId),
          gt(membershipsTable.expiresAt, now),
        ),
      )
      .limit(1),
  ]);

  const candidates = [
    ...(subscription[0]
      ? [{ ...subscription[0], giftedAt: null, billingManaged: true }]
      : []),
    ...(purchase[0]
      ? [{ ...purchase[0], giftedAt: null, billingManaged: false }]
      : []),
    ...(membership[0]
      ? [{ ...membership[0], billingManaged: false }]
      : []),
  ];
  candidates.sort((left, right) => {
    const planWeight = (plan: string) => (plan === "pro" ? 1 : 0);
    return (
      planWeight(right.plan) - planWeight(left.plan) ||
      right.expiresAt.getTime() - left.expiresAt.getTime()
    );
  });
  return candidates[0] ?? null;
}
