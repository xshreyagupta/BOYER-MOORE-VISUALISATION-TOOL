// PHASE 1 -- Trusted reference algorithm execution trace.
//
// Separate from src/pseudocode/executionTrace.js.
//
// This file:
// trace-building primitives for the trusted REFERENCE Boyer-Moore
// implementations (src/algorithms/badCharacter.js, goodSuffix.js,
// boyerMoore.js). Every state these algorithms emit passes through
// createTraceBuilder().push(), and every run() call is wrapped in
// validateInput()/buildResult() so invalid input (currently: an empty
// pattern) is reported as a normal result with `error` set rather than
// thrown.
//
// src/pseudocode/executionTrace.js is the unrelated, PHASE 11+ module that
// reduces STUDENT pseudocode interpreter states.

/**
 * Every phase a reference-algorithm state can be in. Kept as an object of
 * plain string constants (not a JS enum) so states remain plain,
 * JSON-serializable data.
 */
export const PHASES = Object.freeze({
  START: "start",
  COMPARE: "compare",
  MISMATCH: "mismatch",
  FOUND: "found",
  DONE: "done",
});

/**
 * Which heuristic produced the larger (chosen) shift at a Full Boyer-Moore
 * mismatch. Only meaningful for runBoyerMoore -- the single-heuristic modes
 * never set `winner`.
 */
export const WINNERS = Object.freeze({
  BAD_CHARACTER: "bad-character",
  GOOD_SUFFIX: "good-suffix",
  EQUAL: "equal",
});

/**
 * The full set of fields every emitted state carries, defaulted to `null`
 * so `field in state` is always true even when a particular phase has
 * nothing to say about that field (see tests/algorithms.test.js's
 * "every state has the full required field set").
 */
const STATE_FIELD_DEFAULTS = Object.freeze({
  phase: null,
  alignment: null,
  i: null,
  j: null,
  textChar: null,
  patternChar: null,
  comparisonResult: null,
  badCharacterShift: null,
  goodSuffixShift: null,
  chosenShift: null,
  winner: null,
  matchIndex: null,
  pseudocodeLine: null,
  explanation: null,
  variables: null,
});

/**
 * Builds an incrementing-step trace of plain state objects, plus the
 * running `stats` counters the three reference algorithms increment as
 * they go (trace.stats.alignments++, etc.). Each pushed state gets its
 * own snapshot of `stats` at the moment it was pushed -- stats is a
 * shallow copy per push, not a shared live reference, so an earlier
 * state's `stats` never silently changes because of a later increment.
 */
export function createTraceBuilder() {
  const states = [];
  const stats = {
    comparisons: 0,
    mismatches: 0,
    matches: 0,
    alignments: 0,
    shifts: 0,
  };
  let step = 0;

  function push(partial) {
    const state = {
      step: step++,
      ...STATE_FIELD_DEFAULTS,
      ...partial,
      stats: { ...stats },
    };

    states.push(state);

    return state;
  }

  return {
    push,
    stats,
    getStates: () => states,
  };
}

/**
 * Validates (text, pattern) before any reference algorithm runs. The only
 * currently-invalid input is an empty pattern -- an empty text is fine (it
 * simply produces zero matches), and a pattern longer than the text is
 * fine too (the main loop's `s <= n - m` condition just never runs).
 *
 * @param {string} text
 * @param {string} pattern
 * @returns {{ valid: boolean, error: null | { type: string, message: string } }}
 */
export function validateInput(text, pattern) {
  if (typeof pattern !== "string" || pattern.length === 0) {
    return {
      valid: false,
      error: {
        type: "invalid-pattern",
        message: "Pattern must not be empty.",
      },
    };
  }

  if (typeof text !== "string") {
    return {
      valid: false,
      error: {
        type: "invalid-text",
        message: "Text must be a string.",
      },
    };
  }

  return { valid: true, error: null };
}

/**
 * Assembles the final run() result every reference algorithm returns,
 * whether it ran to completion or was rejected by validateInput(). On the
 * invalid-input path, callers pass only { algorithm, text, pattern, error }
 * and get back states/matches as empty arrays and preprocessing as null --
 * never a thrown exception (see tests/algorithms.test.js's
 * "empty pattern is rejected as invalid input (not a crash)").
 *
 * @param {object} args
 * @returns {object}
 */
export function buildResult({
  algorithm,
  text,
  pattern,
  error = null,
  states = [],
  stats = null,
  matches = [],
  preprocessing = null,
}) {
  return {
    algorithm,
    text,
    pattern,
    error,
    states,
    stats,
    matches,
    preprocessing,
  };
}
 
 