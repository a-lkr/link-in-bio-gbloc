import { eq } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { Router, type IRouter, type Request } from "express";
import { GetAccountEmailResponse } from "@workspace/api-zod";
import { accountEmailsTable, authUsersTable, db } from "@workspace/db";

type AccountEmailUser = {
  createdAt: Date;
  primaryEmailAddressId: string | null;
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
    verification?: { status?: string } | null;
  }>;
};

type AccountEmailRecord = {
  email: string | null;
  updatedAt: Date | null;
};

type AccountEmailRouterDependencies = {
  getOwnerId: (req: Request) => string | null;
  getStoredEmail: (ownerId: string) => Promise<AccountEmailRecord>;
  getUser: (ownerId: string) => Promise<AccountEmailUser>;
  saveEmail: (
    ownerId: string,
    email: string,
    updatedAt: Date,
  ) => Promise<AccountEmailRecord>;
};

export function createAccountEmailRouter(
  dependencies: AccountEmailRouterDependencies,
): IRouter {
  const router: IRouter = Router();

  router.get("/account/email", async (req: Request, res): Promise<void> => {
    const ownerId = dependencies.getOwnerId(req);
    if (!ownerId) {
      res.status(401).json({ error: "Sign-in required." });
      return;
    }

    const record = await dependencies.getStoredEmail(ownerId);
    const user = await dependencies.getUser(ownerId);

    res.json(
      GetAccountEmailResponse.parse({
        email: record.email,
        updatedAt: record.updatedAt,
        accountCreatedAt: user.createdAt,
      }),
    );
  });

  router.post(
    "/account/email/sync",
    async (req: Request, res): Promise<void> => {
      const ownerId = dependencies.getOwnerId(req);
      if (!ownerId) {
        res.status(401).json({ error: "Sign-in required." });
        return;
      }

      let user: AccountEmailUser;
      try {
        user = await dependencies.getUser(ownerId);
      } catch (error) {
        req.log?.error(
          { errorName: error instanceof Error ? error.name : "UnknownError" },
          "Could not read signed-in user's email",
        );
        res.status(503).json({ error: "Could not verify the account email." });
        return;
      }

      const primaryEmail = user.emailAddresses.find(
        (address) =>
          address.id === user.primaryEmailAddressId &&
          address.verification?.status === "verified",
      );
      if (!primaryEmail) {
        res.status(409).json({ error: "A verified primary email is required." });
        return;
      }

      const now = new Date();
      const email = primaryEmail.emailAddress.trim().toLowerCase();
      const record = await dependencies.saveEmail(ownerId, email, now);

      res.json(
        GetAccountEmailResponse.parse({
          email: record.email,
          updatedAt: record.updatedAt,
          accountCreatedAt: user.createdAt,
        }),
      );
    },
  );
  return router;
}

export default createAccountEmailRouter({
  getOwnerId: (req) => getAuth(req).userId ?? null,
  getStoredEmail: async (ownerId) => {
    const [record] = await db
      .select()
      .from(accountEmailsTable)
      .where(eq(accountEmailsTable.ownerId, ownerId))
      .limit(1);
    return {
      email: record?.email ?? null,
      updatedAt: record?.updatedAt ?? null,
    };
  },
  getUser: async (ownerId) => {
    const [user] = await db
      .select({
        email: authUsersTable.email,
        emailVerifiedAt: authUsersTable.emailVerifiedAt,
        createdAt: authUsersTable.createdAt,
      })
      .from(authUsersTable)
      .where(eq(authUsersTable.id, ownerId))
      .limit(1);
    if (!user) throw new Error("Signed-in user no longer exists.");
    return {
      createdAt: user.createdAt,
      primaryEmailAddressId: "primary",
      emailAddresses: [{
        id: "primary",
        emailAddress: user.email,
        verification: { status: user.emailVerifiedAt ? "verified" : "unverified" },
      }],
    };
  },
  saveEmail: async (ownerId, email, updatedAt) => {
    const [record] = await db
      .insert(accountEmailsTable)
      .values({ ownerId, email, createdAt: updatedAt, updatedAt })
      .onConflictDoUpdate({
        target: accountEmailsTable.ownerId,
        set: { email, updatedAt },
      })
      .returning();
    return { email: record.email, updatedAt: record.updatedAt };
  },
});
