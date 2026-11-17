import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { loadProfileFont, loadSharedFonts, sharedFontsUrl } from '../src/lib/profile-fonts.ts';

function fakeDocument() {
  const links = [];
  return {
    links,
    getElementById: id => links.find(link => link.id === id),
    querySelector: selector => links.find(link =>
      selector === `link[rel="preconnect"][href="${link.href}"]` && link.rel === 'preconnect'),
    createElement: () => {
      const link = { remove: () => links.splice(links.indexOf(link), 1) };
      return link;
    },
    head: { appendChild: link => links.push(link) },
  };
}

test('shared CSS has no remote import and HTML requests only nonblocking marketing fonts', async () => {
  const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /@import\s+(?:url\()?['"]https?:/);
  assert.doesNotMatch(html, /family=Inter/);
  const fontLink = html.match(/<link id="gbloc-shared-fonts"[^>]+>/)?.[0];
  assert.ok(fontLink?.includes(`href="${sharedFontsUrl}"`));
  assert.match(fontLink, /media="print"/);
  assert.match(fontLink, /onload="this.media='all'"/);
  assert.match(html, /<noscript><link[^>]+fonts\.googleapis/);
  assert.deepEqual(new URL(sharedFontsUrl).searchParams.getAll('family'), [
    'DM Sans:wght@400;500;600;700',
    'IBM Plex Mono:wght@400;500',
    'Noto Sans Thai:wght@400;500;600;700',
    'Prompt:wght@400;500;600;700',
  ]);
});

test('profile-share bootstrap loads shared fonts once and preserves preconnects', () => {
  globalThis.document = fakeDocument();
  try {
    loadSharedFonts();
    loadSharedFonts();
    assert.equal(document.links.length, 3);
    assert.equal(document.links[1].crossOrigin, 'anonymous');
    const shared = document.getElementById('gbloc-shared-fonts');
    assert.equal(shared.href, sharedFontsUrl);
    assert.equal(shared.media, 'print');
    shared.onload();
    assert.equal(shared.media, 'all');
  } finally {
    delete globalThis.document;
  }
});

test('only a selected optional family loads; repeated previews share a request', () => {
  globalThis.document = fakeDocument();
  try {
    for (const font of [undefined, null, 'default', 'prompt', 'unknown', 'toString']) loadProfileFont(font);
    assert.equal(document.links.length, 0);
    for (const [font, family] of Object.entries({
      kanit: 'Kanit', chakra: 'Chakra Petch', 'ibm-plex': 'IBM Plex Sans Thai', mitr: 'Mitr',
    })) {
      const previousCount = document.links.length;
      loadProfileFont(font);
      loadProfileFont(font);
      assert.equal(document.links.length, previousCount + 1);
      const link = document.getElementById(`gbloc-profile-font-${font}`);
      assert.deepEqual(new URL(link.href).searchParams.getAll('family'), [`${family}:wght@400;500;600;700`]);
      assert.equal(link.media, 'print');
      link.onload();
      assert.equal(link.media, 'all');
    }
  } finally {
    delete globalThis.document;
  }
});

test('font loading is SSR-safe', () => {
  assert.doesNotThrow(() => {
    loadSharedFonts();
    loadProfileFont('kanit');
  });
});

test('public profile and live theme sample subscribe to the selected font', async () => {
  const profile = await readFile(new URL('../src/pages/public-profile.tsx', import.meta.url), 'utf8');
  const sample = await readFile(new URL('../src/components/customize/premium-visual-section.tsx', import.meta.url), 'utf8');
  assert.match(profile, /useProfileFont\(profile\?\.premiumFont\)/);
  assert.match(sample, /useProfileFont\(style\.font\)/);
});

test('production bundle contains no remote CSS import or Inter request', async () => {
  const css = await readFile(new URL('../dist/public/assets/app.css', import.meta.url), 'utf8');
  const html = await readFile(new URL('../dist/public/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /@import[^;]*fonts\.googleapis/);
  assert.doesNotMatch(html, /family=Inter/);
  assert.match(html, /id="gbloc-shared-fonts"[^>]*media="print"/);
});
