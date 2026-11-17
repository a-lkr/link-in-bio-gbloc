import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { clearS3ClientCacheForTests } from "../src/lib/s3StorageProvider";
import { PortableObjectStorageService } from "../src/lib/portableObjectStorage";

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

test("local disk is the default storage provider", () => {
  const previous = process.env.STORAGE_PROVIDER;
  delete process.env.STORAGE_PROVIDER;

  try {
    assert.equal(new PortableObjectStorageService().providerName, "local");
    process.env.STORAGE_PROVIDER = "unsupported";
    assert.throws(
      () => new PortableObjectStorageService(),
      /STORAGE_PROVIDER must be local or s3/,
    );
  } finally {
    if (previous === undefined) delete process.env.STORAGE_PROVIDER;
    else process.env.STORAGE_PROVIDER = previous;
  }
});

test("local upload tokens are signed, short-lived, and store retrievable files", async () => {
  const previous = {
    root: process.env.LOCAL_STORAGE_DIR,
    uploadSecret: process.env.STORAGE_UPLOAD_SECRET,
  };
  const root = await mkdtemp(path.join(os.tmpdir(), "gbloc-local-storage-test-"));
  process.env.LOCAL_STORAGE_DIR = root;
  process.env.STORAGE_UPLOAD_SECRET = "local-test-secret";
  const storage = new PortableObjectStorageService("local");
  let objectPath = "";

  try {
    const target = await storage.getObjectEntityUploadTarget(
      "owner-1",
      "image/png",
      4,
    );
    objectPath = target.objectPath;
    const token = target.uploadURL.split("/").at(-1) ?? "";
    const upload = storage.verifyLocalUploadToken(token);
    assert.ok(upload);
    assert.equal(upload.ownerId, "owner-1");
    assert.equal(upload.objectPath, objectPath);
    assert.equal(storage.verifyLocalUploadToken(`${token}tampered`), null);

    await storage.storeLocalUpload(upload, Buffer.from("data"));
    const file = await storage.getObjectEntityFile(objectPath);
    const metadata = await file.getMetadata();
    assert.equal(metadata.size, 4);
    assert.equal(metadata.contentType, "image/png");
    assert.deepEqual(await streamToBuffer(file.createReadStream()), Buffer.from("data"));

    await storage.trySetObjectEntityAclPolicy(objectPath, {
      owner: "owner-1",
      visibility: "public",
    });
    assert.equal(
      await storage.canAccessObjectEntity({ userId: "owner-1", objectFile: file }),
      true,
    );
    assert.equal(
      await storage.canAccessObjectEntity({ userId: "other", objectFile: file }),
      true,
    );
    await assert.rejects(storage.storeLocalUpload(upload, Buffer.from("data")));
    await storage.deleteObjectEntity(objectPath);
  } finally {
    await rm(root, { recursive: true, force: true });
    if (previous.root === undefined) delete process.env.LOCAL_STORAGE_DIR;
    else process.env.LOCAL_STORAGE_DIR = previous.root;
    if (previous.uploadSecret === undefined) {
      delete process.env.STORAGE_UPLOAD_SECRET;
    } else {
      process.env.STORAGE_UPLOAD_SECRET = previous.uploadSecret;
    }
  }
});

test("S3 upload links can be signed without contacting the storage provider", async () => {
  const names = [
    "S3_BUCKET",
    "S3_REGION",
    "S3_ENDPOINT",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "S3_FORCE_PATH_STYLE",
  ] as const;
  const previous = new Map(names.map((name) => [name, process.env[name]]));
  Object.assign(process.env, {
    S3_BUCKET: "gbloc-test",
    S3_REGION: "auto",
    S3_ENDPOINT: "https://s3.example.test",
    S3_ACCESS_KEY_ID: "local-test-access",
    S3_SECRET_ACCESS_KEY: "local-test-secret",
    S3_FORCE_PATH_STYLE: "true",
  });
  clearS3ClientCacheForTests();

  try {
    const storage = new PortableObjectStorageService("s3");
    const target = await storage.getObjectEntityUploadTarget(
      "owner-1",
      "image/png",
      4,
    );
    const url = new URL(target.uploadURL);
    assert.equal(url.hostname, "s3.example.test");
    assert.match(url.pathname, /gbloc-test\/objects\/uploads\//);
    assert.equal(target.objectPath.startsWith("/objects/uploads/"), true);
    assert.equal(url.searchParams.has("X-Amz-Signature"), true);
  } finally {
    clearS3ClientCacheForTests();
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
