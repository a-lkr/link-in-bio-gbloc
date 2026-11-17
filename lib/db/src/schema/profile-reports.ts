import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profilesTable } from "./profiles";

export const profileReportsTable = pgTable(
  "profile_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reporterId: text("reporter_id").notNull(),
    targetProfileId: uuid("target_profile_id").references(() => profilesTable.id, {
      onDelete: "set null",
    }),
    targetUsername: text("target_username").notNull(),
    reason: text("reason").notNull(),
    details: text("details").notNull().default(""),
    status: text("status").notNull().default("new"),
    moderationNote: text("moderation_note"),
    moderatorId: text("moderator_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
  },
  (table) => [
    index("profile_reports_status_created_idx").on(table.status, table.createdAt),
    index("profile_reports_target_profile_idx").on(table.targetProfileId),
    uniqueIndex("profile_reports_open_reporter_target_unique")
      .on(table.reporterId, table.targetProfileId)
      .where(sql`${table.status} in ('new', 'reviewing')`),
  ],
);

export type ProfileReport = typeof profileReportsTable.$inferSelect;
