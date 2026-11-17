import Stripe from "stripe";

export type MembershipPlan = "basic" | "pro";
export const BASIC_PRICE_AMOUNT = 3500;

export function isBasicOneTimePrice(
  price: Pick<Stripe.Price, "active" | "currency" | "type" | "unit_amount">,
): boolean {
  return (
    price.active &&
    price.type === "one_time" &&
    price.unit_amount === BASIC_PRICE_AMOUNT &&
    price.currency.toLowerCase() === "thb"
  );
}

export function buildCheckoutSessionParams({
  ownerId,
  email,
  plan,
  priceId,
  publicOrigin,
}: {
  ownerId: string;
  email: string;
  plan: MembershipPlan;
  priceId: string;
  publicOrigin: string;
}): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    client_reference_id: ownerId,
    metadata: { ownerId, plan, priceId },
    payment_intent_data: { metadata: { ownerId, plan, priceId } },
    success_url: `${publicOrigin}/account?billing=success`,
    cancel_url: `${publicOrigin}/price?billing=cancelled`,
  };
}

export function addCalendarMonth(start: Date): Date {
  const end = new Date(start);
  const dayOfMonth = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const lastDayOfTargetMonth = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0),
  ).getUTCDate();
  end.setUTCDate(Math.min(dayOfMonth, lastDayOfTargetMonth));
  return end;
}

export function subscriptionGrantsMembership(
  status: string,
  periodEnd: Date,
  now = new Date(),
): boolean {
  return (
    (status === "active" || status === "trialing") &&
    Number.isFinite(periodEnd.getTime()) &&
    periodEnd > now
  );
}

export function isTerminalSubscriptionStatus(status: string): boolean {
  return status === "canceled" || status === "incomplete_expired";
}

let cachedStripe: Stripe | null = null;
let cachedSecretKey: string | null = null;

export function stripePriceIdForPlan(plan: MembershipPlan): string | null {
  const value = process.env[`STRIPE_PRICE_${plan.toUpperCase()}`]?.trim();
  return value || null;
}

export function planForStripePrice(priceId: string): MembershipPlan | null {
  if (stripePriceIdForPlan("basic") === priceId) return "basic";
  if (stripePriceIdForPlan("pro") === priceId) return "pro";
  return null;
}

export function getBillingConfig() {
  const configured =
    process.env.BILLING_ENABLED === "true" &&
    Boolean(process.env.STRIPE_SECRET_KEY?.trim()) &&
    Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()) &&
    Boolean(getPublicAppOrigin());
  const plans = {
    basic: configured && Boolean(stripePriceIdForPlan("basic")),
    pro: false,
  };

  return {
    billingAvailable: plans.basic || plans.pro,
    plans,
  };
}

export function getPublicAppOrigin(): string | null {
  const rawOrigin = process.env.GBLOC_PUBLIC_ORIGIN?.trim();
  if (!rawOrigin) return null;

  try {
    const url = new URL(rawOrigin);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("Stripe billing is not configured.");

  if (!cachedStripe || cachedSecretKey !== secretKey) {
    cachedStripe = new Stripe(secretKey);
    cachedSecretKey = secretKey;
  }
  return cachedStripe;
}

export function verifyStripeWebhookPayload(
  payload: Buffer,
  signature: string,
  secret: string,
): Stripe.Event {
  return getStripeClient().webhooks.constructEvent(payload, signature, secret);
}

export function verifyStripeWebhookPayloadWithSecrets(
  payload: Buffer,
  signature: string,
  secrets: string[],
): Stripe.Event {
  let lastError: unknown;
  for (const secret of [...new Set(secrets.map((value) => value.trim()).filter(Boolean))]) {
    try {
      return verifyStripeWebhookPayload(payload, signature, secret);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Stripe webhook secret is not configured.");
}

export function clearStripeClientCacheForTests(): void {
  cachedStripe = null;
  cachedSecretKey = null;
}
