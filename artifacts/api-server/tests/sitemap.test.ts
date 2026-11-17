import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSitemapXml } from "../src/lib/sitemap";

test("sitemap includes public pages and profile URLs with their update dates", () => {
  const xml = buildSitemapXml(
    [{ username: "alice_7", updatedAt: new Date("2026-10-20T12:30:00.000Z") }],
    "http://localhost:5173/",
  );

  assert.match(xml, /<loc>http:\/\/localhost:5173\/<\/loc>/);
  assert.match(xml, /<loc>http:\/\/localhost:5173\/price<\/loc>/);
  assert.match(xml, /<loc>http:\/\/localhost:5173\/legal<\/loc>/);
  assert.doesNotMatch(xml, /<loc>http:\/\/localhost:5173\/(terms|privacy)<\/loc>/);
  assert.match(xml, /<loc>http:\/\/localhost:5173\/@alice_7<\/loc>/);
  assert.match(xml, /<lastmod>2026-10-20T12:30:00\.000Z<\/lastmod>/);
  assert.doesNotMatch(xml, /\/(account|customize|link|admin|sign-in|sign-up)(?:<|\/)/);
});

test("sitemap normalizes origin and username casing", () => {
  const xml = buildSitemapXml([{ username: "ALICE", updatedAt: new Date("2026-11-01") }], "https://custom.example/path?tracking=1");
  assert.match(xml, /<loc>https:\/\/custom.example\/@alice<\/loc>/);
  assert.doesNotMatch(xml, /tracking|ALICE/);
});
