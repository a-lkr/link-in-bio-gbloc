import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { profilesTable } from "./profiles";

export const membershipsTable = pgTable(
  "memberships",
  {
    ownerId: text("owner_id").primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .unique()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    plan: text("plan").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    grantedBy: text("granted_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("memberships_expires_at_idx").on(table.expiresAt)],
);

export const membershipGiftsTable = pgTable(
  "membership_gifts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id").notNull(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    plan: text("plan").notNull(),
    days: integer("days").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    grantedBy: text("granted_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("membership_gifts_owner_created_idx").on(table.ownerId, table.createdAt),
  ],
);

export type Membership = typeof membershipsTable.$inferSelect;
export type MembershipGift = typeof membershipGiftsTable.$inferSelect;
