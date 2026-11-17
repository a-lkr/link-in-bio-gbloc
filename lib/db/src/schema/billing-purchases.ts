import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { authUsersTable } from "./auth-users";

export const billingPurchasesTable = pgTable(
  "billing_purchases",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
    stripeCheckoutSessionId: text("stripe_checkout_session_id").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeCustomerId: text("stripe_customer_id"),
    stripePriceId: text("stripe_price_id").notNull(),
    plan: text("plan").notNull(),
    amountTotal: integer("amount_total").notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("paid"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("billing_purchases_checkout_session_unique").on(
      table.stripeCheckoutSessionId,
    ),
    uniqueIndex("billing_purchases_payment_intent_unique").on(
      table.stripePaymentIntentId,
    ),
    index("billing_purchases_owner_status_expiry_idx").on(
      table.ownerId,
      table.status,
      table.expiresAt,
    ),
    index("billing_purchases_owner_created_idx").on(
      table.ownerId,
      table.createdAt,
    ),
  ],
);

export type BillingPurchase = typeof billingPurchasesTable.$inferSelect;
