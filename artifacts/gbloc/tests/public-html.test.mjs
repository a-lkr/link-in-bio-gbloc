import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { test } from "node:test";
import { injectRouteMetadata, isKnownRoute } from "../seo-server.mjs";
import { render } from "../dist/server/entry-server.js";

test("public SSR renders existing marketing, pricing and current legal content", async () => {
  const home = await render("/", async () => { throw new Error("Home must not fetch documents"); });
  assert.match(home, /<h1>เรื่องของเรา/);
  assert.match(home, /href="\/legal#privacy"/);
  const price = await render("/price", async () => null);
  assert.match(price, /฿35 \/ 1 เดือน/);
  assert.match(price, /ไม่มีต่ออายุอัตโนมัติ/);
  const legal = await render("/legal", async path => path.endsWith("/terms")
    ? { content: "## Published terms\nCurrent terms <script>untrusted</script>", effectiveAt: "2026-11-01T00:00:00Z" }
    : { content: "## Privacy\nCurrent privacy policy" });
  assert.match(legal, /Current terms &lt;script&gt;untrusted&lt;\/script&gt;/);
  assert.match(legal, /Current privacy policy/);
  assert.doesNotMatch(legal, /กำลังโหลด/);
  const unpublished = await render("/legal", async path => path.endsWith("/terms") ? null : { content: "Privacy" });
  assert.match(unpublished, /ยังไม่มีข้อกำหนดที่เผยแพร่/);
});

test("route allowlist retains member and authentication deep links, not arbitrary paths", () => {
  for (const path of ["/", "/legal", "/price", "/account", "/customize", "/admin", "/moderation/reports", "/cookies", "/link", "/sign-in", "/sign-in/callback", "/sign-up/verify"]) {
    assert.equal(isKnownRoute(path), true, path);
  }
  for (const path of ["/does-not-exist", "/arbitrary/nested", "/account/unknown", "/sign-invented"]) {
    assert.equal(isKnownRoute(path), false, path);
  }
});

test("metadata honors runtime public origin and descriptive public titles", () => {
  const originalOrigin = process.env.GBLOC_PUBLIC_ORIGIN;
  process.env.GBLOC_PUBLIC_ORIGIN = "https://custom.example";
  try {
  const html = injectRouteMetadata('<head><title>gbloc</title><link rel="canonical" href="old"><meta property="og:url" content="old"></head>', {
    headers: { host: "custom.example", "x-forwarded-proto": "https" },
  }, "/legal/");
  assert.match(html, /ข้อกำหนดและนโยบายความเป็นส่วนตัว \| GBLOC/);
  assert.match(html, /href="https:\/\/custom.example\/legal"/);
  assert.match(html, /property="og:url" content="https:\/\/custom\.example\/legal"/);
  assert.match(html, /name="gbloc-public-origin" content="https:\/\/custom.example"/);
  } finally {
    if (originalOrigin === undefined) delete process.env.GBLOC_PUBLIC_ORIGIN;
    else process.env.GBLOC_PUBLIC_ORIGIN = originalOrigin;
  }
});

test("production HTTP serves readable HTML, correct statuses, redirects and HEAD", async () => {
  let legalUnavailable = false;
  const api = createServer((req, res) => {
    if (req.url.startsWith("/@Alice")) {
      res.writeHead(301, { Location: "https://canonical.example/@alice" }).end();
    } else if (req.url.startsWith("/@missing")) {
      res.writeHead(404, { "Content-Type": "text/html" }).end("<main>Profile not found</main>");
    } else if (req.url === "/api/legal/terms" || req.url === "/api/legal/privacy") {
      if (legalUnavailable) return res.writeHead(500).end();
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ content: "Published public legal document", effectiveAt: "2026-11-01T00:00:00Z" }));
    } else {
      res.writeHead(404).end();
    }
  }).listen(0, "127.0.0.1");
  await once(api, "listening");
  const reservation = createServer().listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, PORT: String(port), GBLOC_API_PORT: String(api.address().port), GBLOC_PUBLIC_ORIGIN: "https://canonical.example" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await Promise.race([
      once(child.stdout, "data"),
      once(child, "exit").then(([code]) => { throw new Error(`Web server exited: ${code}`); }),
    ]);
    const base = `http://127.0.0.1:${port}`;
    for (const path of ["/", "/price?utm_source=test", "/legal"]) {
      const response = await fetch(base + path);
      const html = await response.text();
      assert.equal(response.status, 200, path);
      assert.match(html, /<main/);
      assert.match(html, /canonical" href="https:\/\/canonical.example\/(?:price|legal)?"/);
      assert.doesNotMatch(html, /canonical" href="[^"]*utm_source/);
      if (path === "/legal") assert.match(html, /Published public legal document/);
    }
    for (const path of ["/customize", "/account", "/sign-in/callback"]) {
      assert.equal((await fetch(base + path)).status, 200, path);
    }
    for (const path of ["/does-not-exist", "/random/nested", "/account/unknown", "/missing.js"]) {
      assert.equal((await fetch(base + path)).status, 404, path);
    }
    const missing = await fetch(base + "/@missing");
    assert.equal(missing.status, 404);
    const redirect = await fetch(base + "/@Alice/?utm_source=chat", { redirect: "manual" });
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.get("location"), "https://canonical.example/@alice");
    for (const [path, location] of [["/terms", "/legal#terms"], ["/privacy", "/legal#privacy"], ["/Alice", "/@alice"]]) {
      const response = await fetch(base + path, { redirect: "manual" });
      assert.equal(response.status, 301);
      assert.equal(response.headers.get("location"), location);
    }
    const head = await fetch(base + "/price", { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
    assert.equal((await fetch(base + "/unknown/path", { method: "HEAD" })).status, 404);
    legalUnavailable = true;
    assert.equal((await fetch(base + "/legal")).status, 503);
  } finally {
    child.kill();
    await once(child, "exit");
    await new Promise(resolve => api.close(resolve));
  }
});
