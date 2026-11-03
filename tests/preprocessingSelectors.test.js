import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { traceBadCharacter, traceGoodSuffix } from "../src/algorithms/preprocessingTrace.js";
import {
  getPatternChars,
  getCurrentStep,
  getPatternCharRole,
  getBadCharacterCellStatus,
  getGoodSuffixShiftCellStatus,
  getGoodSuffixBposCellStatus,
  isTraceComplete,
  getStepPhaseLabel,
} from "../src/ui/lib/preprocessingSelectors.js";

describe("getPatternChars", () => {
  test("splits the pattern into characters", () => {
    const trace = traceBadCharacter("ABCD");
    assert.deepEqual(getPatternChars(trace), ["A", "B", "C", "D"]);
  });
  test("null trace yields empty array", () => {
    assert.deepEqual(getPatternChars(null), []);
  });
});

describe("getCurrentStep", () => {
  test("returns the step at stepIndex", () => {
    const trace = traceBadCharacter("ABC");
    assert.equal(getCurrentStep(trace, 1).step, 1);
  });
  test("clamps out-of-range indices", () => {
    const trace = traceBadCharacter("ABC");
    assert.equal(getCurrentStep(trace, 999).step, trace.steps.length - 1);
    assert.equal(getCurrentStep(trace, -5).step, 0);
  });
  test("null trace returns null", () => {
    assert.equal(getCurrentStep(null, 0), null);
  });
});

describe("getPatternCharRole", () => {
  test("returns idle when nothing highlighted", () => {
    assert.equal(getPatternCharRole(null, 0), "idle");
    assert.equal(getPatternCharRole({ patternHighlights: [] }, 0), "idle");
  });
  test("returns the matching role for a highlighted index", () => {
    const step = { patternHighlights: [{ index: 2, role: "active" }] };
    assert.equal(getPatternCharRole(step, 2), "active");
    assert.equal(getPatternCharRole(step, 0), "idle");
  });
  test("active takes priority over suffix when both present at same index", () => {
    const step = {
      patternHighlights: [
        { index: 2, role: "suffix" },
        { index: 2, role: "active" },
      ],
    };
    assert.equal(getPatternCharRole(step, 2), "active");
  });
});

describe("getBadCharacterCellStatus", () => {
  test("unset before the character has appeared in the snapshot", () => {
    const trace = traceBadCharacter("ABC");
    assert.equal(getBadCharacterCellStatus(trace.steps[0], "A"), "unset");
  });
  test("active on the exact scan step for that character", () => {
    const trace = traceBadCharacter("ABC");
    // steps: START(0), scan A(1), scan B(2), scan C(3), DONE(4)
    assert.equal(getBadCharacterCellStatus(trace.steps[1], "A"), "active");
  });
  test("settled once scanned but not on this step", () => {
    const trace = traceBadCharacter("ABC");
    assert.equal(getBadCharacterCellStatus(trace.steps[2], "A"), "settled");
  });
  test("null step returns unset", () => {
    assert.equal(getBadCharacterCellStatus(null, "A"), "unset");
  });
});

describe("getGoodSuffixShiftCellStatus / getGoodSuffixBposCellStatus", () => {
  test("unset before touched", () => {
    const trace = traceGoodSuffix("ABCD");
    assert.equal(getGoodSuffixShiftCellStatus(trace.steps[0], 4), "unset");
  });
  test("settled at the final DONE step for every index", () => {
    const pattern = "ABCD";
    const trace = traceGoodSuffix(pattern);
    const last = trace.steps[trace.steps.length - 1];
    for (let i = 0; i <= pattern.length; i++) {
      assert.equal(getGoodSuffixShiftCellStatus(last, i), "settled");
      assert.equal(getGoodSuffixBposCellStatus(last, i), "settled");
    }
  });
  test("active flags exactly the cell just written", () => {
    const trace = traceGoodSuffix("GCAGAGAG");
    const activeStep = trace.steps.find((s) => s.activeShift !== null);
    assert.ok(activeStep, "expected at least one step with an active shift cell");
    assert.equal(getGoodSuffixShiftCellStatus(activeStep, activeStep.activeShift), "active");
  });
});

describe("isTraceComplete", () => {
  test("false before the last step", () => {
    const trace = traceBadCharacter("ABCD");
    assert.equal(isTraceComplete(trace, 0), false);
  });
  test("true at the last step", () => {
    const trace = traceBadCharacter("ABCD");
    assert.equal(isTraceComplete(trace, trace.steps.length - 1), true);
  });
  test("true past the last step too", () => {
    const trace = traceBadCharacter("ABCD");
    assert.equal(isTraceComplete(trace, 999), true);
  });
  test("false for a null trace", () => {
    assert.equal(isTraceComplete(null, 0), false);
  });
});

describe("getStepPhaseLabel", () => {
  test("labels start/done/scan", () => {
    const trace = traceBadCharacter("AB");
    assert.equal(getStepPhaseLabel(trace.steps[0]), "SETUP");
    assert.equal(getStepPhaseLabel(trace.steps[1]), "SCANNING");
    assert.equal(getStepPhaseLabel(trace.steps[trace.steps.length - 1]), "COMPLETE");
  });
  test("labels case1/case2 steps", () => {
    const trace = traceGoodSuffix("GCAGAGAG");
    const case1Step = trace.steps.find((s) => s.type.startsWith("case1"));
    const case2Step = trace.steps.find((s) => s.type.startsWith("case2"));
    assert.equal(getStepPhaseLabel(case1Step), "CASE 1");
    assert.equal(getStepPhaseLabel(case2Step), "CASE 2");
  });
  test("null step returns empty string", () => {
    assert.equal(getStepPhaseLabel(null), "");
  });
});
