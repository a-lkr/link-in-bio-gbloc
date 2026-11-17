import { eq } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetAdminTermsResponse,
  GetAdminPrivacyPolicyResponse,
  GetPrivacyPolicyResponse,
  GetPublishedTermsResponse,
  PublishPrivacyPolicyBody,
  PublishPrivacyPolicyResponse,
  PublishTermsBody,
  PublishTermsResponse,
} from "@workspace/api-zod";
import { db, legalDocumentsTable } from "@workspace/db";
import { DEFAULT_TERMS_CONTENT } from "../content/default-terms";
import { DEFAULT_PRIVACY_CONTENT } from "../content/default-privacy";
import { requireOwner } from "./moderation";

const router: IRouter = Router();
const TERMS_KEY = "terms";
const PRIVACY_KEY = "privacy";

router.get("/legal/privacy", async (_req: Request, res: Response): Promise<void> => {
  const [document] = await db
    .select()
    .from(legalDocumentsTable)
    .where(eq(legalDocumentsTable.key, PRIVACY_KEY))
    .limit(1);

  res.setHeader("Cache-Control", "no-store");
  res.json(
    GetPrivacyPolicyResponse.parse({
      content: document?.content ?? DEFAULT_PRIVACY_CONTENT,
    }),
  );
});

router.get("/legal/terms", async (_req: Request, res: Response): Promise<void> => {
  const [document] = await db
    .select()
    .from(legalDocumentsTable)
    .where(eq(legalDocumentsTable.key, TERMS_KEY))
    .limit(1);

  if (!document?.effectiveAt) {
    res.status(404).json({ error: "Terms have not been published." });
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  res.json(
    GetPublishedTermsResponse.parse({
      content: document.content,
      effectiveAt: document.effectiveAt,
    }),
  );
});

router.get(
  "/admin/legal/terms",
  requireOwner,
  async (_req: Request, res: Response): Promise<void> => {
    const [document] = await db
      .select()
      .from(legalDocumentsTable)
      .where(eq(legalDocumentsTable.key, TERMS_KEY))
      .limit(1);

    res.setHeader("Cache-Control", "no-store");
    res.json(
      GetAdminTermsResponse.parse({
        content: document?.content ?? DEFAULT_TERMS_CONTENT,
        effectiveAt: document?.effectiveAt ?? null,
        isPublished: Boolean(document?.effectiveAt),
      }),
    );
  },
);

router.put(
  "/admin/legal/terms",
  requireOwner,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = PublishTermsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const ownerId = getAuth(req).userId;
    if (!ownerId) {
      res.status(401).json({ error: "Sign-in required." });
      return;
    }

    const now = new Date();
    const [document] = await db
      .insert(legalDocumentsTable)
      .values({
        key: TERMS_KEY,
        content: parsed.data.content,
        effectiveAt: now,
        updatedBy: ownerId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: legalDocumentsTable.key,
        set: {
          content: parsed.data.content,
          effectiveAt: now,
          updatedBy: ownerId,
          updatedAt: now,
        },
      })
      .returning();

    res.setHeader("Cache-Control", "no-store");
    res.json(
      PublishTermsResponse.parse({
        content: document.content,
        effectiveAt: document.effectiveAt,
      }),
    );
  },
);

router.get(
  "/admin/legal/privacy",
  requireOwner,
  async (_req: Request, res: Response): Promise<void> => {
    const [document] = await db
      .select()
      .from(legalDocumentsTable)
      .where(eq(legalDocumentsTable.key, PRIVACY_KEY))
      .limit(1);

    res.setHeader("Cache-Control", "no-store");
    res.json(
      GetAdminPrivacyPolicyResponse.parse({
        content: document?.content ?? DEFAULT_PRIVACY_CONTENT,
        isPublished: Boolean(document),
      }),
    );
  },
);

router.put(
  "/admin/legal/privacy",
  requireOwner,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = PublishPrivacyPolicyBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const ownerId = getAuth(req).userId;
    if (!ownerId) {
      res.status(401).json({ error: "Sign-in required." });
      return;
    }

    const now = new Date();
    const [document] = await db
      .insert(legalDocumentsTable)
      .values({
        key: PRIVACY_KEY,
        content: parsed.data.content,
        effectiveAt: null,
        updatedBy: ownerId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: legalDocumentsTable.key,
        set: {
          content: parsed.data.content,
          effectiveAt: null,
          updatedBy: ownerId,
          updatedAt: now,
        },
      })
      .returning();

    res.setHeader("Cache-Control", "no-store");
    res.json(
      PublishPrivacyPolicyResponse.parse({
        content: document.content,
        isPublished: true,
      }),
    );
  },
);

export default router;
