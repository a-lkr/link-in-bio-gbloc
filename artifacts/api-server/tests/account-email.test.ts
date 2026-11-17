import assert from "node:assert/strict";
import { once } from "node:events";
import express, { type Express } from "express";
import { test } from "node:test";
import { createAccountEmailRouter } from "../src/routes/account-email";

type TestUser = {
  createdAt: Date;
  primaryEmailAddressId: string | null;
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
    verification?: { status?: string } | null;
  }>;
};

type StoredEmail = { email: string; updatedAt: Date };

function createEmailTestApp() {
  const emails = new Map<string, StoredEmail>();
  const users = new Map<string, TestUser>();
  const app: Express = express();
  app.use((req, _res, next) => {
    const userId = req.header("x-user-id") ?? null;
    (req as typeof req & { auth?: { userId: string | null } }).auth = {
      userId,
    };
    next();
  });
  app.use(
    createAccountEmailRouter({
      getOwnerId: (req) =>
        (req as typeof req & { auth?: { userId: string | null } }).auth
          ?.userId ?? null,
      getStoredEmail: async (ownerId) => {
        const record = emails.get(ownerId);
        return {
          email: record?.email ?? null,
          updatedAt: record?.updatedAt ?? null,
        };
      },
      getUser: async (ownerId) => {
        const user = users.get(ownerId);
        if (!user) throw new Error("User not found");
        return user;
      },
      saveEmail: async (ownerId, email, updatedAt) => {
        const record = { email, updatedAt };
        emails.set(ownerId, record);
        return record;
      },
    }),
  );
  return { app, emails, users };
}

async function startServer(app: Express) {
  const server = app.listen(0);
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

test("requires sign-in and a verified primary email before syncing", async () => {
  const { app, emails, users } = createEmailTestApp();
  users.set("unverified", {
    createdAt: new Date("2025-01-03T04:05:00.000Z"),
    primaryEmailAddressId: "primary",
    emailAddresses: [
      {
        id: "primary",
        emailAddress: "not-verified@example.test",
        verification: { status: "unverified" },
      },
      {
        id: "verified-secondary",
        emailAddress: "secondary@example.test",
        verification: { status: "verified" },
      },
    ],
  });
  const server = await startServer(app);
  try {
    const anonymousRead = await fetch(`${server.url}/account/email`);
    const anonymousSync = await fetch(`${server.url}/account/email/sync`, {
      method: "POST",
    });
    assert.equal(anonymousRead.status, 401);
    assert.equal(anonymousSync.status, 401);

    const unverifiedSync = await fetch(`${server.url}/account/email/sync`, {
      method: "POST",
      headers: { "x-user-id": "unverified" },
    });
    assert.equal(unverifiedSync.status, 409);
    assert.equal(emails.has("unverified"), false);
  } finally {
    await server.close();
  }
});

test("syncs a changed primary email without exposing another account's email", async () => {
  const { app, emails, users } = createEmailTestApp();
  users.set("account-a", {
    createdAt: new Date("2024-05-06T07:08:00.000Z"),
    primaryEmailAddressId: "email-one",
    emailAddresses: [
      {
        id: "email-one",
        emailAddress: " First@Example.Test ",
        verification: { status: "verified" },
      },
      {
        id: "email-two",
        emailAddress: "second@example.test",
        verification: { status: "verified" },
      },
    ],
  });
  users.set("account-b", {
    createdAt: new Date("2023-02-03T04:05:00.000Z"),
    primaryEmailAddressId: "email-b",
    emailAddresses: [
      {
        id: "email-b",
        emailAddress: "private-b@example.test",
        verification: { status: "verified" },
      },
    ],
  });
  emails.set("account-b", {
    email: "private-b@example.test",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });

  const server = await startServer(app);
  try {
    const firstSync = await fetch(`${server.url}/account/email/sync`, {
      method: "POST",
      headers: { "x-user-id": "account-a" },
    });
    assert.equal(firstSync.status, 200);
    const firstSyncBody = await firstSync.json();
    assert.equal(firstSyncBody.email, "first@example.test");
    assert.equal(firstSyncBody.accountCreatedAt, "2024-05-06T07:08:00.000Z");

    users.set("account-a", {
      createdAt: new Date("2024-05-06T07:08:00.000Z"),
      primaryEmailAddressId: "email-two",
      emailAddresses: [
        {
          id: "email-one",
          emailAddress: "first@example.test",
          verification: { status: "verified" },
        },
        {
          id: "email-two",
          emailAddress: " NewPrimary@Example.Test ",
          verification: { status: "verified" },
        },
      ],
    });
    const changedSync = await fetch(`${server.url}/account/email/sync`, {
      method: "POST",
      headers: { "x-user-id": "account-a" },
    });
    assert.equal(changedSync.status, 200);
    const changedSyncBody = await changedSync.json();
    assert.equal(changedSyncBody.email, "newprimary@example.test");
    assert.equal(changedSyncBody.accountCreatedAt, "2024-05-06T07:08:00.000Z");

    const accountARead = await fetch(`${server.url}/account/email`, {
      headers: { "x-user-id": "account-a" },
    });
    const accountBRead = await fetch(`${server.url}/account/email`, {
      headers: { "x-user-id": "account-b" },
    });
    const accountAReadBody = await accountARead.json();
    const accountBReadBody = await accountBRead.json();
    assert.equal(accountAReadBody.email, "newprimary@example.test");
    assert.equal(accountAReadBody.accountCreatedAt, "2024-05-06T07:08:00.000Z");
    assert.equal(accountBReadBody.email, "private-b@example.test");
    assert.equal(accountBReadBody.accountCreatedAt, "2023-02-03T04:05:00.000Z");
    assert.equal(emails.get("account-b")?.email, "private-b@example.test");
  } finally {
    await server.close();
  }
});
