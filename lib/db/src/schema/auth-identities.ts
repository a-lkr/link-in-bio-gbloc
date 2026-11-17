import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authUsersTable } from "./auth-users";

export const authIdentitiesTable = pgTable(
  "auth_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id").notNull().references(() => authUsersTable.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerSubject: text("provider_subject").notNull(),
    providerEmail: text("provider_email"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("auth_identities_provider_subject_unique").on(table.provider, table.providerSubject),
    index("auth_identities_owner_id_idx").on(table.ownerId),
  ],
);

export type AuthIdentity = typeof authIdentitiesTable.$inferSelect;
