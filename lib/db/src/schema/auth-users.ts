import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const authUsersTable = pgTable(
  "auth_users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    googleSubject: text("google_subject"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("auth_users_email_unique").on(table.email),
    uniqueIndex("auth_users_google_subject_unique").on(table.googleSubject),
  ],
);

export type AuthUser = typeof authUsersTable.$inferSelect;
