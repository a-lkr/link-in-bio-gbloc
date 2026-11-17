import { createHash } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { and, eq, gt } from "drizzle-orm";
import { authSessionsTable, db } from "@workspace/db";

const SESSION_COOKIE = "gbloc_session";

type RequestWithAuth = Request & { auth?: { userId: string | null } };

export function getAuth(req: Request): { userId: string | null } {
  return (req as RequestWithAuth).auth ?? { userId: null };
}

export function hashAuthToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function authSessionMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token || typeof token !== "string") {
    (req as RequestWithAuth).auth = { userId: null };
    next();
    return;
  }

  try {
    const [session] = await db
      .select({ ownerId: authSessionsTable.ownerId })
      .from(authSessionsTable)
      .where(
        and(
          eq(authSessionsTable.tokenHash, hashAuthToken(token)),
          gt(authSessionsTable.expiresAt, new Date()),
        ),
      )
      .limit(1);
    (req as RequestWithAuth).auth = { userId: session?.ownerId ?? null };
    next();
  } catch (error) {
    next(error);
  }
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}
