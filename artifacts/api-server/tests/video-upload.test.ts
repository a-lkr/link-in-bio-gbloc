import assert from "node:assert/strict";
import { test } from "node:test";
import { maxBytesForAsset } from "../src/routes/storage";

test("background videos including iPhone MOV and HEVC formats use the 10 MB limit", () => {
  for (const contentType of [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/hevc",
    "video/x-m4v",
  ]) {
    assert.equal(maxBytesForAsset("backgroundPath", contentType), 10 * 1024 * 1024);
  }
});

test("background images keep the 5 MB limit and unsupported video types are rejected", () => {
  assert.equal(maxBytesForAsset("backgroundPath", "image/png"), 5 * 1024 * 1024);
  assert.equal(maxBytesForAsset("backgroundPath", "video/x-msvideo"), null);
});
