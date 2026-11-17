import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { resolveLinkUrl } from "../src/routes/profiles";

const handleDestinations: Record<string, string> = {
  instagram: "https://www.instagram.com/creator",
  facebook: "https://www.facebook.com/creator",
  tiktok: "https://www.tiktok.com/@creator",
  threads: "https://www.threads.net/@creator",
  x: "https://x.com/creator",
  pinterest: "https://www.pinterest.com/creator",
  snapchat: "https://www.snapchat.com/add/creator",
  reddit: "https://www.reddit.com/user/creator",
  bluesky: "https://bsky.app/profile/creator",
  vk: "https://vk.com/creator",
  telegram: "https://t.me/creator",
  messenger: "https://m.me/creator",
  youtube: "https://www.youtube.com/@creator",
  vimeo: "https://vimeo.com/creator",
  twitch: "https://www.twitch.tv/creator",
  kick: "https://kick.com/creator",
  soundcloud: "https://soundcloud.com/creator",
  patreon: "https://www.patreon.com/creator",
  kofi: "https://ko-fi.com/creator",
  buymeacoffee: "https://buymeacoffee.com/creator",
  onlyfans: "https://onlyfans.com/creator",
  medium: "https://medium.com/@creator",
  behance: "https://www.behance.net/creator",
  dribbble: "https://dribbble.com/creator",
  artstation: "https://www.artstation.com/creator",
  deviantart: "https://www.deviantart.com/creator",
  linktree: "https://linktr.ee/creator",
  discord: "https://discord.gg/creator",
  github: "https://github.com/creator",
  gitlab: "https://gitlab.com/creator",
  codepen: "https://codepen.io/creator",
  devto: "https://dev.to/creator",
  spotify: "https://open.spotify.com/user/creator",
};

const fullUrlPlatforms = [
  "linkedin", "mastodon", "line", "wechat", "xiaohongshu", "applemusic",
  "bandcamp", "flickr", "substack", "gumroad", "stackoverflow", "steam",
  "roblox", "itchio",
];

const expectedPlatforms = [
  ...Object.keys(handleDestinations),
  ...fullUrlPlatforms,
  "whatsapp", "tumblr", "website", "custom",
].sort();

test("all 51 platform choices have a valid URL handling rule", () => {
  assert.equal(expectedPlatforms.length, 51);
  assert.equal(new Set(expectedPlatforms).size, 51);

  for (const [platform, expectedUrl] of Object.entries(handleDestinations)) {
    assert.equal(resolveLinkUrl(platform, "url", "@creator"), expectedUrl, platform);
  }

  for (const platform of fullUrlPlatforms) {
    const url = `https://profiles.example/${platform}/creator`;
    assert.equal(resolveLinkUrl(platform, "url", url), url, platform);
    assert.throws(() => resolveLinkUrl(platform, "url", "creator"), undefined, platform);
  }

  assert.equal(resolveLinkUrl("whatsapp", "url", "+66 81-234-5678"), "https://wa.me/66812345678");
  assert.equal(resolveLinkUrl("tumblr", "url", "my-blog"), "https://my-blog.tumblr.com");
  assert.equal(resolveLinkUrl("website", "url", "example.com"), "https://example.com/");
  assert.equal(resolveLinkUrl("custom", "url", "https://example.com/path"), "https://example.com/path");
});

test("platform picker entries have labels, icons, and URL resolver coverage", () => {
  const gblocRoot = resolve(process.cwd(), "../gbloc/src");
  const shared = readFileSync(resolve(gblocRoot, "components/gbloc-shared.tsx"), "utf8");
  const publicProfile = readFileSync(resolve(gblocRoot, "pages/public-profile.tsx"), "utf8");

  const labelsBlock = shared.match(/export const platformLabels: Record<string, string> = \{([\s\S]*?)\n\};/)?.[1];
  assert.ok(labelsBlock, "platform label registry exists");
  const labeledPlatforms = [...labelsBlock.matchAll(/^\s{2}([A-Za-z0-9_]+):/gm)].map((match) => match[1]);

  const groupsBlock = shared.match(/export const platformGroups = \[([\s\S]*?)\n\];/)?.[1];
  assert.ok(groupsBlock, "platform groups exist");
  const pickerPlatforms = [...groupsBlock.matchAll(/platforms: \[([^\]]*)\]/g)]
    .flatMap((match) => [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]));

  const iconBlock = publicProfile.match(/const brandIcons: Record<string, IconType> = \{([\s\S]*?)\n\};/)?.[1];
  assert.ok(iconBlock, "profile icon registry exists");
  const iconPlatforms = [...iconBlock.matchAll(/^\s{2}([A-Za-z0-9_]+):/gm)].map((match) => match[1]);

  assert.deepEqual([...pickerPlatforms].sort(), expectedPlatforms);
  assert.equal(new Set(pickerPlatforms).size, 51, "picker has no duplicate options");
  for (const platform of pickerPlatforms) {
    assert.ok(labeledPlatforms.includes(platform), `${platform} has a display name`);
    if (platform !== "website" && platform !== "custom") {
      assert.ok(iconPlatforms.includes(platform), `${platform} has a brand icon`);
    }
  }
  assert.match(publicProfile, /platform === 'website'.*<Globe/);
  assert.match(publicProfile, /return <Link2/);
});

test("WhatsApp numbers and Tumblr names reject invalid formats", () => {
  assert.throws(() => resolveLinkUrl("whatsapp", "url", "12345"));
  assert.throws(() => resolveLinkUrl("whatsapp", "url", "call-me-66812345678"));
  assert.throws(() => resolveLinkUrl("whatsapp", "url", "+1234567890123456"));

  assert.throws(() => resolveLinkUrl("tumblr", "url", "name.example.com"));
  assert.throws(() => resolveLinkUrl("tumblr", "url", "-name"));
  assert.throws(() => resolveLinkUrl("tumblr", "url", "name-"));
  assert.throws(() => resolveLinkUrl("tumblr", "url", "a".repeat(64)));
});

test("copy-text links do not generate a destination URL", () => {
  assert.equal(resolveLinkUrl("facebook", "text", "contact me"), null);
});
