import { getAuth } from "../lib/auth";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  AddModeratorBody,
  AddModeratorResponse,
  CreateProfileReportBody,
  CreateProfileReportResponse,
  GetModeratorAccessResponse,
  GetModeratorListResponse,
  GetModerationReportsQueryParams,
  GetModerationReportsResponse,
  RemoveModeratorParams,
  RemoveModeratorResponse,
  UpdateModerationReportBody,
  UpdateModerationReportParams,
  UpdateModerationReportResponse,
} from "@workspace/api-zod";
import {
  db,
  authUsersTable,
  profileModeratorsTable,
  profileReportsTable,
  profilesTable,
} from "@workspace/db";
import { profileReportLimiter } from "../middlewares/rateLimits";

const router: IRouter = Router();

function userIdFromRequest(req: Request): string | null {
  return getAuth(req).userId ?? null;
}

async function verifiedUserEmails(userId: string): Promise<string[]> {
  const [user] = await db
    .select({
      email: authUsersTable.email,
      verifiedAt: authUsersTable.emailVerifiedAt,
    })
    .from(authUsersTable)
    .where(eq(authUsersTable.id, userId))
    .limit(1);
  return user?.verifiedAt ? [user.email.toLowerCase()] : [];
}

async function getUserAccess(userId: string): Promise<{
  isModerator: boolean;
  isOwner: boolean;
}> {
  const emails = await verifiedUserEmails(userId);
  const ownerEmail = process.env.GBLOC_OWNER_EMAIL?.trim().toLowerCase();
  const isOwner = Boolean(ownerEmail && emails.includes(ownerEmail));
  if (isOwner) return { isModerator: true, isOwner: true };
  if (!emails.length) return { isModerator: false, isOwner: false };

  const activeModerators = await db
    .select({ email: profileModeratorsTable.email })
    .from(profileModeratorsTable)
    .where(
      and(
        eq(profileModeratorsTable.isActive, true),
        inArray(profileModeratorsTable.email, emails),
      ),
    )
    .limit(1);
  return {
    isModerator: activeModerators.length > 0,
    isOwner: false,
  };
}

function isEmailFormatValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function requireAccess(
  req: Request,
  res: Response,
  next: (error?: unknown) => void,
  role: "moderator" | "owner",
): Promise<void> {
  const userId = userIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Sign-in required." });
    return;
  }
  try {
    const access = await getUserAccess(userId);
    if (role === "owner" ? !access.isOwner : !access.isModerator) {
      res.status(403).json({
        error: role === "owner" ? "Owner access required." : "Moderator access required.",
      });
      return;
    }
  } catch (error) {
    req.log.error({ err: error }, "Could not verify moderation permissions");
    res.status(503).json({ error: "Could not verify moderation permissions." });
    return;
  }
  next();
}

function requireModerator(
  req: Request,
  res: Response,
  next: (error?: unknown) => void,
) {
  return requireAccess(req, res, next, "moderator");
}

export function requireOwner(
  req: Request,
  res: Response,
  next: (error?: unknown) => void,
) {
  return requireAccess(req, res, next, "owner");
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function reportQuery(status: string) {
  return status === "all" ? undefined : eq(profileReportsTable.status, status);
}

async function getModerationReport(id: string) {
  const [row] = await db
    .select({
      id: profileReportsTable.id,
      targetUsername: profileReportsTable.targetUsername,
      targetDisplayName: profilesTable.displayName,
      profileId: profilesTable.id,
      isSuspended: profilesTable.isSuspended,
      reason: profileReportsTable.reason,
      details: profileReportsTable.details,
      status: profileReportsTable.status,
      moderationNote: profileReportsTable.moderationNote,
      createdAt: profileReportsTable.createdAt,
      moderatedAt: profileReportsTable.moderatedAt,
    })
    .from(profileReportsTable)
    .leftJoin(
      profilesTable,
      eq(profileReportsTable.targetProfileId, profilesTable.id),
    )
    .where(eq(profileReportsTable.id, id))
    .limit(1);

  if (!row) return null;
  return {
    id: row.id,
    targetUsername: row.targetUsername,
    targetDisplayName: row.targetDisplayName,
    profileExists: row.profileId !== null,
    isSuspended: row.isSuspended ?? false,
    reason: row.reason,
    details: row.details,
    status: row.status,
    moderationNote: row.moderationNote,
    createdAt: row.createdAt,
    moderatedAt: row.moderatedAt,
  };
}

router.post(
  "/reports",
  profileReportLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const reporterId = userIdFromRequest(req);
    if (!reporterId) {
      res.status(401).json({ error: "Sign-in required to report a profile." });
      return;
    }

    const parsed = CreateProfileReportBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const reportDetails = parsed.data.details.trim();
    if (!reportDetails) {
      res.status(400).json({ error: "A written report reason is required." });
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

    if (!profile) {
      res.status(404).json({ error: "Profile not found." });
      return;
    }
    if (profile.ownerId === reporterId) {
      res.status(400).json({ error: "You cannot report your own profile." });
      return;
    }

    const [existingOpenReport] = await db
      .select({ id: profileReportsTable.id })
      .from(profileReportsTable)
      .where(
        and(
          eq(profileReportsTable.reporterId, reporterId),
          eq(profileReportsTable.targetProfileId, profile.id),
          inArray(profileReportsTable.status, ["new", "reviewing"]),
        ),
      )
      .limit(1);
    if (existingOpenReport) {
      res.status(409).json({
        error: "You already have an open report for this profile.",
      });
      return;
    }

    try {
      const [report] = await db
        .insert(profileReportsTable)
        .values({
          reporterId,
          targetProfileId: profile.id,
          targetUsername: profile.username,
          reason: parsed.data.reason,
          details: reportDetails,
        })
        .returning({ id: profileReportsTable.id, status: profileReportsTable.status });

      res.status(201).json(CreateProfileReportResponse.parse(report));
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({
          error: "You already have an open report for this profile.",
        });
        return;
      }
      req.log.error({ err: error }, "Could not save profile report");
      res.status(500).json({ error: "Could not submit this report." });
    }
  },
);

router.get(
  "/moderation/access",
  async (req: Request, res: Response): Promise<void> => {
    const userId = userIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ error: "Sign-in required." });
      return;
    }
    try {
      const access = await getUserAccess(userId);
      res.json(
        GetModeratorAccessResponse.parse({
          ...access,
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Could not verify moderator access");
      res.status(503).json({ error: "Could not verify moderator access." });
    }
  },
);

router.get(
  "/moderation/moderators",
  requireOwner,
  async (_req: Request, res: Response): Promise<void> => {
    const ownerEmail = process.env.GBLOC_OWNER_EMAIL?.trim().toLowerCase();
    const moderators = await db
      .select({
        id: profileModeratorsTable.id,
        email: profileModeratorsTable.email,
        createdAt: profileModeratorsTable.createdAt,
      })
      .from(profileModeratorsTable)
      .where(eq(profileModeratorsTable.isActive, true))
      .orderBy(desc(profileModeratorsTable.createdAt));
    res.json(
      GetModeratorListResponse.parse({
        moderators: moderators.filter(
          (moderator) => moderator.email !== ownerEmail,
        ),
      }),
    );
  },
);

router.post(
  "/moderation/moderators",
  requireOwner,
  async (req: Request, res: Response): Promise<void> => {
    const rawEmail = req.body && typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
    const parsed = AddModeratorBody.safeParse({ email: rawEmail });
    if (!parsed.success || !isEmailFormatValid(rawEmail)) {
      res.status(400).json({
        error: parsed.success ? "Enter a valid email address." : parsed.error.message,
      });
      return;
    }

    const email = parsed.data.email.trim().toLowerCase();
    const ownerEmail = process.env.GBLOC_OWNER_EMAIL?.trim().toLowerCase();
    if (email === ownerEmail) {
      res.status(409).json({
        error: "The owner account already has moderator access.",
      });
      return;
    }

    const [existing] = await db
      .select()
      .from(profileModeratorsTable)
      .where(eq(profileModeratorsTable.email, email))
      .limit(1);
    if (existing?.isActive) {
      res.status(409).json({ error: "This email is already a moderator." });
      return;
    }

    const ownerId = userIdFromRequest(req);
    if (!ownerId) {
      res.status(401).json({ error: "Sign-in required." });
      return;
    }

    try {
      const [moderator] = existing
        ? await db
            .update(profileModeratorsTable)
            .set({
              isActive: true,
              addedBy: ownerId,
              removedBy: null,
              removedAt: null,
              createdAt: new Date(),
            })
            .where(eq(profileModeratorsTable.id, existing.id))
            .returning({
              id: profileModeratorsTable.id,
              email: profileModeratorsTable.email,
              createdAt: profileModeratorsTable.createdAt,
            })
        : await db
            .insert(profileModeratorsTable)
            .values({ email, addedBy: ownerId })
            .returning({
              id: profileModeratorsTable.id,
              email: profileModeratorsTable.email,
              createdAt: profileModeratorsTable.createdAt,
            });
      res.status(201).json(AddModeratorResponse.parse({ moderator }));
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({ error: "This email is already a moderator." });
        return;
      }
      req.log.error({ err: error }, "Could not add moderator");
      res.status(500).json({ error: "Could not add this moderator." });
    }
  },
);

router.delete(
  "/moderation/moderators/:moderatorId",
  requireOwner,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = RemoveModeratorParams.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const ownerId = userIdFromRequest(req);
    if (!ownerId) {
      res.status(401).json({ error: "Sign-in required." });
      return;
    }

    const [removed] = await db
      .update(profileModeratorsTable)
      .set({
        isActive: false,
        removedBy: ownerId,
        removedAt: new Date(),
      })
      .where(
        and(
          eq(profileModeratorsTable.id, parsed.data.moderatorId),
          eq(profileModeratorsTable.isActive, true),
        ),
      )
      .returning({ id: profileModeratorsTable.id });
    if (!removed) {
      res.status(404).json({ error: "Moderator not found." });
      return;
    }
    res.json(RemoveModeratorResponse.parse({ removed: true }));
  },
);

router.get(
  "/moderation/reports",
  requireModerator,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = GetModerationReportsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const filter = reportQuery(parsed.data.status);
    const reportsQuery = db
      .select({
        id: profileReportsTable.id,
        targetUsername: profileReportsTable.targetUsername,
        targetDisplayName: profilesTable.displayName,
        profileId: profilesTable.id,
        isSuspended: profilesTable.isSuspended,
        reason: profileReportsTable.reason,
        details: profileReportsTable.details,
        status: profileReportsTable.status,
        moderationNote: profileReportsTable.moderationNote,
        createdAt: profileReportsTable.createdAt,
        moderatedAt: profileReportsTable.moderatedAt,
      })
      .from(profileReportsTable)
      .leftJoin(
        profilesTable,
        eq(profileReportsTable.targetProfileId, profilesTable.id),
      )
      .orderBy(desc(profileReportsTable.createdAt))
      .limit(100);
    const totalQuery = db
      .select({ total: count() })
      .from(profileReportsTable);

    const [rows, totalRows] = filter
      ? await Promise.all([
          reportsQuery.where(filter),
          totalQuery.where(filter),
        ])
      : await Promise.all([reportsQuery, totalQuery]);

    res.json(
      GetModerationReportsResponse.parse({
        reports: rows.map((row) => ({
          id: row.id,
          targetUsername: row.targetUsername,
          targetDisplayName: row.targetDisplayName,
          profileExists: row.profileId !== null,
          isSuspended: row.isSuspended ?? false,
          reason: row.reason,
          details: row.details,
          status: row.status,
          moderationNote: row.moderationNote,
          createdAt: row.createdAt,
          moderatedAt: row.moderatedAt,
        })),
        total: totalRows[0]?.total ?? 0,
      }),
    );
  },
);

router.patch(
  "/moderation/reports/:reportId",
  requireModerator,
  async (req: Request, res: Response): Promise<void> => {
    const params = UpdateModerationReportParams.safeParse(req.params);
    const parsed = UpdateModerationReportBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({
        error: !params.success
          ? params.error.message
          : !parsed.success
            ? parsed.error.message
            : "Invalid moderation request.",
      });
      return;
    }

    const { status, profileAction, moderationNote } = parsed.data;
    if (profileAction !== "keep" && status !== "actioned") {
      res.status(400).json({
        error: "Hiding or restoring a profile must be recorded as actioned.",
      });
      return;
    }

    const [existing] = await db
      .select({
        id: profileReportsTable.id,
        targetProfileId: profileReportsTable.targetProfileId,
      })
      .from(profileReportsTable)
      .where(eq(profileReportsTable.id, params.data.reportId))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Report not found." });
      return;
    }
    if (profileAction !== "keep" && !existing.targetProfileId) {
      res.status(400).json({ error: "The reported profile no longer exists." });
      return;
    }

    const moderatorId = userIdFromRequest(req);
    if (!moderatorId) {
      res.status(401).json({ error: "Sign-in required." });
      return;
    }

    await db.transaction(async (transaction) => {
      const values: {
        status: string;
        moderationNote?: string | null;
        moderatorId: string;
        moderatedAt: Date;
      } = {
        status,
        moderatorId,
        moderatedAt: new Date(),
      };
      if (moderationNote !== undefined) {
        values.moderationNote = moderationNote?.trim() || null;
      }

      await transaction
        .update(profileReportsTable)
        .set(values)
        .where(eq(profileReportsTable.id, params.data.reportId));

      if (profileAction !== "keep" && existing.targetProfileId) {
        await transaction
          .update(profilesTable)
          .set({ isSuspended: profileAction === "hide" })
          .where(eq(profilesTable.id, existing.targetProfileId));
      }
    });

    const report = await getModerationReport(params.data.reportId);
    if (!report) {
      res.status(404).json({ error: "Report not found." });
      return;
    }
    res.json(UpdateModerationReportResponse.parse({ report }));
  },
);

export default router;
