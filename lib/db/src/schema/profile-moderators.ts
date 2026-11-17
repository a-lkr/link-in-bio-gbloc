import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const profileModeratorsTable = pgTable(
  "profile_moderators",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    addedBy: text("added_by").notNull(),
    removedBy: text("removed_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    removedAt: timestamp("removed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("profile_moderators_email_unique").on(table.email),
    index("profile_moderators_active_idx").on(table.isActive, table.createdAt),
  ],
);

export type ProfileModerator = typeof profileModeratorsTable.$inferSelect;
