import assert from "node:assert/strict";
import { once } from "node:events";
import express, { type Express } from "express";
import { PgDialect } from "drizzle-orm/pg-core";
import { test } from "node:test";
import {
  accountDeletionRequestsTable,
  billingPurchasesTable,
  db,
  membershipsTable,
  profileLinksTable,
  profilesTable,
} from "@workspace/db";
import profilesRouter from "../src/routes/profiles";
import storageRouter from "../src/routes/storage";

const ownerId = "membership-test-owner";
const profile = {
  id: "a98e48b1-a89a-42f8-b3b2-3edc8845d5a0",
  ownerId,
  username: "tieruser",
  displayName: "Tier User",
  bio: "",
  showAvatar: true,
  location: "",
  theme: "ember",
  backgroundColor: "#000000",
  displayNameColor: "#ffffff",
  descriptionColor: "#c2b9cb",
  locationColor: "#e2dbe9",
  socialColor: "#f7f3ff",
  musicColor: "#dfd7e8",
  viewsColor: "#afa4bb",
  enterTextColor: "#f6f2fc",
  glowIntensity: 45,
  showProfileFrame: true,
  profileFrameColor: "#c296ff",
  profileFrameBackgroundColor: "#17121d",
  profileFrameBlur: 8,
  backgroundEffect: "black",
  premiumBackground: "none",
  premiumBackgroundStrength: 55,
  premiumFont: "default",
  premiumTextEffect: "none",
  showProBadge: true,
  showCredit: false,
  extraAudioTracks: [{ path: null, title: "Extra song" }],
  avatarX: 50,
  avatarY: 50,
  avatarZoom: 100,
  avatarPath: null,
  backgroundPath: null,
  backgroundType: null,
  audioPath: null,
  audioTitle: "",
  audioCoverPath: null,
  showMusicPlayer: true,
  showVolumeControl: true,
  musicVolume: 80,
  focusX: 50,
  focusY: 50,
  dimOpacity: 35,
  enterText: "Click to enter",
  showViews: true,
  viewCount: 0,
  isSuspended: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

type MembershipRecord = {
  plan: "basic" | "pro";
  expiresAt: Date;
} | null;

type PurchaseRecord = {
  plan: "basic" | "pro";
  startsAt: Date;
  expiresAt: Date;
} | null;

function installDatabaseMock(
  membership: MembershipRecord,
  purchase: PurchaseRecord = null,
) {
  const mutableDb = db as unknown as {
    select: (...args: unknown[]) => unknown;
    update: (...args: unknown[]) => unknown;
  };
  const persistedProfile = { ...profile };
  let updateCalls = 0;

  mutableDb.select = () => {
    let table: unknown;
    let whereClause: unknown;
    const query = {
      from(value: unknown) {
        table = value;
        return query;
      },
      where(value: unknown) {
        whereClause = value;
        return query;
      },
      limit: async () => rowsFor(table, whereClause),
      orderBy() {
        if (table === profileLinksTable) {
          return Promise.resolve(rowsFor(table, whereClause));
        }
        return query;
      },
    };
    return query;
  };

  mutableDb.update = () => {
    let update: Record<string, unknown> = {};
    const query = {
      set(value: Record<string, unknown>) {
        update = value;
        return query;
      },
      where() {
        return query;
      },
      returning: async () => {
        Object.assign(persistedProfile, update);
        updateCalls += 1;
        return [{ ...persistedProfile }];
      },
    };
    return query;
  };

  function rowsFor(table: unknown, whereClause: unknown): unknown[] {
    if (table === accountDeletionRequestsTable || table === profileLinksTable) {
      return [];
    }
    if (table === profilesTable) {
      return [{ ...persistedProfile }];
    }
    if (table === billingPurchasesTable) {
      const now = new Date();
      return purchase && purchase.startsAt <= now && purchase.expiresAt > now
        ? [{ plan: purchase.plan, expiresAt: purchase.expiresAt, startedAt: purchase.startsAt }]
        : [];
    }
    if (table === membershipsTable) {
      assert.ok(whereClause, "membership query must include an access filter");
      const query = new PgDialect().sqlToQuery(whereClause as never);
      assert.match(query.sql, /"memberships"\."owner_id" =/);
      assert.match(query.sql, /"memberships"\."expires_at" >/);
      assert.equal(query.params[0], ownerId);
      assert.ok(typeof query.params[1] === "string");
      const now = new Date(query.params[1] as string);
      return membership && membership.expiresAt > now
        ? [{ plan: membership.plan, expiresAt: membership.expiresAt }]
        : [];
    }
    return [];
  }

  return {
    persistedProfile,
    get updateCalls() {
      return updateCalls;
    },
    restore() {
      delete (db as unknown as { select?: unknown }).select;
      delete (db as unknown as { update?: unknown }).update;
    },
  };
}

async function startApp(): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  const app: Express = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as typeof req & { auth?: { userId: string | null } }).auth = {
      userId: ownerId,
    };
    next();
  });
  app.use(profilesRouter);
  app.use(storageRouter);

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

async function patchProfile(url: string, body: Record<string, unknown>) {
  return fetch(`${url}/profiles/me`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("owners can hide the volume control without hiding profile music", async () => {
  const mock = installDatabaseMock(null);
  const server = await startApp();
  try {
    const response = await patchProfile(server.url, { showVolumeControl: false });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.showVolumeControl, false);
    assert.equal(mock.persistedProfile.showVolumeControl, false);
    assert.equal(mock.persistedProfile.showMusicPlayer, true);
    assert.equal(mock.updateCalls, 1);
  } finally {
    await server.close();
    mock.restore();
  }
});

test("active Basic members can save Basic entitlements", async () => {
  const mock = installDatabaseMock({
    plan: "basic",
    expiresAt: new Date("2099-01-01T00:00:00.000Z"),
  });
  const server = await startApp();
  try {
    const response = await patchProfile(server.url, {
      showCredit: false,
      premiumFont: "kanit",
    });
    assert.equal(response.status, 200);
    assert.equal(mock.persistedProfile.showCredit, false);
    assert.equal(mock.persistedProfile.premiumFont, "kanit");
    assert.equal(mock.updateCalls, 1);
  } finally {
    await server.close();
    mock.restore();
  }
});

test("a paid Basic purchase grants Basic profile entitlements until expiry", async () => {
  const mock = installDatabaseMock(null, {
    plan: "basic",
    startsAt: new Date("2026-01-01T00:00:00.000Z"),
    expiresAt: new Date("2099-01-01T00:00:00.000Z"),
  });
  const server = await startApp();
  try {
    const response = await patchProfile(server.url, {
      showCredit: false,
      premiumFont: "kanit",
    });
    assert.equal(response.status, 200);
    assert.equal(mock.persistedProfile.showCredit, false);
    assert.equal(mock.persistedProfile.premiumFont, "kanit");
    assert.equal(mock.updateCalls, 1);
  } finally {
    await server.close();
    mock.restore();
  }
});

test("active Pro members can save Pro badge and extra songs", async () => {
  const mock = installDatabaseMock({
    plan: "pro",
    expiresAt: new Date("2099-01-01T00:00:00.000Z"),
  });
  const server = await startApp();
  try {
    const response = await patchProfile(server.url, {
      showProBadge: true,
      extraAudioTracks: [{ path: null, title: "Extra song" }],
    });
    assert.equal(response.status, 200);
    assert.equal(mock.persistedProfile.showProBadge, true);
    assert.deepEqual(mock.persistedProfile.extraAudioTracks, [
      { path: null, title: "Extra song" },
    ]);
    assert.equal(mock.updateCalls, 1);
  } finally {
    await server.close();
    mock.restore();
  }
});

test("Basic and expired memberships cannot save Pro-only profile settings", async () => {
  for (const membership of [
    { plan: "basic" as const, expiresAt: new Date("2099-01-01T00:00:00.000Z") },
    { plan: "pro" as const, expiresAt: new Date("2020-01-01T00:00:00.000Z") },
  ]) {
    const mock = installDatabaseMock(membership);
    const server = await startApp();
    try {
      const response = await patchProfile(server.url, {
        showProBadge: true,
        extraAudioTracks: [{ path: null, title: "Extra song" }],
      });
      assert.equal(response.status, 403);
      assert.equal(mock.updateCalls, 0);
    } finally {
      await server.close();
      mock.restore();
    }
  }
});

test("Basic and expired memberships cannot request uploads for extra songs", async () => {
  for (const membership of [
    { plan: "basic" as const, expiresAt: new Date("2099-01-01T00:00:00.000Z") },
    { plan: "pro" as const, expiresAt: new Date("2020-01-01T00:00:00.000Z") },
  ]) {
    const mock = installDatabaseMock(membership);
    const server = await startApp();
    try {
      const response = await fetch(
        `${server.url}/storage/uploads/request-url`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "song.mp3",
            size: 1024,
            contentType: "audio/mpeg",
            assetField: "audioPath2",
          }),
        },
      );
      assert.equal(response.status, 403);
    } finally {
      await server.close();
      mock.restore();
    }
  }
});

test("expired memberships restore public credit and hide Pro-only profile features", async () => {
  const mock = installDatabaseMock({
    plan: "pro",
    expiresAt: new Date("2020-01-01T00:00:00.000Z"),
  });
  const server = await startApp();
  try {
    const response = await fetch(`${server.url}/profiles/tieruser`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.profile.showCredit, true);
    assert.equal(body.profile.showProBadge, false);
    assert.deepEqual(body.profile.extraAudioTracks, []);
  } finally {
    await server.close();
    mock.restore();
  }
});
