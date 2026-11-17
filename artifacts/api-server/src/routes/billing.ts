import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  lte,
  notInArray,
  sql,
} from "drizzle-orm";
import express, { Router, type IRouter, type Request, type Response } from "express";
import { readFile } from "node:fs/promises";
import Stripe from "stripe";
import {
  CreateBillingPortalSessionResponse,
  CreateCheckoutSessionBody,
  CreateCheckoutSessionResponse,
  GetBillingConfigResponse,
} from "@workspace/api-zod";
import {
  authUsersTable,
  billingPurchasesTable,
  billingSubscriptionsTable,
  billingWebhookEventsTable,
  db,
  membershipGiftsTable,
  membershipsTable,
  profilesTable,
} from "@workspace/db";
import { getAuth } from "../lib/auth";
import { hasActiveAccountDeletion } from "../lib/accountDeletion";
import { getActiveMembership } from "../lib/membershipAccess";
import {
  addCalendarMonth,
  BASIC_PRICE_AMOUNT,
  getBillingConfig,
  getPublicAppOrigin,
  getStripeClient,
  buildCheckoutSessionParams,
  isBasicOneTimePrice,
  subscriptionGrantsMembership,
  planForStripePrice,
  stripePriceIdForPlan,
  verifyStripeWebhookPayloadWithSecrets,
  type MembershipPlan,
} from "../lib/stripeBilling";

const router: IRouter = Router();
const stripeWebhookRouter: IRouter = Router();

function signedInOwnerId(req: Request): string | null {
  return getAuth(req).userId ?? null;
}

router.get("/billing/config", (_req: Request, res: Response): void => {
  res.setHeader("Cache-Control", "no-store");
  res.json(GetBillingConfigResponse.parse(getBillingConfig()));
});

router.post("/billing/checkout", async (req: Request, res: Response): Promise<void> => {
  const ownerId = signedInOwnerId(req);
  if (!ownerId) {
    res.status(401).json({ error: "Sign-in required." });
    return;
  }
  if (await hasActiveAccountDeletion(ownerId)) {
    res.status(409).json({ error: "Cancel account deletion before subscribing." });
    return;
  }

  const parsed = CreateCheckoutSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const plan = parsed.data.plan as MembershipPlan;
  if (plan !== "basic") {
    res.status(400).json({ error: "Only Basic checkout is currently available." });
    return;
  }
  const config = getBillingConfig();
  const priceId = stripePriceIdForPlan(plan);
  const publicOrigin = getPublicAppOrigin();
  if (!config.plans[plan] || !priceId || !publicOrigin) {
    res.status(503).json({ error: "Basic checkout is not configured." });
    return;
  }

  const [existingSubscription] = await db
    .select({ status: billingSubscriptionsTable.status })
    .from(billingSubscriptionsTable)
    .where(
      and(
        eq(billingSubscriptionsTable.ownerId, ownerId),
        notInArray(billingSubscriptionsTable.status, [
          "canceled",
          "incomplete_expired",
        ]),
      ),
    )
    .limit(1);
  if (existingSubscription) {
    res.status(409).json({ error: "An active subscription already exists." });
    return;
  }

  const activeMembership = await getActiveMembership(ownerId);
  if (activeMembership?.plan === "pro") {
    res.status(409).json({ error: "An active Pro membership already exists." });
    return;
  }

  const [user] = await db
    .select({ email: authUsersTable.email })
    .from(authUsersTable)
    .where(eq(authUsersTable.id, ownerId))
    .limit(1);
  if (!user) {
    res.status(401).json({ error: "Sign-in required." });
    return;
  }
  const [profile] = await db
    .select({ id: profilesTable.id })
    .from(profilesTable)
    .where(eq(profilesTable.ownerId, ownerId))
    .limit(1);
  if (!profile) {
    res.status(404).json({ error: "Create a profile before subscribing." });
    return;
  }

  try {
    const stripe = getStripeClient();
    const price = await stripe.prices.retrieve(priceId);
    if (!isBasicOneTimePrice(price)) {
      const issues: string[] = [];
      if (!price.active) issues.push("ยังไม่ได้เปิดใช้งาน");
      if (price.type !== "one_time") issues.push("ไม่ใช่ราคาแบบจ่ายครั้งเดียว");
      if (price.unit_amount !== BASIC_PRICE_AMOUNT) {
        issues.push("ราคาไม่ใช่ ฿35");
      }
      if (price.currency.toLowerCase() !== "thb") {
        issues.push("สกุลเงินไม่ใช่ THB");
      }
      req.log.error(
        {
          priceId,
          mode: price.livemode ? "live" : "test",
          active: price.active,
          type: price.type,
          unitAmount: price.unit_amount,
          currency: price.currency,
        },
        "Configured Basic price must be an active one-time THB 35 price",
      );
      res.status(503).json({
        error: `ราคา Basic ไม่ตรงเงื่อนไข${issues.length ? `: ${issues.join(" / ")}` : ""} ต้องเป็นราคา Active แบบจ่ายครั้งเดียว ฿35 THB`,
      });
      return;
    }

    const session = await stripe.checkout.sessions.create(
      buildCheckoutSessionParams({
        ownerId,
        email: user.email,
        plan,
        priceId,
        publicOrigin,
      }),
    );

    if (!session.url) {
      res.status(502).json({ error: "Stripe did not return a checkout URL." });
      return;
    }
    res.json(CreateCheckoutSessionResponse.parse({ checkoutUrl: session.url }));
  } catch (error) {
    req.log.error({ err: error }, "Could not create Stripe checkout session");
    const stripeError = error as { code?: unknown; param?: unknown };
    if (
      stripeError?.code === "resource_missing" &&
      stripeError?.param === "price"
    ) {
      res.status(503).json({
        error:
          "ไม่พบ Price ID ใน Stripe บัญชีหรือ Sandbox นี้ ตรวจว่า Price ID และ Test key มาจาก Sandbox เดียวกัน",
      });
      return;
    }
    res.status(502).json({ error: "Could not start checkout right now." });
  }
});

router.post("/billing/portal", async (req: Request, res: Response): Promise<void> => {
  const ownerId = signedInOwnerId(req);
  if (!ownerId) {
    res.status(401).json({ error: "Sign-in required." });
    return;
  }
  const publicOrigin = getPublicAppOrigin();
  if (
    !process.env.STRIPE_SECRET_KEY?.trim() ||
    !publicOrigin
  ) {
    res.status(503).json({ error: "Billing portal is not configured." });
    return;
  }

  const [subscription] = await db
    .select({ customerId: billingSubscriptionsTable.stripeCustomerId })
    .from(billingSubscriptionsTable)
    .where(
      and(
        eq(billingSubscriptionsTable.ownerId, ownerId),
        inArray(billingSubscriptionsTable.status, [
          "active",
          "trialing",
          "past_due",
          "unpaid",
        ]),
      ),
    )
    .limit(1);
  if (!subscription) {
    res.status(404).json({ error: "Paid subscription not found." });
    return;
  }

  try {
    const portal = await getStripeClient().billingPortal.sessions.create({
      customer: subscription.customerId,
      return_url: `${publicOrigin}/account`,
    });
    res.json(
      CreateBillingPortalSessionResponse.parse({ portalUrl: portal.url }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Could not create Stripe billing portal session");
    res.status(502).json({ error: "Could not open subscription settings." });
  }
});

stripeWebhookRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response): Promise<void> => {
    const signature = req.header("stripe-signature");
    const webhookSecrets = [
      process.env.STRIPE_WEBHOOK_SECRET?.trim(),
      process.env.NODE_ENV === "production"
        ? undefined
        : process.env.STRIPE_CLI_WEBHOOK_SECRET?.trim(),
    ].filter((secret): secret is string => Boolean(secret));
    if (process.env.NODE_ENV !== "production") {
      try {
        const localCliSecret = (
          await readFile("/tmp/gbloc-stripe-cli-webhook-secret", "utf8")
        ).trim();
        if (localCliSecret) webhookSecrets.push(localCliSecret);
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !("code" in error) ||
          error.code !== "ENOENT"
        ) {
          req.log.warn({ err: error }, "Could not read local Stripe CLI signing secret");
        }
      }
    }
    if (!signature || webhookSecrets.length === 0 || !Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: "Missing or invalid Stripe webhook signature." });
      return;
    }

    let event: Stripe.Event;
    try {
      event = verifyStripeWebhookPayloadWithSecrets(
        req.body,
        signature,
        webhookSecrets,
      );
    } catch {
      res.status(400).json({ error: "Invalid Stripe webhook signature." });
      return;
    }

    try {
      await db.transaction(async (tx) => {
        const [accepted] = await tx
          .insert(billingWebhookEventsTable)
          .values({ stripeEventId: event.id, eventType: event.type })
          .onConflictDoNothing()
          .returning({ stripeEventId: billingWebhookEventsTable.stripeEventId });
        if (!accepted) return;

        if (
          event.type === "checkout.session.completed" ||
          event.type === "checkout.session.async_payment_succeeded"
        ) {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.mode !== "payment" || session.payment_status !== "paid") {
            return;
          }

          const ownerId = session.client_reference_id;
          const priceId = session.metadata?.priceId;
          if (
            !ownerId ||
            ownerId !== session.metadata?.ownerId ||
            session.metadata?.plan !== "basic" ||
            !priceId ||
            priceId !== stripePriceIdForPlan("basic") ||
            session.amount_total !== BASIC_PRICE_AMOUNT ||
            session.currency?.toLowerCase() !== "thb"
          ) {
            req.log.warn(
              { eventId: event.id, eventType: event.type },
              "Ignoring paid Checkout Session with invalid GBLOC metadata or amount",
            );
            return;
          }

          const [profile] = await tx
            .select({ id: profilesTable.id })
            .from(profilesTable)
            .where(eq(profilesTable.ownerId, ownerId))
            .limit(1);
          if (!profile) {
            req.log.warn(
              { eventId: event.id, ownerId },
              "Paid Checkout Session has no GBLOC profile",
            );
            return;
          }

          await tx.execute(
            sql`select pg_advisory_xact_lock(hashtextextended(${ownerId}, 0))`,
          );
          const [existingPurchase] = await tx
            .select({ id: billingPurchasesTable.id })
            .from(billingPurchasesTable)
            .where(
              eq(
                billingPurchasesTable.stripeCheckoutSessionId,
                session.id,
              ),
            )
            .limit(1);
          if (existingPurchase) return;

          const now = new Date();
          const [membership] = await tx
            .select({
              plan: membershipsTable.plan,
              expiresAt: membershipsTable.expiresAt,
            })
            .from(membershipsTable)
            .where(eq(membershipsTable.ownerId, ownerId))
            .for("update")
            .limit(1);
          const [lastPurchase] = await tx
            .select({ expiresAt: billingPurchasesTable.expiresAt })
            .from(billingPurchasesTable)
            .where(
              and(
                eq(billingPurchasesTable.ownerId, ownerId),
                eq(billingPurchasesTable.status, "paid"),
              ),
            )
            .orderBy(desc(billingPurchasesTable.expiresAt))
            .limit(1);

          const startCandidates = [now];
          if (membership && membership.expiresAt > now) {
            startCandidates.push(membership.expiresAt);
          }
          if (lastPurchase && lastPurchase.expiresAt > now) {
            startCandidates.push(lastPurchase.expiresAt);
          }
          const startsAt = new Date(
            Math.max(...startCandidates.map((date) => date.getTime())),
          );
          const expiresAt = addCalendarMonth(startsAt);
          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null;
          const customerId =
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id ?? null;

          await tx.insert(billingPurchasesTable).values({
            id: session.id,
            ownerId,
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: paymentIntentId,
            stripeCustomerId: customerId,
            stripePriceId: priceId,
            plan: "basic",
            amountTotal: session.amount_total,
            currency: session.currency.toLowerCase(),
            status: "paid",
            startsAt,
            expiresAt,
          });
          req.log.info(
            { eventId: event.id, ownerId, startsAt, expiresAt },
            "Granted one month of Basic membership after confirmed payment",
          );
          return;
        }

        if (event.type === "charge.refunded") {
          const charge = event.data.object as Stripe.Charge;
          if (!charge.refunded) return;
          const paymentIntentId =
            typeof charge.payment_intent === "string"
              ? charge.payment_intent
              : charge.payment_intent?.id;
          if (!paymentIntentId) return;

          const [refundedPurchase] = await tx
            .update(billingPurchasesTable)
            .set({ status: "refunded", refundedAt: new Date(event.created * 1000) })
            .where(
              and(
                eq(billingPurchasesTable.stripePaymentIntentId, paymentIntentId),
                eq(billingPurchasesTable.status, "paid"),
              ),
            )
            .returning({ ownerId: billingPurchasesTable.ownerId });
          if (!refundedPurchase) return;

          const ownerId = refundedPurchase.ownerId;
          await tx.execute(
            sql`select pg_advisory_xact_lock(hashtextextended(${ownerId}, 0))`,
          );
          const now = new Date();
          const [activePurchase] = await tx
            .select({ expiresAt: billingPurchasesTable.expiresAt })
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
            .limit(1);
          const [activeMembership] = await tx
            .select({ expiresAt: membershipsTable.expiresAt })
            .from(membershipsTable)
            .where(
              and(
                eq(membershipsTable.ownerId, ownerId),
                gt(membershipsTable.expiresAt, now),
              ),
            )
            .limit(1);
          let nextStart = [activePurchase?.expiresAt, activeMembership?.expiresAt]
            .filter((date): date is Date => Boolean(date))
            .reduce(
              (latest, date) => (date > latest ? date : latest),
              now,
            );
          const futurePurchases = await tx
            .select({ id: billingPurchasesTable.id })
            .from(billingPurchasesTable)
            .where(
              and(
                eq(billingPurchasesTable.ownerId, ownerId),
                eq(billingPurchasesTable.status, "paid"),
                gt(billingPurchasesTable.startsAt, now),
              ),
            )
            .orderBy(asc(billingPurchasesTable.createdAt));
          for (const purchase of futurePurchases) {
            const nextExpiry = addCalendarMonth(nextStart);
            await tx
              .update(billingPurchasesTable)
              .set({ startsAt: nextStart, expiresAt: nextExpiry })
              .where(eq(billingPurchasesTable.id, purchase.id));
            nextStart = nextExpiry;
          }
          req.log.info(
            { eventId: event.id, ownerId },
            "Revoked a fully refunded Basic purchase",
          );
          return;
        }

        if (!event.type.startsWith("customer.subscription.")) return;
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionItem = subscription.items.data[0];
        const stripePriceId = subscriptionItem?.price.id;
        const configuredPlan = stripePriceId
          ? planForStripePrice(stripePriceId)
          : null;
        const metadataPlan = subscription.metadata?.plan;
        const plan =
          (metadataPlan === "basic" || metadataPlan === "pro") &&
          metadataPlan === configuredPlan
            ? metadataPlan
            : configuredPlan;
        const ownerId = subscription.metadata?.ownerId;
        const stripeCustomerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        if (!ownerId || !plan || !stripePriceId) {
          req.log.warn(
            { eventId: event.id, eventType: event.type },
            "Ignoring Stripe subscription event without GBLOC account metadata",
          );
          return;
        }

        if (!subscriptionItem) {
          throw new Error("Stripe subscription has no price item.");
        }
        const start = new Date(subscriptionItem.current_period_start * 1000);
        const end = new Date(subscriptionItem.current_period_end * 1000);
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
          throw new Error("Stripe subscription period is invalid.");
        }

        const values = {
          ownerId,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId,
          stripePriceId,
          plan,
          status: subscription.status,
          currentPeriodStart: start,
          currentPeriodEnd: end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          lastEventCreatedAt: event.created,
          updatedAt: new Date(),
        };
        const [updated] = await tx
          .insert(billingSubscriptionsTable)
          .values(values)
          .onConflictDoUpdate({
            target: billingSubscriptionsTable.ownerId,
            set: values,
            setWhere: lte(
              billingSubscriptionsTable.lastEventCreatedAt,
              event.created,
            ),
          })
          .returning({ ownerId: billingSubscriptionsTable.ownerId });
        if (!updated) return;

        const [profile] = await tx
          .select({ id: profilesTable.id })
          .from(profilesTable)
          .where(eq(profilesTable.ownerId, ownerId))
          .limit(1);
        if (!profile) {
          req.log.warn(
            { eventId: event.id, ownerId },
            "Stripe subscription has no GBLOC profile",
          );
          return;
        }

        const active = subscriptionGrantsMembership(
          subscription.status,
          end,
        );
        if (active) {
          await tx
            .insert(membershipsTable)
            .values({
              ownerId,
              profileId: profile.id,
              plan,
              startedAt: start,
              expiresAt: end,
              grantedBy: `stripe:${subscription.id}`,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: membershipsTable.ownerId,
              set: {
                profileId: profile.id,
                plan,
                startedAt: start,
                expiresAt: end,
                grantedBy: `stripe:${subscription.id}`,
                updatedAt: new Date(),
              },
            });
        } else {
          const [gift] = await tx
            .select()
            .from(membershipGiftsTable)
            .where(
              and(
                eq(membershipGiftsTable.ownerId, ownerId),
                gt(membershipGiftsTable.expiresAt, new Date()),
              ),
            )
            .orderBy(desc(membershipGiftsTable.createdAt))
            .limit(1);
          if (gift) {
            await tx
              .insert(membershipsTable)
              .values({
                ownerId,
                profileId: gift.profileId,
                plan: gift.plan,
                startedAt: gift.startsAt,
                expiresAt: gift.expiresAt,
                grantedBy: gift.grantedBy,
                updatedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: membershipsTable.ownerId,
                set: {
                  profileId: gift.profileId,
                  plan: gift.plan,
                  startedAt: gift.startsAt,
                  expiresAt: gift.expiresAt,
                  grantedBy: gift.grantedBy,
                  updatedAt: new Date(),
                },
              });
          } else {
            await tx
              .delete(membershipsTable)
              .where(
                and(
                  eq(membershipsTable.ownerId, ownerId),
                  eq(
                    membershipsTable.grantedBy,
                    `stripe:${subscription.id}`,
                  ),
                ),
              );
          }
        }
      });
      res.json({ received: true });
    } catch (error) {
      req.log.error(
        { err: error, eventId: event.id },
        "Could not process Stripe webhook",
      );
      res.status(500).json({ error: "Could not process Stripe webhook." });
    }
  },
);

export { stripeWebhookRouter };
export default router;
