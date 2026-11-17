import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const accountDeletionRequestsTable = pgTable(
  "account_deletion_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("pending"),
    processingAt: timestamp("processing_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
  },
  (table) => [
    uniqueIndex("account_deletion_requests_owner_unique").on(table.ownerId),
    index("account_deletion_requests_due_idx").on(
      table.status,
      table.scheduledFor,
    ),
  ],
);

export type AccountDeletionRequest =
  typeof accountDeletionRequestsTable.$inferSelect;
