import assert from "node:assert/strict";
import test from "node:test";
import { CRAVING_LINES, ENDING_JOKES, MARK_TILT, TOKENS, TOKEN_TRAITS, tokenCopy } from "../lib/render/tokens.ts";
import { communityDietLine } from "../lib/community/diet.ts";

/**
 * The token pass is presentation and copy only: the rules keep their labels
 * and the screen translates them. These pin the translation and the stub the
 * chain layer will fill, so neither drifts quietly.
 */

test("rule labels translate to token copy, and the rest passes through", () => {
  assert.equal(tokenCopy("MAGNET MOUTH ×2"), "HODL JAWS ×2");
  assert.equal(tokenCopy("BALLOON BELLY ×1"), "GAS BELLY ×1");
  assert.equal(tokenCopy("FIRE BREATH ×3"), "TURBO BREATH ×3");
  assert.equal(tokenCopy("OFF THE BELLY ×2"), "OFF THE GAS BELLY ×2");
  assert.equal(tokenCopy("UTENSIL +500"), "COLD STORAGE +500");
  assert.equal(tokenCopy("OFF THE PAN ×2"), "OFF THE PAN ×2");
  assert.equal(tokenCopy("DOUBLE BANK ×3"), "DOUBLE BANK ×3");
  assert.equal(tokenCopy("SINGED"), "SINGED");
});

test("every ingredient has a token, a trait, a craving line and a sane mark fraction", () => {
  for (const key of ["metal", "balloon", "pepper"]) {
    const spec = TOKENS[key];
    assert.ok(spec.sources.length >= 1, `${key}: a source`);
    assert.ok(spec.markFraction > 0.5 && spec.markFraction <= 1, `${key}: the mark fills the plate without leaving it`);
    assert.ok(TOKEN_TRAITS[key].length > 0);
    assert.match(CRAVING_LINES[key], /^IT WANTS (BTC|ETH|HEMI)\.$/);
  }
  assert.equal(TOKENS.metal.id, "BTC");
  assert.equal(TOKENS.balloon.id, "ETH");
  assert.equal(TOKENS.pepper.id, "HEMI");
  assert.equal(ENDING_JOKES.length, 4, "one joke per ending");
  assert.ok(Math.abs(MARK_TILT - Math.PI / 12) < 1e-9, "a mark turns by at most 15 degrees");
});

test("the community diet line names the largest share, and says nothing for no data", () => {
  assert.equal(communityDietLine(null), null);
  assert.equal(communityDietLine({ btc: 0, eth: 0, hemi: 0, window: "this week" }), null);
  assert.equal(communityDietLine({ btc: 0.61, eth: 0.25, hemi: 0.14, window: "this week" }), "The community fed it 61% BTC this week.");
  assert.equal(communityDietLine({ btc: 10, eth: 20, hemi: 70, window: "today" }), "The community fed it 70% HEMI today.");
  assert.equal(communityDietLine({ btc: 1, eth: 3, hemi: 0, window: "this week" }), "The community fed it 75% ETH this week.");
});
