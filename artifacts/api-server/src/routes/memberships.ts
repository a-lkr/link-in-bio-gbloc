import { getAuth } from "../lib/auth";
import { and, desc, eq, gt } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  GiftMembershipBody,
  GiftMembershipResponse,
  GetMembershipListResponse,
  GetMyMembershipResponse,
} from "@workspace/api-zod";
import {
  db,
  membershipGiftsTable,
  membershipsTable,
  profilesTable,
} from "@workspace/db";
import { hasActiveAccountDeletion } from "../lib/accountDeletion";
import { getActiveMembership } from "../lib/membershipAccess";
import { cleanupExpiredProfileEntitlements } from "../lib/profileEntitlementCleanup";
import { requireOwner } from "./moderation";

const router: IRouter = Router();

function currentUserId(req: Request): string | null {
  return getAuth(req).userId ?? null;
}

router.get(
  "/membership/me",
  async (req: Request, res: Response): Promise<void> => {
    const ownerId = currentUserId(req);
    if (!ownerId) {
      res.status(401).json({ error: "Sign-in required." });
      return;
    }
    await cleanupExpiredProfileEntitlements(ownerId);
    const membership = await getActiveMembership(ownerId);
    res.setHeader("Cache-Control", "no-store");
    res.json(
      GetMyMembershipResponse.parse(
        membership ?? {
          plan: null,
          startedAt: null,
          expiresAt: null,
          giftedAt: null,
          billingManaged: false,
        },
      ),
    );
  },
);

router.get(
  "/admin/memberships",
  requireOwner,
  async (_req: Request, res: Response): Promise<void> => {
    const now = new Date();
    const rows = await db
      .select({
        username: profilesTable.username,
        plan: membershipsTable.plan,
        startedAt: membershipsTable.startedAt,
        expiresAt: membershipsTable.expiresAt,
        grantedAt: membershipsTable.updatedAt,
      })
      .from(membershipsTable)
      .innerJoin(profilesTable, eq(profilesTable.id, membershipsTable.profileId))
      .where(gt(membershipsTable.expiresAt, now))
      .orderBy(desc(membershipsTable.updatedAt));
    res.setHeader("Cache-Control", "no-store");
    res.json(GetMembershipListResponse.parse({ memberships: rows }));
  },
);

router.post(
  "/admin/memberships",
  requireOwner,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = GiftMembershipBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const username = parsed.data.username.toLowerCase();
    const [profile] = await db
      .select({
        id: profilesTable.id,
        ownerId: profilesTable.ownerId,
        username: profilesTable.username,
      })
      .from(profilesTable)
      .where(
        and(
          eq(profilesTable.username, username),
          eq(profilesTable.isSuspended, false),
        ),
      )
      .limit(1);
    if (!profile || await hasActiveAccountDeletion(profile.ownerId)) {
      res.status(404).json({ error: "Active profile not found." });
      return;
    }

    const grantedBy = currentUserId(req);
    if (!grantedBy) {
      res.status(401).json({ error: "Sign-in required." });
      return;
    }

    const now = new Date();
    const granted = await db.transaction(async (tx) => {
      const [previous] = await tx
        .select()
        .from(membershipsTable)
        .where(eq(membershipsTable.ownerId, profile.ownerId))
        .for("update")
        .limit(1);
      const active = previous && previous.expiresAt > now;
      const samePlan = active && previous.plan === parsed.data.plan;
      const startsAt = samePlan ? previous.startedAt : now;
      const extensionBase = active ? previous.expiresAt : now;
      const expiresAt = new Date(
        extensionBase.getTime() + parsed.data.days * 24 * 60 * 60 * 1000,
      );

      await tx.insert(membershipGiftsTable).values({
        ownerId: profile.ownerId,
        profileId: profile.id,
        plan: parsed.data.plan,
        days: parsed.data.days,
        startsAt: now,
        expiresAt,
        grantedBy,
      });

      await tx
        .insert(membershipsTable)
        .values({
          ownerId: profile.ownerId,
          profileId: profile.id,
          plan: parsed.data.plan,
          startedAt: startsAt,
          expiresAt,
          grantedBy,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: membershipsTable.ownerId,
          set: {
            profileId: profile.id,
            plan: parsed.data.plan,
            startedAt: startsAt,
            expiresAt,
            grantedBy,
            updatedAt: now,
          },
        });

      return {
        username: profile.username,
        plan: parsed.data.plan,
        startedAt: startsAt,
        expiresAt,
        grantedAt: now,
      };
    });

    res.setHeader("Cache-Control", "no-store");
    res.json(GiftMembershipResponse.parse(granted));
  },
);

export default router;
