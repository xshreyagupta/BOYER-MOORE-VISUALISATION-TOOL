import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { run, ALGORITHMS } from "../src/engine/index.js";
import { traceBadCharacter, traceGoodSuffix } from "../src/algorithms/preprocessingTrace.js";
import { getSearchPseudocode, getPreprocessingPseudocode, SEARCH_PSEUDOCODE, PREPROCESSING_PSEUDOCODE } from "../src/ui/data/pseudocode.js";

const TEXT = "ABCXABCDABXABCDABCDABDE";
const PATTERN = "ABCD";

describe("SEARCH_PSEUDOCODE", () => {
  for (const algorithm of Object.values(ALGORITHMS)) {
    test(`${algorithm}: has a block with a title, lines, and lineNotes`, () => {
      const block = getSearchPseudocode(algorithm);
      assert.ok(block, `expected a pseudocode block for "${algorithm}"`);
      assert.equal(typeof block.title, "string");
      assert.ok(block.lines.length > 0);
      assert.equal(typeof block.lineNotes, "object");
    });

    test(`${algorithm}: line numbers are sequential starting at 1, with no gaps or duplicates`, () => {
      const { lines } = getSearchPseudocode(algorithm);
      const numbers = lines.map((l) => l.line);
      assert.deepEqual(numbers, Array.from({ length: lines.length }, (_, i) => i + 1));
    });

    test(`${algorithm}: every line has a non-empty text and a note`, () => {
      const { lines, lineNotes } = getSearchPseudocode(algorithm);
      for (const l of lines) {
        assert.ok(l.text.length > 0, `line ${l.line} has no text`);
        assert.ok(lineNotes[l.line], `line ${l.line} has no lineNote`);
      }
    });

    test(`${algorithm}: every pseudocodeLine emitted by a real run of the algorithm exists in the pseudocode block`, () => {
      const result = run(algorithm, TEXT, PATTERN);
      const validLines = new Set(getSearchPseudocode(algorithm).lines.map((l) => l.line));
      const emitted = new Set(result.states.map((s) => s.pseudocodeLine).filter((n) => n !== null));
      assert.ok(emitted.size > 0, "expected at least one pseudocodeLine to be emitted");
      for (const n of emitted) {
        assert.ok(validLines.has(n), `pseudocodeLine ${n} emitted by ${algorithm} is not a real line in its pseudocode block`);
      }
    });
  }

  test("every algorithm's block is present in SEARCH_PSEUDOCODE and nothing extra", () => {
    assert.deepEqual(new Set(Object.keys(SEARCH_PSEUDOCODE)), new Set(Object.values(ALGORITHMS)));
  });
});

describe("PREPROCESSING_PSEUDOCODE", () => {
  const PREP_PATTERN = "GCAGAGAG";

  test("bad-character: line numbers are sequential starting at 1", () => {
    const { lines } = getPreprocessingPseudocode("bad-character");
    assert.deepEqual(lines.map((l) => l.line), Array.from({ length: lines.length }, (_, i) => i + 1));
  });

  test("good-suffix: line numbers are sequential starting at 1", () => {
    const { lines } = getPreprocessingPseudocode("good-suffix");
    assert.deepEqual(lines.map((l) => l.line), Array.from({ length: lines.length }, (_, i) => i + 1));
  });

  test("bad-character: every pseudocodeLine emitted by a real preprocessing trace exists in the block", () => {
    const trace = traceBadCharacter(PREP_PATTERN);
    const validLines = new Set(getPreprocessingPseudocode("bad-character").lines.map((l) => l.line));
    for (const step of trace.steps) {
      assert.ok(validLines.has(step.pseudocodeLine), `pseudocodeLine ${step.pseudocodeLine} not in bad-character preprocessing pseudocode`);
    }
  });

  test("good-suffix: every pseudocodeLine emitted by a real preprocessing trace exists in the block", () => {
    const trace = traceGoodSuffix(PREP_PATTERN);
    const validLines = new Set(getPreprocessingPseudocode("good-suffix").lines.map((l) => l.line));
    for (const step of trace.steps) {
      assert.ok(validLines.has(step.pseudocodeLine), `pseudocodeLine ${step.pseudocodeLine} not in good-suffix preprocessing pseudocode`);
    }
  });

  test("unknown preprocessing algorithm returns null", () => {
    assert.equal(getPreprocessingPseudocode("nonexistent"), null);
  });

  test("unknown search algorithm returns null", () => {
    assert.equal(getSearchPseudocode("nonexistent"), null);
  });

  test("both preprocessing algorithms are present", () => {
    assert.deepEqual(new Set(Object.keys(PREPROCESSING_PSEUDOCODE)), new Set(["bad-character", "good-suffix"]));
  });
});
