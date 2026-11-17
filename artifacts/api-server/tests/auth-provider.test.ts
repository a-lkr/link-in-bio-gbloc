import assert from "node:assert/strict";
import { once } from "node:events";
import cookieParser from "cookie-parser";
import express from "express";
import test from "node:test";
import authRouter from "../src/routes/auth";

test("only Google sign-in is exposed until more providers are added", async () => {
  const previousClientId = process.env.GOOGLE_CLIENT_ID;
  const previousClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;

  const app = express();
    app.use(cookieParser());
  app.use(express.json());
  app.use(authRouter);
  const server = app.listen(0);
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const start = await fetch(`${baseUrl}/auth/google/start`, { redirect: "manual" });
    assert.equal(start.status, 302);
    assert.equal(start.headers.get("location"), "/sign-in?authError=google-not-configured");

    const emailSignup = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "person@example.com", password: "not-used-here" }),
    });
    assert.equal(emailSignup.status, 404);

    const state = "A".repeat(43);
    const unboundCallback = await fetch(
      `${baseUrl}/auth/google/callback?state=${state}&code=unused`,
      { redirect: "manual" },
    );
    assert.equal(unboundCallback.status, 302);
    assert.equal(
      unboundCallback.headers.get("location"),
      "/sign-in?authError=google-sign-in-failed",
    );

    const mismatchedCookieCallback = await fetch(
      `${baseUrl}/auth/google/callback?state=${state}&code=unused`,
      {
        headers: { cookie: `gbloc_oauth_state_${state}=wrong` },
        redirect: "manual",
      },
    );
    assert.equal(mismatchedCookieCallback.status, 302);
    assert.equal(
      mismatchedCookieCallback.headers.get("location"),
      "/sign-in?authError=google-sign-in-failed",
    );
  } finally {
    server.close();
    if (previousClientId) process.env.GOOGLE_CLIENT_ID = previousClientId;
    else delete process.env.GOOGLE_CLIENT_ID;
    if (previousClientSecret) process.env.GOOGLE_CLIENT_SECRET = previousClientSecret;
    else delete process.env.GOOGLE_CLIENT_SECRET;
  }
});
