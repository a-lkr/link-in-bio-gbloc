import assert from "node:assert/strict";
import test from "node:test";
import {
  BASIC_PROFILE_PRO_DEFAULTS,
  canReplaceProfileLinkCount,
  EXPIRED_MEMBERSHIP_PROFILE_DEFAULTS,
  getExcessProfileLinkIds,
  getProfileLinkLimit,
} from "../src/lib/profileLinkQuota";

test("general accounts have two profile links and members have five", () => {
  assert.equal(getProfileLinkLimit(null), 2);
  assert.equal(getProfileLinkLimit(undefined), 2);
  assert.equal(getProfileLinkLimit("basic"), 5);
  assert.equal(getProfileLinkLimit("pro"), 5);
});

test("link updates cannot exceed the active plan limit", () => {
  assert.equal(canReplaceProfileLinkCount(2, 2, 2), true);
  assert.equal(canReplaceProfileLinkCount(3, 2, 2), false);
  assert.equal(canReplaceProfileLinkCount(5, 5, 5), true);
  assert.equal(canReplaceProfileLinkCount(6, 5, 5), false);
});

test("legacy over-limit links cannot be increased before they are reduced", () => {
  assert.equal(canReplaceProfileLinkCount(5, 5, 2), true);
  assert.equal(canReplaceProfileLinkCount(3, 5, 2), true);
  assert.equal(canReplaceProfileLinkCount(6, 5, 2), false);
});

test("expiration keeps the first links in display order and removes excess links", () => {
  assert.deepEqual(
    getExcessProfileLinkIds(
      [{ id: "one" }, { id: "two" }, { id: "three" }, { id: "four" }],
      2,
    ),
    ["three", "four"],
  );
  assert.deepEqual(getExcessProfileLinkIds([{ id: "one" }], 2), []);
});

test("expiration resets premium fields to their normal profile defaults", () => {
  assert.deepEqual(EXPIRED_MEMBERSHIP_PROFILE_DEFAULTS, {
    premiumBackground: "none",
    premiumBackgroundStrength: 55,
    premiumFont: "default",
    premiumTextEffect: "none",
    showProBadge: false,
    showCredit: true,
    extraAudioTracks: [],
  });
  assert.deepEqual(BASIC_PROFILE_PRO_DEFAULTS, {
    showProBadge: false,
    extraAudioTracks: [],
  });
});
