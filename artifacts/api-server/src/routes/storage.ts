import { getAuth } from "../lib/auth";
import { and, eq } from "drizzle-orm";
import { Readable } from "node:stream";
import express, { Router, type IRouter, type Request, type Response } from "express";
import {
  CompleteUploadBody,
  CompleteUploadResponse,
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import {
  accountDeletionRequestsTable,
  db,
  profileAssetsTable,
  profilesTable,
} from "@workspace/db";
import { hasActiveAccountDeletion } from "../lib/accountDeletion";
import { ObjectPermission } from "../lib/objectAcl";
import { PortableObjectStorageService } from "../lib/portableObjectStorage";
import { ObjectNotFoundError } from "../lib/storageObject";
import { uploadLimiter } from "../middlewares/rateLimits";
import { getActiveMembership } from "../lib/membershipAccess";

const router: IRouter = Router();
const objectStorage = new PortableObjectStorageService();
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/hevc",
  "video/x-m4v",
]);
const AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
]);

function getUserId(req: Request): string | null {
  return getAuth(req).userId ?? null;
}

export function maxBytesForAsset(
  assetField: string,
  contentType: string,
): number | null {
  if (assetField === "backgroundPath") {
    if (IMAGE_TYPES.has(contentType)) return 5 * 1024 * 1024;
    if (VIDEO_TYPES.has(contentType)) return 10 * 1024 * 1024;
    return null;
  }
  if (/^audioPath[2-4]$/.test(assetField) || assetField === "audioPath") {
    return AUDIO_TYPES.has(contentType) ? 10 * 1024 * 1024 : null;
  }
  if (assetField === "avatarPath" || assetField === "audioCoverPath") {
    return IMAGE_TYPES.has(contentType) ? 10 * 1024 * 1024 : null;
  }
  return null;
}

router.post(
  "/storage/uploads/request-url",
  uploadLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const ownerId = getUserId(req);
    if (!ownerId) {
      res.status(401).json({ error: "Sign-in required." });
      return;
    }
    if (await hasActiveAccountDeletion(ownerId)) {
      res.status(409).json({ error: "Cancel account deletion before uploading files." });
      return;
    }

    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { name, size, contentType, assetField } = parsed.data;
    if (/^audioPath[2-4]$/.test(assetField)) {
      const membership = await getActiveMembership(ownerId);
      if (membership?.plan !== "pro") {
        res.status(403).json({ error: "An active Pro membership is required for extra profile songs." });
        return;
      }
    }
    const maxBytes = maxBytesForAsset(assetField, contentType);
    if (!maxBytes) {
      res.status(400).json({ error: "This file type is not supported." });
      return;
    }
    if (size > maxBytes) {
      res.status(400).json({
        error: `File exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB limit.`,
      });
      return;
    }

    try {
      const { uploadURL, objectPath } =
        await objectStorage.getObjectEntityUploadTarget(
          ownerId,
          contentType,
          size,
        );
      await db.insert(profileAssetsTable).values({
        objectPath,
        ownerId,
        originalName: name.slice(0, 255),
        contentType,
        size,
      });
      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType, assetField },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Could not create profile upload URL");
      res.status(500).json({ error: "Could not prepare this upload." });
    }
  },
);

router.put(
  "/storage/uploads/local/:token",
  uploadLimiter,
  express.raw({ type: () => true, limit: "12mb" }),
  async (req: Request, res: Response): Promise<void> => {
    const rawToken = req.params.token;
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
    const upload = objectStorage.verifyLocalUploadToken(token ?? "");
    if (!upload) {
      res.status(401).json({ error: "Upload link is invalid or expired." });
      return;
    }
    if (!Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: "Upload body must contain file bytes." });
      return;
    }
    const contentType = String(req.header("content-type") ?? "").toLowerCase();
    if (
      contentType !== upload.contentType.toLowerCase() ||
      req.body.length !== upload.size
    ) {
      res.status(400).json({ error: "Uploaded file does not match its signed metadata." });
      return;
    }
    try {
      await objectStorage.storeLocalUpload(upload, req.body);
      res.status(204).end();
    } catch (error) {
      req.log.error({ err: error }, "Could not store local profile upload");
      res.status(500).json({ error: "Could not store this file." });
    }
  },
);

router.post(
  "/storage/uploads/complete",
  uploadLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const ownerId = getUserId(req);
    if (!ownerId) {
      res.status(401).json({ error: "Sign-in required." });
      return;
    }
    if (await hasActiveAccountDeletion(ownerId)) {
      res.status(409).json({ error: "Cancel account deletion before uploading files." });
      return;
    }

    const parsed = CompleteUploadBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [asset] = await db
      .select()
      .from(profileAssetsTable)
      .where(
        and(
          eq(profileAssetsTable.objectPath, parsed.data.objectPath),
          eq(profileAssetsTable.ownerId, ownerId),
        ),
      )
      .limit(1);
    if (!asset) {
      res.status(404).json({ error: "Upload not found for this account." });
      return;
    }

    try {
      const objectFile = await objectStorage.getObjectEntityFile(
        asset.objectPath,
      );
      const metadata = await objectFile.getMetadata();
      const actualSize = metadata.size;
      const actualContentType = String(
        metadata.contentType ?? "",
      ).toLowerCase();
      const expectedContentType = asset.contentType.toLowerCase();
      const supportedContentType =
        IMAGE_TYPES.has(actualContentType) ||
        VIDEO_TYPES.has(actualContentType) ||
        AUDIO_TYPES.has(actualContentType);

      if (
        !Number.isSafeInteger(actualSize) ||
        actualSize !== asset.size ||
        actualContentType !== expectedContentType ||
        !supportedContentType
      ) {
        res.status(400).json({
          error: "Uploaded file does not match its declared size or type.",
        });
        return;
      }

      let completedObjectPath = asset.objectPath;
      let completedContentType = expectedContentType;
      let completedSize = actualSize;
      let convertedObjectPath: string | null = null;

      try {
        if (VIDEO_TYPES.has(expectedContentType)) {
          const converted = await objectStorage.transcodeVideoToH264Mp4(
            asset.objectPath,
          );
          completedObjectPath = converted.objectPath;
          completedContentType = "video/mp4";
          completedSize = converted.size;
          convertedObjectPath = converted.objectPath;
        }

        await objectStorage.trySetObjectEntityAclPolicy(completedObjectPath, {
          owner: ownerId,
          visibility: "public",
        });
        await db
          .update(profileAssetsTable)
          .set({
            objectPath: completedObjectPath,
            contentType: completedContentType,
            size: completedSize,
            isPublic: true,
          })
          .where(eq(profileAssetsTable.id, asset.id));

        if (completedObjectPath !== asset.objectPath) {
          await objectStorage.deleteObjectEntity(asset.objectPath);
        }
      } catch (error) {
        if (convertedObjectPath) {
          await objectStorage.deleteObjectEntity(convertedObjectPath).catch(() => undefined);
        }
        if (VIDEO_TYPES.has(expectedContentType)) {
          await objectStorage.deleteObjectEntity(asset.objectPath).catch(() => undefined);
          await db
            .delete(profileAssetsTable)
            .where(eq(profileAssetsTable.id, asset.id))
            .catch(() => undefined);
        }
        throw error;
      }

      res.json(CompleteUploadResponse.parse({
        objectPath: completedObjectPath,
        publicUrl: `/api/storage/objects/${completedObjectPath.replace(/^\/objects\//, "")}`,
      }));
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "Uploaded file was not found." });
        return;
      }
      req.log.error({ err: error }, "Could not complete profile upload");
      res.status(500).json({ error: "Could not finish this upload." });
    }
  },
);

router.get(
  "/storage/objects/*path",
  async (req: Request, res: Response): Promise<void> => {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    try {
      const [asset] = await db
        .select()
        .from(profileAssetsTable)
        .where(
          and(
            eq(profileAssetsTable.objectPath, objectPath),
            eq(profileAssetsTable.isPublic, true),
          ),
        )
        .limit(1);
      if (!asset) {
        res.status(404).json({ error: "Object not found." });
        return;
      }
      const [deletionRequest] = await db
        .select({ id: accountDeletionRequestsTable.id })
        .from(accountDeletionRequestsTable)
        .where(eq(accountDeletionRequestsTable.ownerId, asset.ownerId))
        .limit(1);
      if (deletionRequest) {
        res.status(404).json({ error: "Object not found." });
        return;
      }
      const [suspendedProfile] = await db
        .select({ id: profilesTable.id })
        .from(profilesTable)
        .where(
          and(
            eq(profilesTable.ownerId, asset.ownerId),
            eq(profilesTable.isSuspended, true),
          ),
        )
        .limit(1);
      if (suspendedProfile) {
        res.status(404).json({ error: "Object not found." });
        return;
      }

      const objectFile = await objectStorage.getObjectEntityFile(objectPath);
      const allowed = await objectStorage.canAccessObjectEntity({
        objectFile,
        requestedPermission: ObjectPermission.READ,
      });
      if (!allowed) {
        res.status(404).json({ error: "Object not found." });
        return;
      }
      const response = await objectStorage.downloadObject(objectFile);
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.setHeader("X-Content-Type-Options", "nosniff");
      if (response.body) {
        Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "Object not found." });
        return;
      }
      req.log.error({ err: error }, "Could not serve profile object");
      res.status(500).json({ error: "Could not load this file." });
    }
  },
);

export default router;
