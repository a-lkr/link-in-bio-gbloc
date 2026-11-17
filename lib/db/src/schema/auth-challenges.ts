import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const authChallengesTable = pgTable(
  "auth_challenges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    ownerId: text("owner_id"),
    purpose: text("purpose").notNull(),
    tokenHash: text("token_hash").notNull(),
    passwordHash: text("password_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("auth_challenges_token_hash_unique").on(table.tokenHash),
    index("auth_challenges_email_purpose_idx").on(table.email, table.purpose),
    index("auth_challenges_expiry_idx").on(table.expiresAt),
  ],
);

export type AuthChallenge = typeof authChallengesTable.$inferSelect;
