import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { run, ALGORITHMS } from "../src/engine/index.js";
import { isMismatchFreezeState, clampStepIndex } from "../src/ui/lib/playbackLogic.js";
import {
  ALGORITHM_PAIRS,
  ALL_THREE_ALGORITHMS,
  DEFAULT_PAIR_ID,
  getPairById,
  computeSharedTotalSteps,
  getPanelState,
  buildFreezeDrivingStates,
} from "../src/ui/lib/comparisonSelectors.js";

const TEXT = "ABCXABCDABXABCDABCDABDE";
const PATTERN = "ABCD";

function runAll(text, pattern, algorithms) {
  return algorithms.map((algorithm) => ({ algorithm, ...run(algorithm, text, pattern) }));
}

describe("ALGORITHM_PAIRS / ALL_THREE_ALGORITHMS", () => {
  test("exposes exactly the three required 2-screen combinations", () => {
    const sets = ALGORITHM_PAIRS.map((p) => [...p.algorithms].sort().join(","));
    assert.deepEqual(
      new Set(sets),
      new Set(
        [
          [ALGORITHMS.BAD_CHARACTER, ALGORITHMS.GOOD_SUFFIX],
          [ALGORITHMS.BAD_CHARACTER, ALGORITHMS.FULL],
          [ALGORITHMS.GOOD_SUFFIX, ALGORITHMS.FULL],
        ].map((pair) => [...pair].sort().join(","))
      )
    );
  });

  test("ALL_THREE_ALGORITHMS contains each algorithm exactly once", () => {
    assert.deepEqual(new Set(ALL_THREE_ALGORITHMS), new Set(Object.values(ALGORITHMS)));
    assert.equal(ALL_THREE_ALGORITHMS.length, 3);
  });

  test("getPairById falls back safely for an unknown id", () => {
    assert.equal(getPairById("nonsense"), ALGORITHM_PAIRS[0]);
    assert.equal(getPairById(DEFAULT_PAIR_ID).id, DEFAULT_PAIR_ID);
  });
});

describe("computeSharedTotalSteps", () => {
  test("is the max trace length across panels, not a sum or an assumed equality", () => {
    const panels = runAll(TEXT, PATTERN, ALL_THREE_ALGORITHMS);
    const lengths = panels.map((p) => p.states.length);
    // Sanity: the three algorithms genuinely do NOT produce equal-length
    // traces for this input -- otherwise this test would prove nothing.
    assert.ok(new Set(lengths).size > 1, "expected differing trace lengths across algorithms");
    assert.equal(computeSharedTotalSteps(panels), Math.max(...lengths));
  });

  test("returns 0 when every panel errored (no states)", () => {
    const panels = runAll(TEXT, "", [ALGORITHMS.BAD_CHARACTER, ALGORITHMS.FULL]);
    assert.equal(computeSharedTotalSteps(panels), 0);
  });
});

describe("getPanelState", () => {
  test("returns the exact same state a single-panel trace would at valid indices", () => {
    const { states } = run(ALGORITHMS.FULL, TEXT, PATTERN);
    assert.equal(getPanelState(states, 0), states[0]);
    assert.equal(getPanelState(states, states.length - 1), states[states.length - 1]);
  });

  test("clamps to the panel's own final state once the shared index runs past it, never returning undefined", () => {
    const { states } = run(ALGORITHMS.FULL, TEXT, PATTERN);
    const wayPastEnd = states.length + 500;
    const result = getPanelState(states, wayPastEnd);
    assert.equal(result, states[states.length - 1]);
    assert.notEqual(result, undefined);
  });

  test("a zero-length (errored) panel always reads null, never throws", () => {
    const { states } = run(ALGORITHMS.FULL, TEXT, ""); // empty pattern -> validation error
    assert.equal(states.length, 0);
    assert.equal(getPanelState(states, 0), null);
    assert.equal(getPanelState(states, 9999), null);
  });
});

describe("comparison timeline mapping across genuinely different trace lengths", () => {
  test("every panel stays in-bounds across the ENTIRE shared timeline for every step count", () => {
    const panels = runAll(TEXT, PATTERN, ALL_THREE_ALGORITHMS);
    const sharedTotalSteps = computeSharedTotalSteps(panels);

    for (let shared = 0; shared < sharedTotalSteps; shared++) {
      for (const panel of panels) {
        const s = getPanelState(panel.states, shared);
        assert.ok(s !== undefined, `panel ${panel.algorithm} returned undefined at shared step ${shared}`);
        if (panel.states.length > 0) assert.ok(s !== null);
      }
    }
  });

  test("a panel that finishes earlier holds at its final state for the remainder of the shared timeline", () => {
    const panels = runAll(TEXT, PATTERN, ALL_THREE_ALGORITHMS);
    const sharedTotalSteps = computeSharedTotalSteps(panels);
    const shortest = panels.reduce((a, b) => (a.states.length <= b.states.length ? a : b));
    const finalState = shortest.states[shortest.states.length - 1];

    for (let shared = shortest.states.length - 1; shared < sharedTotalSteps; shared++) {
      assert.equal(getPanelState(shortest.states, shared), finalState);
    }
  });

  test("works symmetrically for 1-screen and each fixed 2-screen pair, not just 3-screen", () => {
    for (const combo of [[ALGORITHMS.BAD_CHARACTER], ...ALGORITHM_PAIRS.map((p) => p.algorithms), ALL_THREE_ALGORITHMS]) {
      const panels = runAll(TEXT, PATTERN, combo);
      const sharedTotalSteps = computeSharedTotalSteps(panels);
      const last = sharedTotalSteps > 0 ? sharedTotalSteps - 1 : 0;
      for (const panel of panels) {
        assert.doesNotThrow(() => getPanelState(panel.states, last));
      }
    }
  });
});

describe("buildFreezeDrivingStates -- Phase 4 integration", () => {
  test("is exactly sharedTotalSteps long regardless of which algorithms are shown", () => {
    const panels = runAll(TEXT, PATTERN, ALL_THREE_ALGORITHMS);
    const sharedTotalSteps = computeSharedTotalSteps(panels);
    const driving = buildFreezeDrivingStates(panels, sharedTotalSteps);
    assert.equal(driving.length, sharedTotalSteps);
  });

  test("when Full Boyer-Moore is NOT among the visible panels, freeze can never trigger", () => {
    const panels = runAll(TEXT, PATTERN, [ALGORITHMS.BAD_CHARACTER, ALGORITHMS.GOOD_SUFFIX]);
    const sharedTotalSteps = computeSharedTotalSteps(panels);
    const driving = buildFreezeDrivingStates(panels, sharedTotalSteps);
    assert.ok(driving.every((s) => s === null));
    assert.ok(driving.every((s) => !isMismatchFreezeState(s)));
  });

  test("when Full Boyer-Moore IS visible, the driving array reproduces its real mismatch freezes 1:1", () => {
    const panels = runAll(TEXT, PATTERN, [ALGORITHMS.BAD_CHARACTER, ALGORITHMS.FULL]);
    const sharedTotalSteps = computeSharedTotalSteps(panels);
    const driving = buildFreezeDrivingStates(panels, sharedTotalSteps);
    const fullPanel = panels.find((p) => p.algorithm === ALGORITHMS.FULL);

    // Sanity: this fixture genuinely produces at least one freeze-worthy
    // mismatch, otherwise this test would pass vacuously.
    const realFreezeCount = fullPanel.states.filter(isMismatchFreezeState).length;
    assert.ok(realFreezeCount > 0, "expected at least one real Full BM mismatch-freeze state");

    let projectedFreezeCount = 0;
    for (let shared = 0; shared < sharedTotalSteps; shared++) {
      const isFreeze = isMismatchFreezeState(driving[shared]);
      const expected = isMismatchFreezeState(getPanelState(fullPanel.states, shared));
      assert.equal(isFreeze, expected, `mismatch at shared step ${shared}`);
      if (isFreeze) projectedFreezeCount++;
    }
    assert.equal(projectedFreezeCount, realFreezeCount);
  });

  test("Bad Character-only and Good Suffix-only traces never themselves count as freeze states", () => {
    const panels = runAll(TEXT, PATTERN, [ALGORITHMS.BAD_CHARACTER, ALGORITHMS.GOOD_SUFFIX]);
    for (const panel of panels) {
      assert.ok(panel.states.every((s) => !isMismatchFreezeState(s)));
    }
  });

  test("clampStepIndex agrees with getPanelState's own clamping (single source of truth)", () => {
    const { states } = run(ALGORITHMS.FULL, TEXT, PATTERN);
    for (const shared of [0, 1, states.length - 1, states.length, states.length + 50]) {
      assert.equal(getPanelState(states, shared), states[clampStepIndex(shared, states.length)]);
    }
  });
});

describe("multiple matches / repeated characters / long inputs stay safe", () => {
  test("repeated-character pattern with multiple matches", () => {
    const text = "AAAAAAAAAAAAAAAAAAAA";
    const pattern = "AAA";
    const panels = runAll(text, pattern, ALL_THREE_ALGORITHMS);
    const sharedTotalSteps = computeSharedTotalSteps(panels);
    for (let shared = 0; shared < sharedTotalSteps; shared++) {
      for (const panel of panels) assert.doesNotThrow(() => getPanelState(panel.states, shared));
    }
  });

  test("pattern not found at all", () => {
    const panels = runAll("ABCABCABCABC", "XYZ", ALL_THREE_ALGORITHMS);
    const sharedTotalSteps = computeSharedTotalSteps(panels);
    for (let shared = 0; shared < sharedTotalSteps; shared++) {
      for (const panel of panels) assert.doesNotThrow(() => getPanelState(panel.states, shared));
    }
  });

  test("long text and long pattern", () => {
    const text = "ABCD".repeat(200);
    const pattern = "ABCDABCE";
    const panels = runAll(text, pattern, ALL_THREE_ALGORITHMS);
    const sharedTotalSteps = computeSharedTotalSteps(panels);
    assert.ok(sharedTotalSteps > 0);
    for (const panel of panels) {
      assert.doesNotThrow(() => getPanelState(panel.states, sharedTotalSteps - 1));
    }
  });
});
