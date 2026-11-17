import { createReadStream, createWriteStream } from "node:fs";
import {
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import type { StoredObjectFile, StoredObjectMetadata } from "./storageObject";

const METADATA_SUFFIX = ".gbloc-meta.json";

function rootDirectory(): string {
  return path.resolve(process.env.LOCAL_STORAGE_DIR || "./var/gbloc-storage");
}

function resolveObjectPath(objectPath: string): string {
  if (!objectPath.startsWith("/objects/")) {
    throw new Error("Invalid storage object path.");
  }
  const root = rootDirectory();
  const resolved = path.resolve(root, objectPath.slice(1));
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Storage object path escapes the configured directory.");
  }
  return resolved;
}

async function readSidecar(filePath: string): Promise<StoredObjectMetadata | null> {
  try {
    return JSON.parse(
      await readFile(`${filePath}${METADATA_SUFFIX}`, "utf8"),
    ) as StoredObjectMetadata;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export class LocalStoredObject implements StoredObjectFile {
  readonly bucketName = "local";
  private readonly filePath: string;

  constructor(readonly name: string) {
    this.filePath = resolveObjectPath(name);
  }

  async exists(): Promise<boolean> {
    try {
      return (await stat(this.filePath)).isFile();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw error;
    }
  }

  async getMetadata(): Promise<StoredObjectMetadata> {
    const fileStat = await stat(this.filePath);
    if (!fileStat.isFile()) throw new Error("Storage object not found.");
    const stored = await readSidecar(this.filePath);
    return {
      size: fileStat.size,
      contentType: stored?.contentType || "application/octet-stream",
      cacheControl: stored?.cacheControl,
      customMetadata: stored?.customMetadata ?? {},
    };
  }

  createReadStream(): Readable {
    return createReadStream(this.filePath);
  }

  async delete(): Promise<void> {
    await rm(this.filePath, { force: true });
    await rm(`${this.filePath}${METADATA_SUFFIX}`, { force: true });
  }

  async setCustomMetadata(key: string, value: string): Promise<void> {
    const current = (await readSidecar(this.filePath)) ?? {
      size: (await stat(this.filePath)).size,
      contentType: "application/octet-stream",
      customMetadata: {},
    };
    const next: StoredObjectMetadata = {
      ...current,
      customMetadata: { ...current.customMetadata, [key.toLowerCase()]: value },
    };
    const sidecarPath = `${this.filePath}${METADATA_SUFFIX}`;
    const tempPath = `${sidecarPath}.${randomUUID()}.tmp`;
    await writeFile(tempPath, JSON.stringify(next), { mode: 0o600 });
    await rename(tempPath, sidecarPath);
  }
}

export async function writeLocalObject(
  objectPath: string,
  body: Buffer,
  metadata: Omit<StoredObjectMetadata, "size"> & { size?: number },
): Promise<void> {
  const filePath = resolveObjectPath(objectPath);
  await mkdir(path.dirname(filePath), { recursive: true });
  let created = false;
  try {
    const handle = await open(filePath, "wx", 0o600);
    created = true;
    await pipeline(Readable.from(body), handle.createWriteStream());
    const storedMetadata: StoredObjectMetadata = {
      size: body.length,
      contentType: metadata.contentType,
      cacheControl: metadata.cacheControl,
      customMetadata: metadata.customMetadata,
    };
    const sidecarPath = `${filePath}${METADATA_SUFFIX}`;
    const tempPath = `${sidecarPath}.${randomUUID()}.tmp`;
    await writeFile(tempPath, JSON.stringify(storedMetadata), { mode: 0o600 });
    await rename(tempPath, sidecarPath);
  } catch (error) {
    if (created) {
      await rm(filePath, { force: true });
      await rm(`${filePath}${METADATA_SUFFIX}`, { force: true });
    }
    throw error;
  }
}

export async function verifyLocalStorageAccess(): Promise<void> {
  const root = rootDirectory();
  await mkdir(root, { recursive: true });
  const probe = path.join(root, `.gbloc-storage-probe-${randomUUID()}`);
  await writeFile(probe, "ok", { flag: "wx", mode: 0o600 });
  await rm(probe, { force: true });
}
