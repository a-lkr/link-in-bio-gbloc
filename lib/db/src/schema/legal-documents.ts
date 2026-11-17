import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const legalDocumentsTable = pgTable("legal_documents", {
  key: text("key").primaryKey(),
  content: text("content").notNull(),
  effectiveAt: timestamp("effective_at", { withTimezone: true }),
  updatedBy: text("updated_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LegalDocument = typeof legalDocumentsTable.$inferSelect;
