import seoPages from "./src/lib/seo-pages.json" with { type: "json" };

export function publicOriginFor(request) {
  if (process.env.GBLOC_PUBLIC_ORIGIN) return new URL(process.env.GBLOC_PUBLIC_ORIGIN).origin;
  const protocol = request.headers["x-forwarded-proto"]?.split(",")[0]?.trim() || "http";
  return new URL(`${protocol}://${request.headers.host || "localhost"}`).origin;
}

export function normalizePath(pathname) {
  return pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
}

export function isKnownRoute(pathname) {
  return Boolean(seoPages[pathname]) ||
    ["/customize", "/account", "/moderation/reports", "/admin", "/cookies", "/link"].includes(pathname) ||
    /^\/sign-(?:in|up)(?:\/.*)?$/.test(pathname);
}

export function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

export function injectRouteMetadata(html, request, pathname) {
  const metadata = seoPages[normalizePath(pathname)];
  const title = metadata?.title ?? "GBLOC | พื้นที่สมาชิก";
  const description = metadata?.description ?? "จัดการโปรไฟล์ ลิงก์ และการตั้งค่าบัญชีบน GBLOC";
  const origin = publicOriginFor(request);
  const canonical = new URL(normalizePath(pathname), origin).href;
  const image = new URL("/brand-full.png", origin).href;
  const values = {
    'name="description"': description,
    'name="robots"': metadata ? "index, follow" : "noindex, nofollow",
    'property="og:title"': title,
    'property="og:description"': description,
    'property="og:image"': image,
    'property="og:url"': canonical,
    'name="twitter:title"': title,
    'name="twitter:description"': description,
    'name="twitter:image"': image,
  };
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  const canonicalTag = `<link rel="canonical" href="${escapeHtml(canonical)}" />`;
  if (/<link rel="canonical"[^>]*>/i.test(html)) {
    html = html.replace(/<link rel="canonical"[^>]*>/i, canonicalTag);
  } else {
    html = html.replace("</head>", `${canonicalTag}</head>`);
  }
  if (!/<meta property="og:url"[^>]*>/i.test(html)) {
    html = html.replace("</head>", `<meta property="og:url" content="${escapeHtml(canonical)}" /></head>`);
  }
  for (const [attribute, content] of Object.entries(values)) {
    html = html.replace(new RegExp(`<meta ${attribute}[^>]*>`, "i"), `<meta ${attribute} content="${escapeHtml(content)}" />`);
  }
  // The browser uses the same runtime origin as initial HTML, including after client navigation.
  return html.replace("</head>", `<meta name="gbloc-public-origin" content="${escapeHtml(origin)}"></head>`);
}

export async function renderPublicPage(pathname, loadRenderer) {
  if (!seoPages[pathname]) return "";
  const { render } = await loadRenderer();
  return render(pathname, async path => {
    const response = await fetch(`http://127.0.0.1:${process.env.GBLOC_API_PORT || 8080}${path}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 404 && path === "/api/legal/terms") return null;
    if (!response.ok) throw new Error(`Public document request failed: ${response.status}`);
    return response.json();
  });
}
