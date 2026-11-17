import type { Readable } from "node:stream";

export type StorageProviderName = "local" | "s3";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export interface StoredObjectMetadata {
  size: number;
  contentType: string;
  cacheControl?: string;
  customMetadata: Record<string, string>;
}

export interface StoredObjectFile {
  readonly name: string;
  readonly bucketName: string;
  exists(): Promise<boolean>;
  getMetadata(): Promise<StoredObjectMetadata>;
  createReadStream(): Readable;
  delete(): Promise<void>;
  setCustomMetadata(key: string, value: string): Promise<void>;
}
