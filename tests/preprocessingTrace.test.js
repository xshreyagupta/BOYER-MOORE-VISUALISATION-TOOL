import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { buildLastOccurrenceTable, buildGoodSuffixTable } from "../src/algorithms/preprocessing.js";
import { traceBadCharacter, traceGoodSuffix, BC_STEP_TYPES, GS_STEP_TYPES } from "../src/algorithms/preprocessingTrace.js";
import { runBadCharacter } from "../src/algorithms/badCharacter.js";
import { runGoodSuffix } from "../src/algorithms/goodSuffix.js";
import { runBoyerMoore } from "../src/algorithms/boyerMoore.js";

const PATTERNS = [
  "ABCD",
  "AAAA",
  "ABAB",
  "ABAB CABAB".replace(" ", ""), // no-op, keep as plain string
  "GCAGAGAG",
  "AAAB",
  "A",
  "",
  "MISSISSIPPI",
  "XXXXXXXXXX",
];

// ---------------------------------------------------------------------------
// onStep is a pure observer: passing it must never change the computed
// table/shift/bpos versus calling the function with no options at all.
// ---------------------------------------------------------------------------
describe("instrumentation is observation-only (no change to computed values)", () => {
  for (const pattern of PATTERNS) {
    test(`buildLastOccurrenceTable("${pattern}") unaffected by onStep`, () => {
      const plain = buildLastOccurrenceTable(pattern);
      const events = [];
      const withStep = buildLastOccurrenceTable(pattern, { onStep: (e) => events.push(e) });
      assert.deepEqual(Object.fromEntries(plain), Object.fromEntries(withStep));
    });

    test(`buildGoodSuffixTable("${pattern}") unaffected by onStep`, () => {
      const plain = buildGoodSuffixTable(pattern);
      const events = [];
      const withStep = buildGoodSuffixTable(pattern, { onStep: (e) => events.push(e) });
      assert.deepEqual(plain.shift, withStep.shift);
      assert.deepEqual(plain.bpos, withStep.bpos);
    });
  }
});

// ---------------------------------------------------------------------------
// The final trace table MUST equal the real preprocessing function's output,
// and MUST equal what the search algorithms actually use internally
// (result.preprocessing) -- this is the "connection to the real search"
// requirement.
// ---------------------------------------------------------------------------
describe("trace final table matches the real preprocessing function directly", () => {
  for (const pattern of PATTERNS) {
    test(`bad character: "${pattern}"`, () => {
      const direct = Object.fromEntries(buildLastOccurrenceTable(pattern));
      const traced = traceBadCharacter(pattern);
      assert.deepEqual(traced.table, direct);
    });

    test(`good suffix: "${pattern}"`, () => {
      const direct = buildGoodSuffixTable(pattern);
      const traced = traceGoodSuffix(pattern);
      assert.deepEqual(traced.shift, direct.shift);
      assert.deepEqual(traced.bpos, direct.bpos);
    });
  }
});

describe("trace final table matches what the actual search algorithms used", () => {
  for (const pattern of PATTERNS.filter((p) => p.length > 0)) {
    const text = "ZZZ" + pattern + "ZZZ" + pattern + "ZZZ";

    test(`bad character table matches runBadCharacter's result.preprocessing: "${pattern}"`, () => {
      const searchResult = runBadCharacter(text, pattern);
      const traced = traceBadCharacter(pattern);
      assert.deepEqual(traced.table, searchResult.preprocessing.lastOccurrenceTable);
    });

    test(`good suffix table matches runGoodSuffix's result.preprocessing: "${pattern}"`, () => {
      const searchResult = runGoodSuffix(text, pattern);
      const traced = traceGoodSuffix(pattern);
      assert.deepEqual(traced.shift, searchResult.preprocessing.shiftTable);
      assert.deepEqual(traced.bpos, searchResult.preprocessing.bpos);
    });

    test(`both tables match runBoyerMoore's result.preprocessing: "${pattern}"`, () => {
      const searchResult = runBoyerMoore(text, pattern);
      const tracedBC = traceBadCharacter(pattern);
      const tracedGS = traceGoodSuffix(pattern);
      assert.deepEqual(tracedBC.table, searchResult.preprocessing.lastOccurrenceTable);
      assert.deepEqual(tracedGS.shift, searchResult.preprocessing.shiftTable);
      assert.deepEqual(tracedGS.bpos, searchResult.preprocessing.bpos);
    });
  }
});

// ---------------------------------------------------------------------------
// Bad Character trace structure
// ---------------------------------------------------------------------------
describe("traceBadCharacter structure", () => {
  test("one SCAN step per pattern character, plus START and DONE", () => {
    const { steps } = traceBadCharacter("ABCD");
    assert.equal(steps.length, 1 + 4 + 1);
    assert.equal(steps[0].type, BC_STEP_TYPES.START);
    assert.equal(steps[steps.length - 1].type, BC_STEP_TYPES.DONE);
    for (let i = 1; i <= 4; i++) assert.equal(steps[i].type, BC_STEP_TYPES.SCAN);
  });

  test("step numbers are sequential starting at 0", () => {
    const { steps } = traceBadCharacter("ABCABC");
    steps.forEach((s, idx) => assert.equal(s.step, idx));
  });

  test("repeated character overwrites: previousValue reported correctly", () => {
    const { steps } = traceBadCharacter("ABA");
    // steps: START, scan A(0), scan B(1), scan A(2), DONE
    const secondA = steps[3];
    assert.equal(secondA.variables.char, "A");
    assert.equal(secondA.variables.previousValue, 0);
    assert.equal(secondA.variables.newValue, 2);
    assert.equal(secondA.tableSnapshot.A, 2);
  });

  test("first occurrence reports previousValue null", () => {
    const { steps } = traceBadCharacter("XYZ");
    assert.equal(steps[1].variables.previousValue, null);
  });

  test("each SCAN step highlights exactly the pattern index just scanned", () => {
    const { steps } = traceBadCharacter("ABCD");
    for (let i = 1; i <= 4; i++) {
      assert.deepEqual(steps[i].patternHighlights, [{ index: i - 1, role: "active" }]);
    }
  });

  test("empty pattern produces just START and DONE, empty table", () => {
    const { steps, table } = traceBadCharacter("");
    assert.equal(steps.length, 2);
    assert.deepEqual(table, {});
  });

  test("table snapshots are progressive (grow monotonically in size or stay same on overwrite)", () => {
    const { steps } = traceBadCharacter("AABC");
    const sizes = steps.map((s) => Object.keys(s.tableSnapshot).length);
    for (let i = 1; i < sizes.length; i++) {
      assert.ok(sizes[i] >= sizes[i - 1], `size should never shrink: ${sizes}`);
    }
    assert.equal(sizes[sizes.length - 1], 3); // A, B, C
  });
});

// ---------------------------------------------------------------------------
// Good Suffix trace structure
// ---------------------------------------------------------------------------
describe("traceGoodSuffix structure", () => {
  test("starts with START, ends with DONE", () => {
    const { steps } = traceGoodSuffix("ABCD");
    assert.equal(steps[0].type, GS_STEP_TYPES.START);
    assert.equal(steps[steps.length - 1].type, GS_STEP_TYPES.DONE);
  });

  test("step numbers are sequential starting at 0", () => {
    const { steps } = traceGoodSuffix("GCAGAGAG");
    steps.forEach((s, idx) => assert.equal(s.step, idx));
  });

  test("final step reports every shift/bpos index as touched", () => {
    const pattern = "ABAB";
    const m = pattern.length;
    const { steps } = traceGoodSuffix(pattern);
    const last = steps[steps.length - 1];
    assert.equal(last.shiftTouched.length, m + 1);
    assert.equal(last.bposTouched.length, m + 1);
    assert.ok(last.shiftTouched.every(Boolean));
    assert.ok(last.bposTouched.every(Boolean));
  });

  test("final step's shiftSnapshot/bposSnapshot equal the real algorithm's output", () => {
    const pattern = "MISSISSIPPI";
    const direct = buildGoodSuffixTable(pattern);
    const { steps } = traceGoodSuffix(pattern);
    const last = steps[steps.length - 1];
    assert.deepEqual(last.shiftSnapshot, direct.shift);
    assert.deepEqual(last.bposSnapshot, direct.bpos);
  });

  test("touched flags only ever turn on, never off, as steps progress", () => {
    const { steps } = traceGoodSuffix("GCAGAGAG");
    for (let k = 1; k < steps.length; k++) {
      const prevShift = steps[k - 1].shiftTouched;
      const curShift = steps[k].shiftTouched;
      const prevBpos = steps[k - 1].bposTouched;
      const curBpos = steps[k].bposTouched;
      for (let idx = 0; idx < prevShift.length; idx++) {
        assert.ok(!prevShift[idx] || curShift[idx], `shiftTouched[${idx}] regressed at step ${k}`);
        assert.ok(!prevBpos[idx] || curBpos[idx], `bposTouched[${idx}] regressed at step ${k}`);
      }
    }
  });

  test("case1-shift-set steps only ever set a cell once (matches shift[j]===0 guard)", () => {
    const { steps } = traceGoodSuffix("ABAB");
    const setIndices = steps.filter((s) => s.type === GS_STEP_TYPES.CASE1_SHIFT_SET).map((s) => s.variables.j);
    assert.equal(new Set(setIndices).size, setIndices.length, "no shift index should be set twice by Case 1");
  });

  test("empty pattern produces START, case1-init(0), case2-init, DONE at minimum and does not throw, and matches the real algorithm", () => {
    assert.doesNotThrow(() => traceGoodSuffix(""));
    const direct = buildGoodSuffixTable("");
    const { shift, bpos, steps } = traceGoodSuffix("");
    assert.deepEqual(shift, direct.shift);
    assert.deepEqual(bpos, direct.bpos);
    assert.ok(steps.length >= 3);
  });

  test("single character pattern does not throw and produces a valid shift table", () => {
    const { shift, bpos } = traceGoodSuffix("A");
    assert.equal(shift.length, 2);
    assert.equal(bpos.length, 2);
  });

  test("suffix pattern highlights never include an out-of-range index", () => {
    const { steps } = traceGoodSuffix("GCAGAGAG");
    const m = "GCAGAGAG".length;
    for (const step of steps) {
      for (const h of step.patternHighlights) {
        assert.ok(h.index >= 0 && h.index < m, `highlight index ${h.index} out of range for m=${m}`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Edge cases across many patterns: no throw, always ends DONE, always valid.
// ---------------------------------------------------------------------------
describe("edge cases", () => {
  const edgeCases = ["", "A", "AA", "AAAAAAAAAA", "ABABABAB", "XYZXYZXYZ", "AAAAAAAAAB", "CABABCABAB"];

  for (const pattern of edgeCases) {
    test(`traceBadCharacter("${pattern}") does not throw and ends with DONE`, () => {
      const { steps } = traceBadCharacter(pattern);
      assert.equal(steps[steps.length - 1].type, BC_STEP_TYPES.DONE);
    });

    test(`traceGoodSuffix("${pattern}") does not throw and ends with DONE`, () => {
      const { steps } = traceGoodSuffix(pattern);
      assert.equal(steps[steps.length - 1].type, GS_STEP_TYPES.DONE);
    });
  }
});
