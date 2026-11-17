import { getAuth } from "../lib/auth";
import { and, eq, gt } from "drizzle-orm";
import { Router, type IRouter, type Request } from "express";
import {
  GetAccountDeletionStatusResponse,
  RequestAccountDeletionBody,
  RequestAccountDeletionResponse,
} from "@workspace/api-zod";
import {
  accountDeletionRequestsTable,
  db,
} from "@workspace/db";
import { clearSessionCookie } from "../lib/auth";
import { deleteAccountData } from "../lib/accountDeletion";

const router: IRouter = Router();

function ownerIdFromRequest(req: Request): string | null {
  return getAuth(req).userId ?? null;
}

function serializeStatus(
  request:
    | typeof accountDeletionRequestsTable.$inferSelect
    | undefined,
) {
  if (!request) {
    return GetAccountDeletionStatusResponse.parse({
      status: "none",
      requestedAt: null,
      scheduledFor: null,
      canCancel: false,
    });
  }

  const isDue = request.scheduledFor.getTime() <= Date.now();
  const isProcessing = request.status === "processing" || isDue;
  return GetAccountDeletionStatusResponse.parse({
    status: isProcessing ? "processing" : "pending",
    requestedAt: request.requestedAt.toISOString(),
    scheduledFor: request.scheduledFor.toISOString(),
    canCancel: !isProcessing,
  });
}

router.get("/account/deletion", async (req, res): Promise<void> => {
  const ownerId = ownerIdFromRequest(req);
  if (!ownerId) {
    res.status(401).json({ error: "Sign-in required." });
    return;
  }

  const [request] = await db
    .select()
    .from(accountDeletionRequestsTable)
    .where(eq(accountDeletionRequestsTable.ownerId, ownerId))
    .limit(1);

  res.json(serializeStatus(request));
});

router.post("/account/deletion", async (req, res): Promise<void> => {
  const ownerId = ownerIdFromRequest(req);
  if (!ownerId) {
    res.status(401).json({ error: "Sign-in required." });
    return;
  }

  const parsed = RequestAccountDeletionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!parsed.data.confirmed) {
    res.status(400).json({ error: "Permanent account deletion must be confirmed." });
    return;
  }

  await deleteAccountData(ownerId);
  clearSessionCookie(res);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(RequestAccountDeletionResponse.parse({ deleted: true }));
});

router.delete("/account/deletion", async (req, res): Promise<void> => {
  const ownerId = ownerIdFromRequest(req);
  if (!ownerId) {
    res.status(401).json({ error: "Sign-in required." });
    return;
  }

  const [request] = await db
    .delete(accountDeletionRequestsTable)
    .where(
      and(
        eq(accountDeletionRequestsTable.ownerId, ownerId),
        eq(accountDeletionRequestsTable.status, "pending"),
        gt(accountDeletionRequestsTable.scheduledFor, new Date()),
      ),
    )
    .returning();
  if (request) {
    res.json(serializeStatus(undefined));
    return;
  }

  const [current] = await db
    .select()
    .from(accountDeletionRequestsTable)
    .where(eq(accountDeletionRequestsTable.ownerId, ownerId))
    .limit(1);
  if (!current) {
    res.status(404).json({ error: "No cancellable deletion request exists." });
    return;
  }
  res.status(409).json({ error: "The deletion process has already started." });
});

export default router;
