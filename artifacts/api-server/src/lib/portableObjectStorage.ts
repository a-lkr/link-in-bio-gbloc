import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { canAccessObject, getObjectAclPolicy, setObjectAclPolicy, type ObjectAclPolicy, type ObjectPermission } from "./objectAcl";
import { LocalStoredObject, verifyLocalStorageAccess, writeLocalObject } from "./localStorageProvider";
import { createS3UploadUrl, S3StoredObject, verifyS3StorageAccess, writeS3Object } from "./s3StorageProvider";
import { ObjectNotFoundError, type StorageProviderName, type StoredObjectFile, type StoredObjectMetadata } from "./storageObject";

type UploadRequest = {
  ownerId: string;
  objectPath: string;
  contentType: string;
  size: number;
  expiresAt: number;
};

type UploadTarget = {
  uploadURL: string;
  objectPath: string;
};

function configuredProvider(): StorageProviderName {
  const value = process.env.STORAGE_PROVIDER?.trim() || "local";
  if (value === "local" || value === "s3") return value;
  throw new Error("STORAGE_PROVIDER must be local or s3.");
}

function uploadSecret(): string {
  const secret =
    process.env.STORAGE_UPLOAD_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "STORAGE_UPLOAD_SECRET or SESSION_SECRET is required for local uploads.",
    );
  }
  return secret;
}

function signLocalUpload(payload: UploadRequest): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", uploadSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyLocalUploadToken(token: string): UploadRequest | null {
  try {
    if (token.length > 4096 || !token.includes(".")) return null;
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return null;
    const expected = createHmac("sha256", uploadSecret())
      .update(encoded)
      .digest();
    const received = Buffer.from(signature, "base64url");
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      return null;
    }
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<UploadRequest>;
    if (
      typeof payload.ownerId !== "string" ||
      typeof payload.objectPath !== "string" ||
      !payload.objectPath.startsWith("/objects/uploads/") ||
      typeof payload.contentType !== "string" ||
      !Number.isSafeInteger(payload.size) ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }
    return payload as UploadRequest;
  } catch {
    return null;
  }
}

export class PortableObjectStorageService {
  private readonly provider: StorageProviderName;

  constructor(provider: StorageProviderName = configuredProvider()) {
    this.provider = provider;
  }

  get providerName(): StorageProviderName {
    return this.provider;
  }

  async verifyDestinationAccess(): Promise<void> {
    if (this.provider === "local") {
      await verifyLocalStorageAccess();
      return;
    }
    await verifyS3StorageAccess();
  }

  async getObjectEntityUploadTarget(
    ownerId: string,
    contentType: string,
    size: number,
  ): Promise<UploadTarget> {
    const objectPath = `/objects/uploads/${randomUUID()}`;
    if (this.provider === "s3") {
      return {
        uploadURL: await createS3UploadUrl(objectPath, contentType),
        objectPath,
      };
    }

    const token = signLocalUpload({
      ownerId,
      objectPath,
      contentType,
      size,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });
    return {
      uploadURL: `/api/storage/uploads/local/${token}`,
      objectPath,
    };
  }

  async getObjectEntityFile(objectPath: string): Promise<StoredObjectFile> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const object =
      this.provider === "local"
        ? new LocalStoredObject(objectPath)
        : new S3StoredObject(objectPath);
    if (!(await object.exists())) throw new ObjectNotFoundError();
    return object;
  }

  async putObject(
    objectPath: string,
    body: Buffer,
    metadata: StoredObjectMetadata,
  ): Promise<void> {
    if (this.provider === "local") {
      await writeLocalObject(objectPath, body, metadata);
      return;
    }
    await writeS3Object(objectPath, body, metadata);
  }

  async downloadObject(
    file: StoredObjectFile,
    cacheTtlSec = 3600,
  ): Promise<Response> {
    const metadata = await file.getMetadata();
    const aclPolicy = await getObjectAclPolicy(file);
    const isPublic = aclPolicy?.visibility === "public";
    const headers: Record<string, string> = {
      "Content-Type": metadata.contentType || "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
      "X-Content-Type-Options": "nosniff",
    };
    if (metadata.size) headers["Content-Length"] = String(metadata.size);
    return new Response(
      Readable.toWeb(file.createReadStream()) as ReadableStream,
      { headers },
    );
  }

  async deleteObjectEntity(objectPath: string): Promise<void> {
    try {
      const object = await this.getObjectEntityFile(objectPath);
      await object.delete();
    } catch (error) {
      if (error instanceof ObjectNotFoundError) return;
      throw error;
    }
  }

  async trySetObjectEntityAclPolicy(
    objectPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<void> {
    const object = await this.getObjectEntityFile(objectPath);
    await setObjectAclPolicy(object, aclPolicy);
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission = "read" as ObjectPermission,
  }: {
    userId?: string;
    objectFile: StoredObjectFile;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({ userId, objectFile, requestedPermission });
  }

  async transcodeVideoToH264Mp4(
    sourceObjectPath: string,
  ): Promise<{ objectPath: string; size: number }> {
    const source = await this.getObjectEntityFile(sourceObjectPath);
    const directory = await mkdtemp(path.join(os.tmpdir(), "gbloc-video-"));
    const inputPath = path.join(directory, "input");
    const outputPath = path.join(directory, "output.mp4");
    const targetObjectPath = `/objects/uploads/${randomUUID()}`;
    let timeout: NodeJS.Timeout | undefined;

    try {
      await pipeline(source.createReadStream(), createWriteStream(inputPath));
      const ffmpeg = spawn(
        "ffmpeg",
        [
          "-y",
          "-hide_banner",
          "-loglevel",
          "error",
          "-i",
          inputPath,
          "-map",
          "0:v:0",
          "-an",
          "-sn",
          "-dn",
          "-vf",
          "scale='min(1280,iw)':-2",
          "-c:v",
          "libx264",
          "-preset",
          "medium",
          "-crf",
          "28",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          outputPath,
        ],
        { stdio: ["ignore", "ignore", "pipe"] },
      );
      const conversion = new Promise<void>((resolve, reject) => {
        ffmpeg.once("error", () =>
          reject(new Error("Could not start video conversion.")),
        );
        ffmpeg.once("close", (code) =>
          code === 0
            ? resolve()
            : reject(
                new Error(`Video conversion failed (ffmpeg exit ${code ?? "unknown"}).`),
              ),
        );
      });
      timeout = setTimeout(() => ffmpeg.kill("SIGKILL"), 180_000);
      await conversion;
      const info = await stat(outputPath);
      if (!Number.isSafeInteger(info.size) || info.size < 1) {
        throw new Error("Converted video has invalid storage metadata.");
      }
      await this.putObject(
        targetObjectPath,
        await readFile(outputPath),
        {
          size: info.size,
          contentType: "video/mp4",
          cacheControl: "public, max-age=3600",
          customMetadata: {},
        },
      );
      return { objectPath: targetObjectPath, size: info.size };
    } catch {
      throw new Error(
        "Could not convert this video. Try a shorter or smaller MP4/MOV file.",
      );
    } finally {
      if (timeout) clearTimeout(timeout);
      await rm(directory, { recursive: true, force: true });
    }
  }

  verifyLocalUploadToken(token: string): UploadRequest | null {
    if (this.provider !== "local") return null;
    return verifyLocalUploadToken(token);
  }

  async storeLocalUpload(
    upload: UploadRequest,
    body: Buffer,
  ): Promise<void> {
    if (this.provider !== "local") {
      throw new Error("Direct local uploads are disabled for this provider.");
    }
    if (body.length !== upload.size) {
      throw new Error("Uploaded file size does not match its signed metadata.");
    }
    await writeLocalObject(upload.objectPath, body, {
      size: body.length,
      contentType: upload.contentType,
      cacheControl: "private, max-age=0",
      customMetadata: {},
    });
  }
}
