// PHASE 8 -- Test case architecture.
//
// Expected outputs are DERIVED from the existing engine (src/engine/index.js
// -- the same code Phases 1-7 already trust and test), not hand-typed. This
// means a test case can never silently drift from what the real algorithm
// actually does, and adding a new case is just adding a (text, pattern).
//
// Every algorithm (Bad Character / Good Suffix / Full Boyer-Moore) reports
// the same match positions for correct input -- they only differ in *how*
// they get there -- so one shared case list works for all three, matching
// the single OUTPUT CONTRACT students are shown regardless of which
// algorithm they're implementing.

import { run, ALGORITHMS } from "../engine/index.js";

export const CATEGORIES = Object.freeze({
  BASIC: "Basic",
  EDGE_CASE: "Edge Cases",
  MULTIPLE_MATCHES: "Multiple Matches",
  OVERLAPPING_MATCHES: "Overlapping Matches",
  REPEATED_CHARACTERS: "Repeated Characters",
  ADVERSARIAL: "Adversarial",
  PERFORMANCE: "Performance",
});

// { id, name, text, pattern, category, difficulty, visible }
// `expected` is NOT stored here -- it is computed by getExpectedOutput()
// below from the real engine, per algorithm, so BAD_CHARACTER/GOOD_SUFFIX/
// FULL each get the correct expected string for the SAME underlying case.
const RAW_CASES = [
  {
    id: "basic-match",
    name: "Basic Match",
    text: "ABCDE",
    pattern: "ABC",
    category: CATEGORIES.BASIC,
    difficulty: "easy",
    visible: true,
  },
  {
    id: "match-at-end",
    name: "Match at End",
    text: "XYZABC",
    pattern: "ABC",
    category: CATEGORIES.BASIC,
    difficulty: "easy",
    visible: true,
  },
  {
    id: "pattern-absent",
    name: "Pattern Absent",
    text: "ABCDEFG",
    pattern: "XYZ",
    category: CATEGORIES.EDGE_CASE,
    difficulty: "easy",
    visible: true,
  },
  {
    id: "multiple-matches",
    name: "Multiple Matches",
    text: "ABCABCABC",
    pattern: "ABC",
    category: CATEGORIES.MULTIPLE_MATCHES,
    difficulty: "medium",
    visible: true,
  },
  {
    id: "repeated-characters",
    name: "Repeated Characters",
    text: "AAAAAAAAAA",
    pattern: "AAA",
    category: CATEGORIES.REPEATED_CHARACTERS,
    difficulty: "medium",
    visible: true,
  },
  {
    id: "overlapping-matches",
    name: "Overlapping Matches",
    text: "ABABABA",
    pattern: "ABA",
    category: CATEGORIES.OVERLAPPING_MATCHES,
    difficulty: "medium",
    visible: true,
  },
  {
    id: "single-character",
    name: "Single Character Pattern",
    text: "ABACADAE",
    pattern: "A",
    category: CATEGORIES.EDGE_CASE,
    difficulty: "easy",
    visible: true,
  },
  {
    id: "pattern-longer-than-text",
    name: "Pattern Longer Than Text",
    text: "ABC",
    pattern: "ABCDE",
    category: CATEGORIES.EDGE_CASE,
    difficulty: "easy",
    visible: true,
  },
  {
    id: "empty-text",
    name: "Empty Text",
    // Edge case built on the same input contract as everything else: an
    // empty text can never contain a non-empty pattern.
    text: "",
    pattern: "AB",
    category: CATEGORIES.EDGE_CASE,
    difficulty: "medium",
    visible: true,
  },
  {
    id: "adversarial-shift",
    name: "Adversarial Shift Case",
    // Designed to expose an incorrect shift calculation: a mismatch deep
    // into the pattern where the mismatched character DOES occur earlier in
    // the pattern (so a naive "shift past the mismatch" implementation
    // skips a real match), combined with a repeating suffix that only a
    // correct good-suffix/bad-character shift handles without skipping it.
    text: "GCATCGCAGAGAGTATACAGTACG",
    pattern: "GCAGAGAG",
    category: CATEGORIES.ADVERSARIAL,
    difficulty: "hard",
    visible: true,
  },
  {
    id: "adversarial-periodic",
    name: "Periodic Pattern",
    // A periodic pattern over a long repetitive text -- classic case where
    // an incorrect good-suffix table causes matches to be skipped entirely.
    text: "ABABABABABABABABABAB",
    pattern: "ABABAB",
    category: CATEGORIES.ADVERSARIAL,
    difficulty: "hard",
    visible: false,
  },
  {
    id: "performance-long-text",
    name: "Long Repetitive Text",
    text: "A".repeat(2000) + "B",
    pattern: "A".repeat(50) + "B",
    category: CATEGORIES.PERFORMANCE,
    difficulty: "hard",
    visible: false,
  },
];

function formatMatches(matches) {
  if (!matches || matches.length === 0) return "No match";
  return matches.join(" ");
}

/**
 * Computes the expected OUTPUT-CONTRACT string for a given case + algorithm
 * by actually running the existing, already-tested engine -- never a
 * hand-maintained literal.
 */
export function getExpectedOutput(testCase, algorithm) {
  const { matches, error } = run(algorithm, testCase.text, testCase.pattern);
  if (error) {
    throw new Error(`Test case "${testCase.id}" produced an engine validation error: ${error}`);
  }
  return formatMatches(matches);
}

/**
 * Returns the full case list for an algorithm, each annotated with the
 * expected output for THAT algorithm (all three algorithms currently agree,
 * since they all implement correct Boyer-Moore matching -- but this keeps
 * the door open for an algorithm-specific case set later).
 */
export function getTestCases(algorithm) {
  return RAW_CASES.map((raw) => ({
    ...raw,
    expected: getExpectedOutput(raw, algorithm),
  }));
}

export function getVisibleTestCases(algorithm) {
  return getTestCases(algorithm).filter((t) => t.visible);
}

export function getHiddenTestCases(algorithm) {
  return getTestCases(algorithm).filter((t) => !t.visible);
}

export function getTestCaseById(algorithm, id) {
  const found = getTestCases(algorithm).find((t) => t.id === id);
  if (!found) throw new Error(`Unknown test case id: "${id}"`);
  return found;
}

export { ALGORITHMS };
