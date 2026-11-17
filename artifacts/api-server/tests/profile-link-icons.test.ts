import assert from "node:assert/strict";
import test from "node:test";
import {
  ReplaceMyProfileLinksBody,
  ReplaceMyProfileLinksResponse,
} from "@workspace/api-zod";

test("custom profile links accept a Simple Icon and a display name", () => {
  const parsed = ReplaceMyProfileLinksBody.parse({
    links: [{
      platform: "custom",
      mode: "url",
      value: "https://example.com/portfolio",
      label: "Portfolio",
      icon: "github",
    }],
  });

  assert.equal(parsed.links[0]?.label, "Portfolio");
  assert.equal(parsed.links[0]?.icon, "github");
});

test("links without a selected icon remain valid and serialize with no icon", () => {
  const input = ReplaceMyProfileLinksBody.parse({
    links: [{ platform: "custom", mode: "url", value: "https://example.com" }],
  });
  assert.equal(input.links[0]?.icon, undefined);

  const response = ReplaceMyProfileLinksResponse.parse([{
    id: "legacy-link",
    platform: "custom",
    mode: "url",
    value: "https://example.com",
    label: null,
    icon: null,
    resolvedUrl: "https://example.com/",
    sortOrder: 0,
  }]);
  assert.equal(response[0]?.icon, null);
});

test("custom links reject icon names outside the supported Simple Icons", () => {
  assert.throws(() => ReplaceMyProfileLinksBody.parse({
    links: [{
      platform: "custom",
      mode: "url",
      value: "https://example.com",
      icon: "not-a-supported-icon",
    }],
  }));
});
