import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { runBadCharacter } from "../src/algorithms/badCharacter.js";
import { runGoodSuffix } from "../src/algorithms/goodSuffix.js";
import { runBoyerMoore } from "../src/algorithms/boyerMoore.js";
import { naiveSearch } from "./naiveMatch.js";

const ALGORITHMS = [
  { name: "bad-character", run: runBadCharacter },
  { name: "good-suffix", run: runGoodSuffix },
  { name: "full", run: runBoyerMoore },
];

// ---------------------------------------------------------------------------
// Required test cases from the spec.
// ---------------------------------------------------------------------------
const CASES = [
  { label: "basic match", text: "ABCDE", pattern: "ABC" },
  { label: "match at beginning", text: "ABCXYZ", pattern: "ABC" },
  { label: "match at end", text: "XYZABC", pattern: "ABC" },
  { label: "no match", text: "ABCDEFG", pattern: "XYZ" },
  { label: "multiple matches", text: "ABCABCABC", pattern: "ABC" },
  { label: "repeated characters", text: "AAAAAAAAAA", pattern: "AAA" },
  { label: "pattern longer than text", text: "ABC", pattern: "ABCDE" },
  { label: "single character pattern", text: "ABACADAE", pattern: "A" },
  { label: "overlapping matches", text: "ABABABA", pattern: "ABA" },
  // Adversarial cases that expose common Bad Character / Good Suffix bugs.
  { label: "adversarial: pattern absent but shares suffix", text: "AAAAAAAAAB", pattern: "AAAB" },
  { label: "adversarial: good-suffix case-2 (prefix reoccurrence)", text: "CABABCABAB", pattern: "ABAB" },
  { label: "adversarial: bad-character worst case", text: "GCATCGCAGAGAGTATACAGTACG", pattern: "GCAGAGAG" },
  { label: "adversarial: all-but-one match", text: "XXXXXXXXXY", pattern: "XXXXXXXXXX" },
  { label: "single char text, single char pattern (match)", text: "A", pattern: "A" },
  { label: "single char text, single char pattern (no match)", text: "A", pattern: "B" },
  { label: "pattern equals text", text: "ABCDE", pattern: "ABCDE" },
  { label: "empty text", text: "", pattern: "ABC" },
];

for (const { name, run } of ALGORITHMS) {
  describe(`${name}: matches agree with brute-force search`, () => {
    for (const c of CASES) {
      test(c.label, () => {
        const expected = naiveSearch(c.text, c.pattern);
        const result = run(c.text, c.pattern);
        assert.equal(result.error, null, `unexpected validation error: ${result.error}`);
        assert.deepEqual(result.matches, expected);
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Empty pattern: invalid input, must be reported as an error, not thrown.
// ---------------------------------------------------------------------------
describe("empty pattern is rejected as invalid input (not a crash)", () => {
  for (const { name, run } of ALGORITHMS) {
    test(name, () => {
      const result = run("ABCDE", "");
      assert.notEqual(result.error, null);
      assert.deepEqual(result.matches, []);
      assert.deepEqual(result.states, []);
    });
  }
});

// ---------------------------------------------------------------------------
// Empty text + empty pattern together: still just an invalid-pattern error.
// ---------------------------------------------------------------------------
describe("empty text and empty pattern together", () => {
  for (const { name, run } of ALGORITHMS) {
    test(name, () => {
      const result = run("", "");
      assert.notEqual(result.error, null);
    });
  }
});

// ---------------------------------------------------------------------------
// Fuzz test: many random alphabets/lengths, cross-checked against the
// naive oracle. This is what actually stresses the Good Suffix and Bad
// Character preprocessing -- a subtly wrong shift table will eventually
// skip over or duplicate a match somewhere in here.
// ---------------------------------------------------------------------------
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function randomString(rand, alphabet, len) {
  let str = "";
  for (let i = 0; i < len; i++) {
    str += alphabet[Math.floor(rand() * alphabet.length)];
  }
  return str;
}

describe("fuzz: random text/pattern pairs across small alphabets", () => {
  const rand = seededRandom(42);
  const alphabets = ["AB", "ABC", "ABCD"];
  let caseCount = 0;

  for (const alphabet of alphabets) {
    for (let trial = 0; trial < 40; trial++) {
      const textLen = 1 + Math.floor(rand() * 30);
      const patternLen = 1 + Math.floor(rand() * 8);
      const text = randomString(rand, alphabet, textLen);
      const pattern = randomString(rand, alphabet, patternLen);
      caseCount++;

      for (const { name, run } of ALGORITHMS) {
        test(`fuzz#${caseCount} [${name}] alphabet="${alphabet}" text="${text}" pattern="${pattern}"`, () => {
          const expected = naiveSearch(text, pattern);
          const result = run(text, pattern);
          assert.equal(result.error, null);
          assert.deepEqual(result.matches, expected);
        });
      }
    }
  }
});

// ---------------------------------------------------------------------------
// Execution-trace structural invariants.
// ---------------------------------------------------------------------------
describe("execution trace structure", () => {
  for (const { name, run } of ALGORITHMS) {
    test(`${name}: trace has start and done states, monotonic steps`, () => {
      const result = run("ABCABCABC", "ABC");
      assert.ok(result.states.length >= 2);
      assert.equal(result.states[0].phase, "start");
      assert.equal(result.states[result.states.length - 1].phase, "done");
      result.states.forEach((s, idx) => assert.equal(s.step, idx));
    });

    test(`${name}: every state has the full required field set`, () => {
      const result = run("ABCXABCDABXABCDABCDABDE", "ABCD");
      const requiredFields = [
        "step",
        "phase",
        "alignment",
        "i",
        "j",
        "textChar",
        "patternChar",
        "comparisonResult",
        "badCharacterShift",
        "goodSuffixShift",
        "chosenShift",
        "winner",
        "matchIndex",
        "pseudocodeLine",
        "explanation",
        "variables",
        "stats",
      ];
      for (const state of result.states) {
        for (const field of requiredFields) {
          assert.ok(field in state, `missing field "${field}" on a ${name} state`);
        }
        const statFields = ["comparisons", "mismatches", "matches", "alignments", "shifts"];
        for (const f of statFields) {
          assert.ok(typeof state.stats[f] === "number", `stats.${f} should be numeric`);
        }
      }
    });

    test(`${name}: mismatch states always carry a positive chosenShift`, () => {
      const result = run("ABCXABCDABXABCDABCDABDE", "ABCD");
      for (const state of result.states) {
        if (state.phase === "mismatch") {
          assert.ok(state.chosenShift >= 1, "chosenShift must be at least 1 (progress guaranteed)");
        }
      }
    });

    test(`${name}: final stats.matches equals result.matches.length`, () => {
      const result = run("ABCABCABC", "ABC");
      const last = result.states[result.states.length - 1];
      assert.equal(last.stats.matches, result.matches.length);
    });
  }
});

// ---------------------------------------------------------------------------
// Full Boyer-Moore specific: winner must reflect the actual larger shift,
// and both scenarios (Bad Character winning, Good Suffix winning) must be
// reachable with real inputs -- never hardcoded.
// ---------------------------------------------------------------------------
describe("full Boyer-Moore: winner is derived from real shift values", () => {
  test("chosenShift always equals max(badCharacterShift, goodSuffixShift) at every mismatch", () => {
    const result = runBoyerMoore("GCATCGCAGAGAGTATACAGTACG", "GCAGAGAG");
    const mismatchStates = result.states.filter((s) => s.phase === "mismatch");
    assert.ok(mismatchStates.length > 0, "expected at least one mismatch in this fixture");
    for (const s of mismatchStates) {
      assert.equal(s.chosenShift, Math.max(s.badCharacterShift, s.goodSuffixShift));
      if (s.badCharacterShift > s.goodSuffixShift) assert.equal(s.winner, "bad-character");
      else if (s.goodSuffixShift > s.badCharacterShift) assert.equal(s.winner, "good-suffix");
      else assert.equal(s.winner, "equal");
    }
  });

  test("both bad-character and good-suffix wins occur across a range of fixtures", () => {
    const fixtures = [
      ["GCATCGCAGAGAGTATACAGTACG", "GCAGAGAG"],
      ["CABABCABAB", "ABAB"],
      ["AAAAAAAAAB", "AAAB"],
      ["ABCXABCDABXABCDABCDABDE", "ABCD"],
      ["XXXXXXXXXY", "XXXXXXXXXX"],
      ["ABABABABABABABABAB", "ABAB"],
    ];
    const seenWinners = new Set();
    for (const [text, pattern] of fixtures) {
      const result = runBoyerMoore(text, pattern);
      for (const s of result.states) {
        if (s.phase === "mismatch") seenWinners.add(s.winner);
      }
    }
    assert.ok(seenWinners.has("bad-character"), "expected at least one bad-character win across fixtures");
    assert.ok(seenWinners.has("good-suffix"), "expected at least one good-suffix win across fixtures");
  });
});

// ---------------------------------------------------------------------------
// Bad Character / Good Suffix preprocessing sanity checks.
// ---------------------------------------------------------------------------
describe("preprocessing tables", () => {
  test("last-occurrence table only records the rightmost index of each char", () => {
    const result = runBadCharacter("XXXXX", "ABCAB");
    assert.equal(result.preprocessing.lastOccurrenceTable.A, 3);
    assert.equal(result.preprocessing.lastOccurrenceTable.B, 4);
    assert.equal(result.preprocessing.lastOccurrenceTable.C, 2);
  });

  test("good-suffix shift table always allows forward progress (shift[i] >= 1 for i >= 1, shift[0] >= 1)", () => {
    const patterns = ["ABAB", "AAAA", "ABCD", "AABAABA", "GCAGAGAG"];
    for (const pattern of patterns) {
      const result = runGoodSuffix("Z".repeat(20), pattern);
      const table = result.preprocessing.shiftTable;
      for (const value of table) {
        assert.ok(value >= 1, `shift table for "${pattern}" contains a non-positive entry: ${table}`);
      }
    }
  });
});
