import assert from "node:assert/strict";
import test from "node:test";
import { hashAuthToken } from "../src/lib/auth";
import {
  createAuthToken,
  normalizeEmail,
} from "../src/lib/auth-service";

test("auth tokens are opaque and stored as one-way hashes", () => {
  const token = createAuthToken();
  const hash = hashAuthToken(token);

  assert.equal(token.length, 43);
  assert.notEqual(token, hash);
  assert.equal(hash.length, 64);
});

test("email addresses are normalized consistently", () => {
  assert.equal(normalizeEmail("  USER@Example.COM "), "user@example.com");
});
