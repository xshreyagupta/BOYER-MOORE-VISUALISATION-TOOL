import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { getPseudocodePlaceholder } from "../../src/practice/pseudocodePlaceholders.js";
import { ALGORITHMS } from "../../src/engine/index.js";

describe("getPseudocodePlaceholder", () => {
  test("returns a non-empty string for every algorithm", () => {
    for (const algorithm of Object.values(ALGORITHMS)) {
      const placeholder = getPseudocodePlaceholder(algorithm);
      assert.equal(typeof placeholder, "string");
      assert.ok(placeholder.length > 0);
    }
  });

  test("each algorithm gets distinct scaffolding", () => {
    const all = Object.values(ALGORITHMS).map(getPseudocodePlaceholder);
    assert.equal(new Set(all).size, all.length);
  });

  test("placeholders are comments only -- no runnable pseudocode statements", () => {
    // Phase 8 is foundation-only: no pseudocode language exists yet, so
    // starters must not look like solutions or even valid syntax, just
    // guidance. Every non-blank line should be a comment.
    for (const algorithm of Object.values(ALGORITHMS)) {
      const lines = getPseudocodePlaceholder(algorithm).split("\n").filter((l) => l.trim().length > 0);
      for (const l of lines) {
        assert.ok(l.trim().startsWith("//"), `expected a comment line, got: "${l}"`);
      }
    }
  });

  test("falls back to a generic placeholder for an unknown algorithm", () => {
    assert.equal(getPseudocodePlaceholder("not-a-real-algorithm"), "// Write your pseudocode here.\n");
  });
});
