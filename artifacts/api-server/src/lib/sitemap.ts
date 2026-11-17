const SITE_ORIGIN = process.env.GBLOC_PUBLIC_ORIGIN || "http://localhost:5173";
const PUBLIC_STATIC_PATHS = ["/", "/price", "/legal"];

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, character => {
    switch (character) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      default: return "&quot;";
    }
  });
}

export function buildSitemapXml(
  profiles: Array<{ username: string; updatedAt: Date }>,
  siteOrigin = SITE_ORIGIN,
): string {
  const origin = new URL(siteOrigin).origin;
  const staticUrls = PUBLIC_STATIC_PATHS.map(path => `${origin}${path}`);
  const profileUrls = profiles.map(({ username, updatedAt }) => {
    const lastmod = updatedAt.toISOString();
    return `<url><loc>${escapeXml(`${origin}/@${encodeURIComponent(username.toLowerCase())}`)}</loc><lastmod>${lastmod}</lastmod></url>`;
  });
  const staticEntries = staticUrls.map(url => `<url><loc>${escapeXml(url)}</loc></url>`);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticEntries,
    ...profileUrls,
    "</urlset>",
  ].join("");
}
