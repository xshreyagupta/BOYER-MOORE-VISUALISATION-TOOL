import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { run, ALGORITHMS } from "../../src/engine/index.js";
import { executeSource } from "../../src/pseudocode/interpreter.js";
import { findFirstDivergence } from "../../src/pseudocode/firstDivergence.js";
import { getStarterTemplate } from "../../src/practice/starterTemplates.js";
import { validate } from "../../src/pseudocode/validate.js";

// PHASE 14 -- regression coverage for firstDivergence.js. This module had
// no dedicated test file despite being the core of the Phase 13 "FIRST
// ERROR" feature, so these tests lock in the two behaviors the Phase 14
// audit spec calls out explicitly:
//
//   (7) a CORRECT student implementation must never produce a false
//       positive divergence, and
//   (6) an intentionally INCORRECT implementation must be caught, with a
//       correct student source line / actual / expected value.
//
// Plus the runtime-error / invalid-pseudocode edge cases from items 1 & 3.

describe("findFirstDivergence: correct student implementations (no false positives)", () => {
  for (const algorithm of [ALGORITHMS.BAD_CHARACTER, ALGORITHMS.GOOD_SUFFIX, ALGORITHMS.FULL]) {
    test(`${algorithm} starter template never diverges from the reference`, () => {
      const text = algorithm === ALGORITHMS.FULL ? "ABCXABCDABXABCDABCDABDE" : "ABABABA";
      const pattern = algorithm === ALGORITHMS.FULL ? "ABCD" : "ABA";

      const code = getStarterTemplate(algorithm);
      assert.equal(validate(code).valid, true, "starter template must itself be valid pseudocode");

      const studentResult = executeSource(code, { text, pattern });
      assert.equal(studentResult.status, "completed");

      const referenceResult = run(algorithm, text, pattern);
      const divergence = findFirstDivergence(studentResult, referenceResult);

      assert.equal(divergence.diverged, false, divergence.message);
    });
  }
});

describe("findFirstDivergence: catches a genuinely incorrect implementation", () => {
  test("an off-by-one bad-character shift bug is reported with real line/actual/expected values", () => {
    const text = "ABABABA";
    const pattern = "ABA";

    const buggyCode = getStarterTemplate(ALGORITHMS.BAD_CHARACTER).replace(
      "badCharacterShift ← MAX(1, m - lastOccurrence)",
      "badCharacterShift ← MAX(1, m - lastOccurrence) + 1"
    );

    const studentResult = executeSource(buggyCode, { text, pattern });
    assert.equal(studentResult.status, "completed");

    const referenceResult = run(ALGORITHMS.BAD_CHARACTER, text, pattern);
    const divergence = findFirstDivergence(studentResult, referenceResult);

    assert.equal(divergence.diverged, true);
    assert.equal(typeof divergence.studentStep, "number");
    assert.equal(typeof divergence.line, "number");
    assert.notEqual(divergence.studentValue, divergence.expectedValue);
    assert.ok(divergence.message.length > 0);
    assert.ok(divergence.studentMessage.length > 0);
  });
});

describe("findFirstDivergence: runtime failures never invent an algorithmic divergence", () => {
  test("a runtime error before any trace state is recorded reports haltedByRuntimeError, not a fabricated divergence", () => {
    const studentResult = executeSource("x ← 1 / 0", { text: "AB", pattern: "A" });
    assert.equal(studentResult.status, "runtime-error");
    assert.equal(studentResult.trace.length, 0);

    const referenceResult = run(ALGORITHMS.FULL, "AB", "A");
    const divergence = findFirstDivergence(studentResult, referenceResult);

    assert.equal(divergence.diverged, false);
    assert.equal(divergence.haltedByRuntimeError, true);
  });

  test("a runtime error after some real progress reports haltedByRuntimeError rather than a false divergence past the failure point", () => {
    const text = "ABABABA";
    const pattern = "ABA";

    // Valid pseudocode that runs correctly for a while, then divides by
    // zero -- exercising the "student trace has some real checkpoints,
    // then execution genuinely stops" path (not the zero-checkpoint path
    // covered above).
    const code = `s ← 0
j ← m - 1
WHILE j ≥ 0 AND pattern[j] = text[s + j] DO
  j ← j - 1
END WHILE
bad ← 1 / 0
`;
    const studentResult = executeSource(code, { text, pattern });
    assert.equal(studentResult.status, "runtime-error");

    const referenceResult = run(ALGORITHMS.BAD_CHARACTER, text, pattern);
    const divergence = findFirstDivergence(studentResult, referenceResult);

    // Whatever comparisons the student's trace DID make before failing
    // must agree with the reference (this code is a correct fragment of
    // the real matching loop), so no divergence should be found among
    // them -- only the halt itself should be reported.
    assert.equal(divergence.diverged, false);
    assert.equal(divergence.haltedByRuntimeError, true);
  });
});

describe("findFirstDivergence: empty or no-op pseudocode is never reported as correct", () => {
  const text = "ABABABA";
  const pattern = "ABA";

  for (const [label, code] of Object.entries({
    "empty string": "",
    "whitespace only": "   \n  \n",
    "comment only": "// just a comment",
  })) {
    test(`${label} diverges from the reference instead of showing no error`, () => {
      const studentResult = executeSource(code, { text, pattern });
      assert.equal(studentResult.status, "completed");
      assert.equal(studentResult.trace.length, 0);

      const referenceResult = run(ALGORITHMS.FULL, text, pattern);
      const divergence = findFirstDivergence(studentResult, referenceResult);

      // Must NOT be reported as "correct" -- the reference algorithm does
      // real work on this input and the student's program did nothing.
      assert.equal(divergence.diverged, true);
      assert.equal(divergence.haltedByRuntimeError, undefined);
    });
  }

  test("a loop whose body never executes also diverges rather than showing no error", () => {
    const code = "s ← 999\nWHILE s ≤ n - m DO\n  s ← s + 1\nEND WHILE";
    const studentResult = executeSource(code, { text, pattern });
    assert.equal(studentResult.status, "completed");

    const referenceResult = run(ALGORITHMS.FULL, text, pattern);
    const divergence = findFirstDivergence(studentResult, referenceResult);

    assert.equal(divergence.diverged, true);
  });
});

describe("findFirstDivergence: invalid pseudocode never reaches comparison", () => {
  test("returns NO_DIVERGENCE (never haltedByRuntimeError) for an invalid-status student result", () => {
    const referenceResult = run(ALGORITHMS.FULL, "AB", "A");
    const divergence = findFirstDivergence({ status: "invalid", trace: [] }, referenceResult);

    assert.equal(divergence.diverged, false);
    assert.equal(divergence.haltedByRuntimeError, undefined);
  });

  test("returns NO_DIVERGENCE when either argument is missing", () => {
    assert.equal(findFirstDivergence(null, {}).diverged, false);
    assert.equal(findFirstDivergence({}, null).diverged, false);
  });
});
