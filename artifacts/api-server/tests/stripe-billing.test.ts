import assert from "node:assert/strict";
import { after, test } from "node:test";
import Stripe from "stripe";
import { cancelStripeSubscriptionBeforeDeletion } from "../src/lib/accountDeletion";
import {
  addCalendarMonth,
  BASIC_PRICE_AMOUNT,
  buildCheckoutSessionParams,
  clearStripeClientCacheForTests,
  getBillingConfig,
  isBasicOneTimePrice,
  isTerminalSubscriptionStatus,
  planForStripePrice,
  subscriptionGrantsMembership,
  verifyStripeWebhookPayload,
  verifyStripeWebhookPayloadWithSecrets,
} from "../src/lib/stripeBilling";

const savedEnv = new Map<string, string | undefined>();
const keys = [
  "BILLING_ENABLED",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_CLI_WEBHOOK_SECRET",
  "STRIPE_PRICE_BASIC",
  "STRIPE_PRICE_PRO",
  "GBLOC_PUBLIC_ORIGIN",
];

for (const key of keys) savedEnv.set(key, process.env[key]);

after(() => {
  for (const [key, value] of savedEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  clearStripeClientCacheForTests();
});

test("billing stays unavailable until explicitly enabled and fully configured", () => {
  process.env.BILLING_ENABLED = "false";
  process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
  process.env.STRIPE_WEBHOOK_SECRET = "placeholder_webhook_signing_secret";
  process.env.STRIPE_PRICE_BASIC = "price_basic_test";
  process.env.STRIPE_PRICE_PRO = "price_pro_test";
  process.env.GBLOC_PUBLIC_ORIGIN = "https://gbloc.example";

  assert.deepEqual(getBillingConfig(), {
    billingAvailable: false,
    plans: { basic: false, pro: false },
  });

  process.env.BILLING_ENABLED = "true";
  assert.deepEqual(getBillingConfig(), {
    billingAvailable: true,
    plans: { basic: true, pro: false },
  });
});

test("billing remains disabled when required webhook or origin settings are missing", () => {
  process.env.BILLING_ENABLED = "true";
  process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
  process.env.STRIPE_WEBHOOK_SECRET = "";
  process.env.STRIPE_PRICE_BASIC = "price_basic_test";
  process.env.STRIPE_PRICE_PRO = "price_pro_test";
  process.env.GBLOC_PUBLIC_ORIGIN = "https://gbloc.example";

  assert.equal(getBillingConfig().billingAvailable, false);

  process.env.STRIPE_WEBHOOK_SECRET = "placeholder_webhook_signing_secret";
  process.env.GBLOC_PUBLIC_ORIGIN = "";
  assert.equal(getBillingConfig().billingAvailable, false);
});

test("Stripe price IDs map only to the configured plan", () => {
  process.env.STRIPE_PRICE_BASIC = "price_basic_test";
  process.env.STRIPE_PRICE_PRO = "price_pro_test";
  assert.equal(planForStripePrice("price_basic_test"), "basic");
  assert.equal(planForStripePrice("price_pro_test"), "pro");
  assert.equal(planForStripePrice("price_unknown"), null);
});

test("checkout parameters bind the plan and owner to Stripe metadata", () => {
  const params = buildCheckoutSessionParams({
    ownerId: "owner-1",
    email: "owner@example.test",
    plan: "basic",
    priceId: "price_basic_test",
    publicOrigin: "https://gbloc.example",
  });

  assert.equal(params.mode, "payment");
  assert.deepEqual(params.line_items, [
    { price: "price_basic_test", quantity: 1 },
  ]);
  assert.deepEqual(params.metadata, {
    ownerId: "owner-1",
    plan: "basic",
    priceId: "price_basic_test",
  });
  assert.deepEqual(params.payment_intent_data?.metadata, params.metadata);
  assert.equal(params.subscription_data, undefined);
  assert.equal(params.success_url, "https://gbloc.example/account?billing=success");
  assert.equal(params.cancel_url, "https://gbloc.example/price?billing=cancelled");
});

test("Basic checkout accepts only the configured one-time 35 THB price", () => {
  assert.equal(BASIC_PRICE_AMOUNT, 3500);
  assert.equal(
    isBasicOneTimePrice({
      active: true,
      type: "one_time",
      unit_amount: 3500,
      currency: "thb",
    }),
    true,
  );
  assert.equal(
    isBasicOneTimePrice({
      active: true,
      type: "recurring",
      unit_amount: 3500,
      currency: "thb",
    }),
    false,
  );
  assert.equal(
    isBasicOneTimePrice({
      active: true,
      type: "one_time",
      unit_amount: 3500,
      currency: "usd",
    }),
    false,
  );
  assert.equal(
    isBasicOneTimePrice({
      active: false,
      type: "one_time",
      unit_amount: 3500,
      currency: "thb",
    }),
    false,
  );
});

test("Basic access advances by one calendar month and clamps at month end", () => {
  assert.equal(
    addCalendarMonth(new Date("2026-01-31T10:30:00.000Z")).toISOString(),
    "2026-02-28T10:30:00.000Z",
  );
  assert.equal(
    addCalendarMonth(new Date("2028-01-31T10:30:00.000Z")).toISOString(),
    "2028-02-29T10:30:00.000Z",
  );
});

test("only active, unexpired Stripe subscriptions grant paid membership", () => {
  const now = new Date("2026-11-07T00:00:00.000Z");
  const future = new Date("2026-12-07T00:00:00.000Z");
  const past = new Date("2026-11-06T00:00:00.000Z");

  assert.equal(subscriptionGrantsMembership("active", future, now), true);
  assert.equal(subscriptionGrantsMembership("trialing", future, now), true);
  assert.equal(subscriptionGrantsMembership("past_due", future, now), false);
  assert.equal(subscriptionGrantsMembership("canceled", future, now), false);
  assert.equal(subscriptionGrantsMembership("active", past, now), false);
  assert.equal(isTerminalSubscriptionStatus("canceled"), true);
  assert.equal(isTerminalSubscriptionStatus("incomplete_expired"), true);
  assert.equal(isTerminalSubscriptionStatus("active"), false);
});

test("signed Stripe webhook payload verifies locally without network access", () => {
  const secret = "test_webhook_signing_secret";
  const payload = JSON.stringify({
    id: "evt_local_test",
    object: "event",
    api_version: "2025-03-31.basil",
    created: 1_794_000_000,
    data: { object: { id: "sub_local_test", object: "subscription" } },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type: "customer.subscription.updated",
  });
  const signer = new Stripe("sk_test_local_only");
  const signature = signer.webhooks.generateTestHeaderString({
    payload,
    secret,
  });

  process.env.STRIPE_SECRET_KEY = "sk_test_local_only";
  clearStripeClientCacheForTests();
  const event = verifyStripeWebhookPayload(
    Buffer.from(payload),
    signature,
    secret,
  );
  assert.equal(event.id, "evt_local_test");
  assert.throws(() =>
    verifyStripeWebhookPayload(
      Buffer.from(payload),
      signature,
      "wrong_webhook_signing_secret",
    ),
  );
  assert.equal(
    verifyStripeWebhookPayloadWithSecrets(
      Buffer.from(payload),
      signature,
      ["wrong_webhook_signing_secret", secret],
    ).id,
    "evt_local_test",
  );
  assert.throws(() =>
    verifyStripeWebhookPayloadWithSecrets(
      Buffer.from(payload),
      signature,
      ["wrong_webhook_signing_secret"],
    ),
  );
});

test("account deletion cancels a live Stripe subscription but not a terminal one", async () => {
  const calls: string[] = [];
  const fakeStripe = {
    subscriptions: {
      async retrieve(id: string) {
        calls.push(`retrieve:${id}`);
        return { status: id === "sub-canceled" ? "canceled" : "active" };
      },
      async cancel(id: string) {
        calls.push(`cancel:${id}`);
        return { status: "canceled" };
      },
    },
  } as unknown as Stripe;

  await cancelStripeSubscriptionBeforeDeletion(fakeStripe, "sub-active");
  await cancelStripeSubscriptionBeforeDeletion(fakeStripe, "sub-canceled");

  assert.deepEqual(calls, [
    "retrieve:sub-active",
    "cancel:sub-active",
    "retrieve:sub-canceled",
  ]);
});
