import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const accountEmailsTable = pgTable("account_emails", {
  ownerId: text("owner_id").primaryKey(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type AccountEmail = typeof accountEmailsTable.$inferSelect;
