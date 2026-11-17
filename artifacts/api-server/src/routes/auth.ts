import { OAuth2Client } from "google-auth-library";
import { and, eq, gt } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { GetAuthSessionResponse, SignOutResponse } from "@workspace/api-zod";
import {
  authChallengesTable,
  authIdentitiesTable,
  authSessionsTable,
  authUsersTable,
  db,
} from "@workspace/db";
import { clearSessionCookie, getAuth, hashAuthToken } from "../lib/auth";
import {
  authIdentityFor,
  authUserByEmail,
  createAuthToken,
  createUserSession,
  issueOAuthState,
  legacyOwnerIdForEmail,
  newAuthUserId,
  normalizeEmail,
  OAUTH_STATE_TTL_MS,
  publicOrigin,
  storeVerifiedEmail,
} from "../lib/auth-service";
import { authAttemptLimiter } from "../middlewares/rateLimits";

const router: IRouter = Router();
const AUTH_COOKIE = "gbloc_session";
const GOOGLE_PROVIDER = "google";
const OAUTH_STATE_COOKIE_PREFIX = "gbloc_oauth_state_";
const OAUTH_CALLBACK_PATH = "/api/auth/google/callback";

function oauthStateCookieName(state: string): string | null {
  if (!/^[A-Za-z0-9_-]{43}$/.test(state)) return null;
  return `${OAUTH_STATE_COOKIE_PREFIX}${state}`;
}

function oauthStateCookieOptions(req: Request) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || req.secure,
    sameSite: "lax" as const,
    path: OAUTH_CALLBACK_PATH,
  };
}

function requireSameOrigin(req: Request, res: Response, next: NextFunction): void {
  const origin = req.get("origin");
  const host = req.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        res.status(403).json({ error: "Request origin is not allowed." });
        return;
      }
    } catch {
      res.status(403).json({ error: "Request origin is not allowed." });
      return;
    }
  }
  next();
}

function googleRedirectUri(req: Request): string {
  return `${publicOrigin(req)}/api/auth/google/callback`;
}

function googleClient(req: Request): OAuth2Client | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return new OAuth2Client(clientId, clientSecret, googleRedirectUri(req));
}

function authErrorRedirect(res: Response, reason: string): void {
  res.redirect(302, `/sign-in?authError=${encodeURIComponent(reason)}`);
}

router.get("/auth/me", async (req, res): Promise<void> => {
  const ownerId = getAuth(req).userId;
  const [user] = ownerId
    ? await db
        .select({ id: authUsersTable.id, email: authUsersTable.email })
        .from(authUsersTable)
        .where(eq(authUsersTable.id, ownerId))
        .limit(1)
    : [];
  res.json(GetAuthSessionResponse.parse({ user: user ?? null }));
});

router.post("/auth/logout", requireSameOrigin, async (req, res): Promise<void> => {
  const token = req.cookies?.[AUTH_COOKIE];
  if (typeof token === "string") {
    await db.delete(authSessionsTable).where(eq(authSessionsTable.tokenHash, hashAuthToken(token)));
  }
  clearSessionCookie(res);
  res.json(SignOutResponse.parse({ message: "ออกจากระบบแล้ว" }));
});

router.get("/auth/google/start", authAttemptLimiter, async (req, res): Promise<void> => {
  const client = googleClient(req);
  if (!client) {
    authErrorRedirect(res, "google-not-configured");
    return;
  }
  const state = createAuthToken();
  const stateCookieName = oauthStateCookieName(state);
  if (!stateCookieName) {
    authErrorRedirect(res, "google-sign-in-failed");
    return;
  }
  await issueOAuthState(GOOGLE_PROVIDER, state);
  res.cookie(stateCookieName, hashAuthToken(state), {
    ...oauthStateCookieOptions(req),
    maxAge: OAUTH_STATE_TTL_MS,
  });
  res.redirect(302, client.generateAuthUrl({
    access_type: "online",
    prompt: "select_account",
    scope: ["openid", "email", "profile"],
    state,
  }));
});

router.get("/auth/google/callback", authAttemptLimiter, async (req, res): Promise<void> => {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const stateCookieName = oauthStateCookieName(state);
  if (!state || !code || !stateCookieName || req.cookies?.[stateCookieName] !== hashAuthToken(state)) {
    authErrorRedirect(res, "google-sign-in-failed");
    return;
  }
  res.clearCookie(stateCookieName, oauthStateCookieOptions(req));

  const [challenge] = await db
    .delete(authChallengesTable)
    .where(
      and(
        eq(authChallengesTable.tokenHash, hashAuthToken(state)),
        eq(authChallengesTable.email, `oauth:${GOOGLE_PROVIDER}:${state}`),
        eq(authChallengesTable.purpose, "oauth_state"),
        gt(authChallengesTable.expiresAt, new Date()),
      ),
    )
    .returning({ id: authChallengesTable.id });
  if (!challenge) {
    authErrorRedirect(res, "google-sign-in-expired");
    return;
  }

  const client = googleClient(req);
  if (!client) {
    authErrorRedirect(res, "google-not-configured");
    return;
  }

  try {
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) {
      authErrorRedirect(res, "google-sign-in-failed");
      return;
    }
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const claims = ticket.getPayload();
    const email = claims?.email ? normalizeEmail(claims.email) : "";
    const subject = claims?.sub ?? "";
    if (!email || !subject || claims?.email_verified !== true) {
      authErrorRedirect(res, "google-email-unverified");
      return;
    }

    const identity = await authIdentityFor(GOOGLE_PROVIDER, subject);
    const [userForIdentity] = identity
      ? await db.select().from(authUsersTable).where(eq(authUsersTable.id, identity.ownerId)).limit(1)
      : [];
    const existingUser = identity ? userForIdentity : await authUserByEmail(email);
    if (identity && !existingUser) {
      authErrorRedirect(res, "google-sign-in-failed");
      return;
    }

    const ownerId = existingUser?.id ?? await legacyOwnerIdForEmail(email) ?? newAuthUserId();
    if (existingUser) {
      await db.update(authUsersTable)
        .set({ email, emailVerifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(authUsersTable.id, ownerId));
    } else {
      await db.insert(authUsersTable).values({
        id: ownerId,
        email,
        emailVerifiedAt: new Date(),
      });
    }

    if (!identity) {
      await db.insert(authIdentitiesTable).values({
        ownerId,
        provider: GOOGLE_PROVIDER,
        providerSubject: subject,
        providerEmail: email,
      });
    }
    await storeVerifiedEmail(ownerId, email);
    await createUserSession(ownerId, res);
    res.redirect(302, "/customize");
  } catch (error) {
    req.log.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Google OAuth callback failed",
    );
    authErrorRedirect(res, "google-sign-in-failed");
  }
});

export default router;
