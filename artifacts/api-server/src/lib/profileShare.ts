function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}

export function profileShareImageUrl({
  origin,
  avatarPath,
  publicAvatarPath,
}: {
  origin: string;
  avatarPath: string | null;
  publicAvatarPath: string | null;
}): string {
  if (!avatarPath || publicAvatarPath !== avatarPath) {
    return new URL("/brand-full.png", origin).toString();
  }

  const objectKey = avatarPath.replace(/^\/?objects\//, "");
  const imagePath = `/api/storage/objects/${objectKey
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  return new URL(imagePath, origin).toString();
}

export function buildProfileShareDocument({
  title,
  description,
  imageUrl,
  pageUrl,
  robots = "index, follow",
  profile,
}: {
  title: string;
  description?: string | null;
  imageUrl: string;
  pageUrl: string;
  robots?: string;
  profile?: {
    displayName: string;
    username: string;
    bio: string;
    location: string;
    links: Array<{ mode: string; label: string | null; platform: string; value: string; resolvedUrl: string | null }>;
  };
}): string {
  const safeTitle = escapeHtml(title);
  const safeDescription = description?.trim() ? escapeHtml(description.trim()) : null;
  const safeImageUrl = escapeHtml(imageUrl);
  const safePageUrl = escapeHtml(pageUrl);
  const isProduction = process.env.NODE_ENV === "production";
  const stylesheet = isProduction ? '<link rel="stylesheet" href="/assets/app.css">' : "";
  const appScript = isProduction ? "/assets/app.js" : "/src/main.tsx";
  const content = profile
    ? `<main aria-label="โปรไฟล์"><h1>${escapeHtml(profile.displayName || profile.username)}</h1>
      <p>@${escapeHtml(profile.username)}</p>
      ${profile.bio ? `<p style="white-space:pre-wrap">${escapeHtml(profile.bio)}</p>` : ""}
      ${profile.location ? `<p>${escapeHtml(profile.location)}</p>` : ""}
      <ul>${profile.links.map(link => {
        const label = escapeHtml(link.label || link.platform);
        // Only expose links which the public API resolves, never arbitrary URL schemes.
        const url = link.resolvedUrl;
        const safeUrl = url && /^(https?:|mailto:|tel:)/i.test(url);
        return link.mode !== "text" && safeUrl
          ? `<li><a href="${escapeHtml(url)}" rel="noopener noreferrer">${label}</a></li>`
          : `<li>${label}: ${escapeHtml(link.value)}</li>`;
      }).join("")}</ul><a href="/">GBLOC</a></main>`
    : `<main><h1>${safeTitle}</h1>${safeDescription ? `<p>${safeDescription}</p>` : ""}<a href="/">GBLOC</a></main>`;

  return `<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8">
    <meta name="gbloc-public-origin" content="${escapeHtml(new URL(pageUrl).origin)}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    ${safeDescription === null ? "" : `<meta name="description" content="${safeDescription}">`}
    <meta name="robots" content="${escapeHtml(robots)}">
    <link rel="canonical" href="${safePageUrl}">
    <meta property="og:title" content="${safeTitle}">
    ${safeDescription === null ? "" : `<meta property="og:description" content="${safeDescription}">`}
    <meta property="og:image" content="${safeImageUrl}">
    <meta property="og:url" content="${safePageUrl}">
    <meta property="og:type" content="profile">
    <meta property="og:site_name" content="GBLOC">
    <meta property="og:locale" content="th_TH">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    ${safeDescription === null ? "" : `<meta name="twitter:description" content="${safeDescription}">`}
    <meta name="twitter:image" content="${safeImageUrl}">
    <link rel="icon" type="image/png" href="/brand-g.png">
    ${stylesheet}
  </head>
  <body>
    <div id="root">${content}</div>
    <script type="module" src="${appScript}"></script>
  </body>
</html>`;
}
