import { randomBytes, randomUUID } from "node:crypto";
import { and, eq, lte } from "drizzle-orm";
import {
  accountEmailsTable,
  authChallengesTable,
  authIdentitiesTable,
  authSessionsTable,
  authUsersTable,
  db,
} from "@workspace/db";
import { hashAuthToken, setSessionCookie } from "./auth";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createAuthToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function issueOAuthState(provider: string, state: string): Promise<void> {
  await db
    .delete(authChallengesTable)
    .where(lte(authChallengesTable.expiresAt, new Date()));
  await db
    .delete(authChallengesTable)
    .where(
      and(
        eq(authChallengesTable.email, `oauth:${provider}:${state}`),
        eq(authChallengesTable.purpose, "oauth_state"),
      ),
    );
  await db.insert(authChallengesTable).values({
    email: `oauth:${provider}:${state}`,
    purpose: "oauth_state",
    tokenHash: hashAuthToken(state),
    expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
  });
}

export async function legacyOwnerIdForEmail(email: string): Promise<string | null> {
  const [legacy] = await db
    .select({ ownerId: accountEmailsTable.ownerId })
    .from(accountEmailsTable)
    .where(eq(accountEmailsTable.email, email))
    .limit(1);
  return legacy?.ownerId ?? null;
}

export async function storeVerifiedEmail(ownerId: string, email: string): Promise<void> {
  const now = new Date();
  await db
    .insert(accountEmailsTable)
    .values({ ownerId, email, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: accountEmailsTable.ownerId,
      set: { email, updatedAt: now },
    });
}

export async function createUserSession(
  ownerId: string,
  res: Parameters<typeof setSessionCookie>[0],
): Promise<void> {
  const token = createAuthToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.delete(authSessionsTable).where(lte(authSessionsTable.expiresAt, new Date()));
  await db.insert(authSessionsTable).values({
    ownerId,
    tokenHash: hashAuthToken(token),
    expiresAt,
  });
  setSessionCookie(res, token, expiresAt);
}

export function publicOrigin(req: { protocol: string; get(name: string): string | undefined }): string {
  const host = req.get("host");
  if (!host) throw new Error("Request host is missing.");
  return `${req.protocol}://${host}`;
}

export function newAuthUserId(): string {
  return `usr_${randomUUID()}`;
}

export async function authUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(authUsersTable)
    .where(eq(authUsersTable.email, email))
    .limit(1);
  return user ?? null;
}

export async function authIdentityFor(provider: string, subject: string) {
  const [identity] = await db
    .select()
    .from(authIdentitiesTable)
    .where(and(
      eq(authIdentitiesTable.provider, provider),
      eq(authIdentitiesTable.providerSubject, subject),
    ))
    .limit(1);
  return identity ?? null;
}
