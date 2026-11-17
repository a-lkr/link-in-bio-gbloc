import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type HeadObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PassThrough, Readable } from "node:stream";
import type { StoredObjectFile, StoredObjectMetadata } from "./storageObject";

let cachedClient: S3Client | null = null;
let cachedConfig = "";

function bucketName(): string {
  const bucket = process.env.S3_BUCKET?.trim();
  if (!bucket) throw new Error("S3_BUCKET is required for S3 storage.");
  return bucket;
}

function client(): S3Client {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const region = process.env.S3_REGION?.trim() || "auto";
  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required for S3 storage.",
    );
  }
  const cacheKey = [
    accessKeyId,
    secretAccessKey,
    region,
    endpoint ?? "",
    String(forcePathStyle),
  ].join("\0");
  if (!cachedClient || cachedConfig !== cacheKey) {
    cachedClient?.destroy();
    cachedClient = new S3Client({
      region,
      endpoint,
      forcePathStyle: endpoint ? true : forcePathStyle,
      credentials: { accessKeyId, secretAccessKey },
    });
    cachedConfig = cacheKey;
  }
  return cachedClient;
}

function keyFromPath(objectPath: string): string {
  if (!objectPath.startsWith("/objects/")) {
    throw new Error("Invalid storage object path.");
  }
  const key = objectPath.slice(1);
  if (key.split("/").some((part) => part === ".." || part === ".")) {
    throw new Error("Invalid storage object path.");
  }
  return key;
}

function metadataFromHead(
  head: HeadObjectCommandOutput,
): StoredObjectMetadata {
  return {
    size: head.ContentLength ?? 0,
    contentType: head.ContentType || "application/octet-stream",
    cacheControl: head.CacheControl,
    customMetadata: head.Metadata ?? {},
  };
}

function notFound(error: unknown): boolean {
  const value = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return value?.name === "NotFound" || value?.$metadata?.httpStatusCode === 404;
}

export class S3StoredObject implements StoredObjectFile {
  readonly bucketName: string;
  private readonly key: string;

  constructor(readonly name: string) {
    this.bucketName = bucketName();
    this.key = keyFromPath(name);
  }

  async exists(): Promise<boolean> {
    try {
      await client().send(
        new HeadObjectCommand({ Bucket: this.bucketName, Key: this.key }),
      );
      return true;
    } catch (error) {
      if (notFound(error)) return false;
      throw error;
    }
  }

  async getMetadata(): Promise<StoredObjectMetadata> {
    const head = await client().send(
      new HeadObjectCommand({ Bucket: this.bucketName, Key: this.key }),
    );
    return metadataFromHead(head);
  }

  createReadStream(): Readable {
    const output = new PassThrough();
    void client()
      .send(new GetObjectCommand({ Bucket: this.bucketName, Key: this.key }))
      .then((result) => {
        if (!result.Body) throw new Error("S3 returned an empty object body.");
        const body = result.Body as Readable;
        body.on("error", (error) => output.destroy(error));
        body.pipe(output);
      })
      .catch((error: unknown) => output.destroy(error as Error));
    return output;
  }

  async delete(): Promise<void> {
    await client().send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: this.key }),
    );
  }

  async setCustomMetadata(key: string, value: string): Promise<void> {
    const current = await this.getMetadata();
    const metadata = {
      ...current.customMetadata,
      [key.toLowerCase()]: value,
    };
    const copySource = encodeURIComponent(`${this.bucketName}/${this.key}`)
      .replace(/%2F/gi, "/")
      .replace(/%3A/gi, ":");
    await client().send(
      new CopyObjectCommand({
        Bucket: this.bucketName,
        Key: this.key,
        CopySource: copySource,
        MetadataDirective: "REPLACE",
        Metadata: metadata,
        ContentType: current.contentType,
        CacheControl: current.cacheControl,
      }),
    );
  }
}

export async function createS3UploadUrl(
  objectPath: string,
  contentType: string,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucketName(),
    Key: keyFromPath(objectPath),
    ContentType: contentType,
  });
  return getSignedUrl(client(), command, { expiresIn: 900 });
}

export async function writeS3Object(
  objectPath: string,
  body: Buffer,
  metadata: Omit<StoredObjectMetadata, "size">,
): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: bucketName(),
      Key: keyFromPath(objectPath),
      Body: body,
      ContentLength: body.length,
      ContentType: metadata.contentType,
      CacheControl: metadata.cacheControl,
      Metadata: metadata.customMetadata,
    }),
  );
}

export async function verifyS3StorageAccess(): Promise<void> {
  await client().send(new HeadBucketCommand({ Bucket: bucketName() }));
}

export function clearS3ClientCacheForTests(): void {
  cachedClient?.destroy();
  cachedClient = null;
  cachedConfig = "";
}
