// COUNTEREXAMPLE GENERATOR
//
// Deterministic, bounded search for a (text, pattern) pair where the
// student's pseudocode disagrees with the reference engine.
//
// Strategy:
//   1. Re-run every existing predefined test case (visible + hidden) first.
//   2. If nothing fails there, enumerate short strings over a small alphabet
//      in increasing (textLen, patternLen) order.
//   3. Compare student's actual execution results against the reference
//      engine using both final match positions AND findFirstDivergence for
//      richer diagnostics.
//   4. When a counterexample is found, attempt to minimise it by trying
//      shorter prefixes that still fail.
//   5. Hard budget: MAX_TOTAL_CASES total attempts, SEARCH_TIME_MS wall-
//      clock cutoff. Neither is unbounded.
//
// IMPORTANT:
//   The reference engine is ONLY used to produce an expected-result oracle.
//   It NEVER substitutes for the student's pseudocode.

import { executeSource } from "../pseudocode/interpreter.js";
import { findFirstDivergence } from "../pseudocode/firstDivergence.js";
import { run as runReference, ALGORITHMS } from "../engine/index.js";
import { getTestCases } from "./testCases.js";

// ──────────────────────────────────────────────────────────────────
// Budget constants (all configurable via options)
// ──────────────────────────────────────────────────────────────────

const DEFAULT_MAX_TOTAL_CASES = 300;
const DEFAULT_SEARCH_TIME_MS = 4000;
// Per-execution step limit: keep it low so a broken student loop does not
// hang the generator even momentarily.
const DEFAULT_MAX_STEPS_PER_EXEC = 3000;

// Alphabet for generated strings.  Deliberately small so the enumeration
// covers interesting cases quickly.
const ALPHABET = ["A", "B", "C"];

// ──────────────────────────────────────────────────────────────────
// String generation helpers
// ──────────────────────────────────────────────────────────────────

/**
 * Returns the n-th string over ALPHABET in lexicographic order of
 * increasing length (0 → "A", 1 → "B", 2 → "C",
 * 3 → "AA", 4 → "AB", …).
 *
 * This gives a deterministic, reproducible enumeration.
 */
function nthString(n) {
  const base = ALPHABET.length;
  // figure out the length: there are base^len strings of each length.
  let len = 1;
  let count = base;
  let offset = 0;
  while (n >= offset + count) {
    offset += count;
    len++;
    count = Math.pow(base, len);
  }
  const idx = n - offset;
  let result = "";
  let rem = idx;
  for (let i = 0; i < len; i++) {
    result = ALPHABET[rem % base] + result;
    rem = Math.floor(rem / base);
  }
  return result;
}

/**
 * Generates (text, pattern) pairs in order of increasing total length,
 * then increasing patternLen.  Skips pairs where pattern is longer than
 * text (those always produce "No match" for any correct algorithm and are
 * not useful counterexamples for search mismatches, though we do include
 * patternLen === textLen).
 *
 * Returns up to `limit` pairs.
 */
function* generateCandidates(limit) {
  let yielded = 0;
  // Enumerate total pair lengths 2, 3, 4, …
  for (let total = 2; yielded < limit; total++) {
    for (let patLen = 1; patLen <= total - 1 && yielded < limit; patLen++) {
      const txtLen = total - patLen;
      // How many distinct strings of each length?
      const txtCount = Math.pow(ALPHABET.length, txtLen);
      const patCount = Math.pow(ALPHABET.length, patLen);
      for (let ti = 0; ti < txtCount && yielded < limit; ti++) {
        const text = nthString(
          // offset to the first n-character string
          (Math.pow(ALPHABET.length, txtLen) - 1) / (ALPHABET.length - 1) - 1 + ti
        );
        for (let pi = 0; pi < patCount && yielded < limit; pi++) {
          const pattern = nthString(
            (Math.pow(ALPHABET.length, patLen) - 1) / (ALPHABET.length - 1) - 1 + pi
          );
          yield { text, pattern };
          yielded++;
        }
      }
    }
  }
}

// ──────────────────────────────────────────────────────────────────
// Execute student pseudocode safely
// ──────────────────────────────────────────────────────────────────

function safeExecuteStudent(source, text, pattern, maxSteps) {
  try {
    return executeSource(
      source,
      { text, pattern },
      { maxSteps, maxLoopIterations: maxSteps }
    );
  } catch (err) {
    return {
      status: "runtime-error",
      result: null,
      trace: [],
      finalVariables: {},
      steps: 0,
      runtimeWarnings: [],
      error: {
        type: "unexpected-js-error",
        message: String(err?.message ?? err),
        studentMessage:
          "An unexpected error occurred while running your pseudocode.",
        line: null,
        column: null,
      },
    };
  }
}

// ──────────────────────────────────────────────────────────────────
// Match-position extraction helpers
// ──────────────────────────────────────────────────────────────────

/**
 * Extracts the list of match positions reported by the student's
 * finalVariables / trace.  We look for any variable whose name suggests
 * it is a matches/results array (common naming conventions).
 */
function extractStudentMatches(execResult) {
  if (!execResult || execResult.status === "invalid") return null;

  const vars = execResult.finalVariables ?? {};

  // Try common variable names in order of confidence.
  const candidateNames = ["matches", "results", "found", "matchPositions", "output"];
  for (const name of candidateNames) {
    const val = vars[name];
    if (Array.isArray(val)) {
      return val.map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
    }
    // RuntimeArray wrapper (has .values or .toArray)
    if (val && typeof val === "object") {
      if (typeof val.toArray === "function") {
        return val.toArray().map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
      }
      if (Array.isArray(val.values)) {
        return val.values.map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
      }
    }
  }

  return null; // Could not extract
}

/**
 * Format matches the same way testCases.js does, so we can compare.
 */
function formatMatches(matches) {
  if (!matches || matches.length === 0) return "No match";
  return matches.join(" ");
}

// ──────────────────────────────────────────────────────────────────
// Check one (text, pattern) pair
// ──────────────────────────────────────────────────────────────────

/**
 * Returns a failure descriptor if the student's pseudocode disagrees with
 * the reference, or null if they agree on this pair.
 *
 * A "disagreement" is:
 *   - Execution failure (runtime-error / step-limit) when reference succeeds.
 *   - Different final match positions (when we can extract them).
 *   - A structural trace divergence reported by findFirstDivergence.
 */
function checkOnePair(source, algorithm, text, pattern, maxSteps) {
  // Run student pseudocode.
  const studentResult = safeExecuteStudent(source, text, pattern, maxSteps);

  // Run reference (oracle only, never shown as student output).
  const referenceResult = runReference(algorithm, text, pattern);

  // ── Execution failures ──────────────────────────────────────────
  if (
    studentResult.status === "runtime-error" ||
    studentResult.status === "step-limit"
  ) {
    const refMatches = referenceResult.matches ?? [];
    // Only report as counterexample if the reference would have actually done
    // something (non-trivial case).  Empty-text or pattern-longer-than-text
    // cases that immediately terminate in the reference are not interesting.
    if (
      text.length > 0 &&
      pattern.length > 0 &&
      pattern.length <= text.length
    ) {
      return {
        kind: "execution-failure",
        text,
        pattern,
        studentResult,
        referenceResult,
        referenceMatches: refMatches,
        divergence: null,
        description:
          studentResult.status === "step-limit"
            ? "Your pseudocode exceeded the execution step limit on this input."
            : "Your pseudocode produced a runtime error on this input.",
      };
    }
    return null;
  }

  if (studentResult.status === "invalid") {
    // Validation failure — the caller should not call us on invalid code, but
    // be defensive.
    return null;
  }

  // ── Match-position comparison ───────────────────────────────────
  const refMatches = referenceResult.matches ?? [];
  const stuMatches = extractStudentMatches(studentResult);

  if (stuMatches !== null) {
    const refSorted = [...refMatches].sort((a, b) => a - b);
    const stuSorted = [...stuMatches].sort((a, b) => a - b);

    const refStr = formatMatches(refSorted);
    const stuStr = formatMatches(stuSorted);

    if (refStr !== stuStr) {
      const divergence = findFirstDivergence(studentResult, referenceResult);
      return {
        kind: "wrong-matches",
        text,
        pattern,
        studentResult,
        referenceResult,
        referenceMatches: refMatches,
        studentMatches: stuMatches,
        expectedOutput: refStr,
        actualOutput: stuStr,
        divergence: divergence?.diverged ? divergence : null,
        description: `Expected matches at [${refStr}], but your pseudocode produced [${stuStr}].`,
      };
    }
  }

  // ── Structural trace divergence ─────────────────────────────────
  // Even if we couldn't extract match positions (no "matches" variable),
  // the trace divergence analysis can catch incorrect intermediate values.
  const divergence = findFirstDivergence(studentResult, referenceResult);
  if (divergence?.diverged) {
    return {
      kind: "trace-divergence",
      text,
      pattern,
      studentResult,
      referenceResult,
      referenceMatches: refMatches,
      divergence,
      description:
        divergence.studentMessage ??
        divergence.message ??
        "A behavioral divergence was detected.",
    };
  }

  return null; // Passed
}

// ──────────────────────────────────────────────────────────────────
// Minimiser
// ──────────────────────────────────────────────────────────────────

/**
 * Given a known-failing (text, pattern) pair, try shorter prefixes to find
 * the smallest failing example that preserves the same failure kind.
 *
 * Only tries prefix-based minimisation (keeps the search bounded).
 */
function tryMinimise(source, algorithm, failingExample, maxSteps) {
  const { text, pattern, kind } = failingExample;

  let best = failingExample;

  // Try all (text prefix, pattern prefix) pairs strictly shorter than current.
  for (let tLen = 1; tLen <= text.length; tLen++) {
    for (let pLen = 1; pLen <= pattern.length; pLen++) {
      if (tLen === text.length && pLen === pattern.length) continue; // skip identical
      if (pLen > tLen) continue; // skip trivially-fails-before-start

      const shortText = text.slice(0, tLen);
      const shortPattern = pattern.slice(0, pLen);

      const result = checkOnePair(source, algorithm, shortText, shortPattern, maxSteps);
      if (result && result.kind === kind) {
        best = result;
        // keep going — try to find even shorter
      }
    }
  }

  return best;
}

// ──────────────────────────────────────────────────────────────────
// PUBLIC ENTRY POINT
// ──────────────────────────────────────────────────────────────────

/**
 * Searches for a counterexample for the student's pseudocode against the
 * reference implementation for `algorithm`.
 *
 * @param {string} source        - Student pseudocode source (must be valid).
 * @param {string} algorithm     - One of ALGORITHMS.BAD_CHARACTER / GOOD_SUFFIX / FULL.
 * @param {object} [options]
 * @param {number} [options.maxTotalCases]   - Total pairs to check (default 300).
 * @param {number} [options.searchTimeMs]    - Wall-clock budget (default 4000).
 * @param {number} [options.maxStepsPerExec] - Per-execution step limit (default 3000).
 * @param {boolean} [options.minimise]       - Whether to minimise (default true).
 *
 * @returns {{
 *   found: boolean,
 *   counterexample: object | null,
 *   casesChecked: number,
 *   timedOut: boolean,
 *   phases: string[],
 * }}
 */
export function findCounterexample(source, algorithm, options = {}) {
  const maxTotalCases = options.maxTotalCases ?? DEFAULT_MAX_TOTAL_CASES;
  const searchTimeMs = options.searchTimeMs ?? DEFAULT_SEARCH_TIME_MS;
  const maxStepsPerExec = options.maxStepsPerExec ?? DEFAULT_MAX_STEPS_PER_EXEC;
  const shouldMinimise = options.minimise ?? true;

  const deadline = Date.now() + searchTimeMs;
  let casesChecked = 0;
  let timedOut = false;
  const phases = [];

  // ── Phase 1: predefined test cases (visible + hidden) ──────────
  phases.push("predefined");
  const predefined = getTestCases(algorithm);
  for (const tc of predefined) {
    if (Date.now() >= deadline) { timedOut = true; break; }
    if (casesChecked >= maxTotalCases) break;

    casesChecked++;
    const failure = checkOnePair(source, algorithm, tc.text, tc.pattern, maxStepsPerExec);
    if (failure) {
      const minimised = shouldMinimise
        ? tryMinimise(source, algorithm, failure, maxStepsPerExec)
        : failure;
      return {
        found: true,
        counterexample: minimised,
        casesChecked,
        timedOut: false,
        phases,
        testCaseId: tc.id,
        testCaseName: tc.name,
      };
    }
  }

  // ── Phase 2: enumerated cases ───────────────────────────────────
  phases.push("generated");
  const remaining = maxTotalCases - casesChecked;
  const gen = generateCandidates(remaining);

  for (const { text, pattern } of gen) {
    if (Date.now() >= deadline) { timedOut = true; break; }
    if (casesChecked >= maxTotalCases) break;

    casesChecked++;
    const failure = checkOnePair(source, algorithm, text, pattern, maxStepsPerExec);
    if (failure) {
      const minimised = shouldMinimise
        ? tryMinimise(source, algorithm, failure, maxStepsPerExec)
        : failure;
      return {
        found: true,
        counterexample: minimised,
        casesChecked,
        timedOut: false,
        phases,
      };
    }
  }

  return {
    found: false,
    counterexample: null,
    casesChecked,
    timedOut,
    phases,
  };
}

export { ALGORITHMS };
