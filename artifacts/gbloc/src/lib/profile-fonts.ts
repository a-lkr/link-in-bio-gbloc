// Keep this URL aligned with the nonblocking shared-font link in index.html.
// Prompt is also the existing pricing/legal brand font, not profile-only.
export const sharedFontsUrl = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+Thai:wght@400;500;600;700&family=Prompt:wght@400;500;600;700&display=swap';

const profileFamilies: Record<string, string> = {
  chakra: 'Chakra+Petch',
  'ibm-plex': 'IBM+Plex+Sans+Thai',
  kanit: 'Kanit',
  mitr: 'Mitr',
};

function appendFontStylesheet(id: string, href: string) {
  if (typeof document === 'undefined' || document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  // Even when inserted before first paint, font CSS must not block rendering.
  link.media = 'print';
  link.onload = () => { link.media = 'all'; };
  link.onerror = () => {
    console.warn(`Font stylesheet could not be loaded: ${id}`);
    link.remove(); // Allow a later selection/mount to retry.
  };
  document.head.appendChild(link);
}

export function loadSharedFonts() {
  if (typeof document === 'undefined') return;
  // Profile-share HTML has its own head rather than using index.html.
  for (const [href, crossOrigin] of [
    ['https://fonts.googleapis.com', false],
    ['https://fonts.gstatic.com', true],
  ] as const) {
    if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    if (crossOrigin) link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
  appendFontStylesheet('gbloc-shared-fonts', sharedFontsUrl);
}

export function loadProfileFont(font: string | null | undefined) {
  const family = font && Object.hasOwn(profileFamilies, font) ? profileFamilies[font] : undefined;
  if (!family) return; // Default and Prompt already use shared fonts.
  appendFontStylesheet(
    `gbloc-profile-font-${font}`,
    `https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap`,
  );
  // Keep loaded links for this document's lifetime: previews may share a font
  // and selecting it again should reuse the same request.
}
