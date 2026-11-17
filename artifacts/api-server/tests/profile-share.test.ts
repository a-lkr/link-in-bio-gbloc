import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import express from "express";
import {
  buildProfileShareDocument,
  profileShareImageUrl,
} from "../src/lib/profileShare";
import { publicProfileShareRouter } from "../src/routes/profiles";
import { db, profilesTable, profileLinksTable } from "@workspace/db";

test("profiles without a public avatar use the gbloc share image", () => {
  assert.equal(
    profileShareImageUrl({
      origin: "https://example.test",
      avatarPath: "/objects/private/avatar.png",
      publicAvatarPath: null,
    }),
    "https://example.test/brand-full.png",
  );
  assert.equal(
    profileShareImageUrl({
      origin: "https://example.test",
      avatarPath: "/objects/private/avatar.png",
      publicAvatarPath: null,
    }),
    "https://example.test/brand-full.png",
  );
});

test("public avatars use their public object URL", () => {
  assert.equal(
    profileShareImageUrl({
      origin: "https://example.test",
      avatarPath: "/objects/uploads/my avatar.png",
      publicAvatarPath: "/objects/uploads/my avatar.png",
    }),
    "https://example.test/api/storage/objects/uploads/my%20avatar.png",
  );
});

test("share tags escape profile content and include the app shell", () => {
  const html = buildProfileShareDocument({
    title: `@alice & "profile"`,
    description: `<script>alert("x")</script>`,
    imageUrl: "https://example.test/brand-full.png",
    pageUrl: "https://example.test/@alice",
  });

  assert.match(html, /<title>@alice &amp; &quot;profile&quot;<\/title>/);
  assert.match(html, /property="og:description" content="&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;"/);
  assert.match(html, /name="twitter:image"/);
  assert.match(html, /id="root"/);
});

test("share document omits descriptions when a profile has none", () => {
  const html = buildProfileShareDocument({
    title: "@alice",
    description: null,
    imageUrl: "https://example.test/avatar.png",
    pageUrl: "https://example.test/@alice",
  });
  assert.doesNotMatch(html, /name="description"/);
  assert.doesNotMatch(html, /property="og:description"/);
  assert.doesNotMatch(html, /name="twitter:description"/);
});

test("initial profile HTML contains the full public bio and safely resolved links", () => {
  const html = buildProfileShareDocument({
    title: "@alice", imageUrl: "https://example.test/brand-full.png", pageUrl: "https://example.test/@alice",
    profile: {
      username: "alice", displayName: 'Alice <script>alert("x")</script>',
      bio: "Full creator bio " + "long ".repeat(100), location: "Bangkok",
      links: [
        { mode: "link", platform: "website", label: "Portfolio", value: "", resolvedUrl: "https://example.com/?a=1&b=2" },
        { mode: "text", platform: "custom", label: "Contact", value: "Public contact", resolvedUrl: null },
        { mode: "link", platform: "custom", label: "Unsafe", value: "", resolvedUrl: "javascript:alert(1)" },
      ],
    },
  });
  assert.match(html, /<h1>Alice &lt;script&gt;/);
  assert.match(html, /Full creator bio/);
  assert.match(html, /href="https:\/\/example.com\/\?a=1&amp;b=2"[^>]*>Portfolio/);
  assert.match(html, /Contact: Public contact/);
  assert.doesNotMatch(html, /href="javascript:/);
  assert.match(html, /name="gbloc-public-origin" content="https:\/\/example\.test"/);
});

test("share route normalizes variants and emits clean canonical URLs with public content", async () => {
  const originalSelect = db.select;
  const originalOrigin = process.env.GBLOC_PUBLIC_ORIGIN;
  process.env.GBLOC_PUBLIC_ORIGIN = "https://canonical.example";
  let profileVisible = true;
  // Return only public fixture data; no database writes or network database dependency.
  db.select = (() => {
    let table: unknown;
    const rows = () => table === profilesTable ? profileVisible ? [{
      id: "profile-id", ownerId: "owner-id", username: "alice", displayName: "Creator Alice",
      bio: "Full public biography", location: "Public location", avatarPath: null,
    }] : [] : table === profileLinksTable ? [{
      id: "link-id", platform: "website", mode: "url", value: "https://example.com",
      label: "Portfolio", sortOrder: 0, icon: null,
    }] : [];
    const query = {
      from(value: unknown) { table = value; return query; },
      where() { return query; },
      limit: async () => rows(),
      orderBy() { return table === profileLinksTable ? Promise.resolve(rows()) : query; },
    };
    return query;
  }) as typeof db.select;
  const app = express();
  app.use(publicProfileShareRouter);
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  try {
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    for (const path of ["/@Alice", "/@alice/", "/@ALICE/?utm_source=chat"]) {
      const response = await fetch(base + path, { redirect: "manual" });
      assert.equal(response.status, 301);
      assert.equal(response.headers.get("location"), "https://canonical.example/@alice");
    }
    const response = await fetch(base + "/@alice?utm_source=chat");
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /canonical" href="https:\/\/canonical.example\/@alice"/);
    assert.match(html, /property="og:url" content="https:\/\/canonical.example\/@alice"/);
    assert.match(html, /<h1>Creator Alice<\/h1>/);
    assert.match(html, /Full public biography/);
    assert.match(html, />Portfolio<\/a>/);
    assert.doesNotMatch(html, /utm_source/);
    profileVisible = false;
    const missing = await fetch(base + "/@alice");
    assert.equal(missing.status, 404);
    assert.doesNotMatch(await missing.text(), /Full public biography/);
  } finally {
    db.select = originalSelect;
    if (originalOrigin === undefined) delete process.env.GBLOC_PUBLIC_ORIGIN;
    else process.env.GBLOC_PUBLIC_ORIGIN = originalOrigin;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test("the profile URL route returns HTML metadata without needing client JavaScript", async () => {
  const app = express();
  app.use(publicProfileShareRouter);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));

  try {
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/@bad-name`);
    const html = await response.text();

    assert.equal(response.status, 404);
    assert.match(response.headers.get("content-type") ?? "", /text\/html/);
    assert.match(html, /name="robots" content="noindex, nofollow"/);
    assert.match(html, /property="og:title"/);
    assert.match(html, /name="twitter:image"/);
    assert.match(html, /<div id="root"><main><h1>ไม่พบโปรไฟล์/);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
