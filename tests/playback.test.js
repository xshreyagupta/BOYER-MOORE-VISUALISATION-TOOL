import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  clampStepIndex,
  stepFirst,
  stepLast,
  stepPrevious,
  stepNext,
  isAtStart,
  isAtEnd,
  advanceOneStep,
  intervalMsForSpeed,
  SPEEDS,
  DEFAULT_SPEED,
  BASE_INTERVAL_MS,
} from "../src/ui/lib/playbackLogic.js";

describe("clampStepIndex", () => {
  test("clamps below zero up to zero", () => {
    assert.equal(clampStepIndex(-5, 10), 0);
  });
  test("clamps above the last valid index down to it", () => {
    assert.equal(clampStepIndex(99, 10), 9);
  });
  test("passes through valid indices unchanged", () => {
    assert.equal(clampStepIndex(4, 10), 4);
  });
  test("a zero-length trace always clamps to 0", () => {
    assert.equal(clampStepIndex(0, 0), 0);
    assert.equal(clampStepIndex(5, 0), 0);
    assert.equal(clampStepIndex(-5, 0), 0);
  });
});

describe("stepFirst / stepLast", () => {
  test("stepFirst is always 0", () => {
    assert.equal(stepFirst(), 0);
  });
  test("stepLast is totalSteps - 1", () => {
    assert.equal(stepLast(29), 28);
  });
  test("stepLast on an empty trace is 0, not -1", () => {
    assert.equal(stepLast(0), 0);
  });
});

describe("stepPrevious / stepNext", () => {
  test("stepNext advances exactly one state", () => {
    assert.equal(stepNext(5, 10), 6);
  });
  test("stepPrevious goes back exactly one state", () => {
    assert.equal(stepPrevious(5, 10), 4);
  });
  test("stepPrevious at index 0 stays at 0 (does not go negative)", () => {
    assert.equal(stepPrevious(0, 10), 0);
  });
  test("stepNext at the last index stays at the last index", () => {
    assert.equal(stepNext(9, 10), 9);
  });
  test("next then previous returns to the original index (round trip)", () => {
    const totalSteps = 12;
    for (let idx = 0; idx < totalSteps; idx++) {
      const advanced = stepNext(idx, totalSteps);
      const back = stepPrevious(advanced, totalSteps);
      // Only a true round trip away from the boundary; at the last index
      // stepNext is a no-op, so "back" lands one below it, which is correct
      // (Next→Previous from the last step should land on the second-to-last).
      if (idx < totalSteps - 1) {
        assert.equal(back, idx);
      }
    }
  });
});

describe("isAtStart / isAtEnd", () => {
  test("index 0 is at start", () => {
    assert.equal(isAtStart(0), true);
  });
  test("nonzero index is not at start", () => {
    assert.equal(isAtStart(3), false);
  });
  test("last index is at end", () => {
    assert.equal(isAtEnd(9, 10), true);
  });
  test("earlier index is not at end", () => {
    assert.equal(isAtEnd(3, 10), false);
  });
  test("an empty trace is always considered at end", () => {
    assert.equal(isAtEnd(0, 0), true);
  });
});

describe("advanceOneStep (drives PLAY)", () => {
  test("advances by exactly one state per tick", () => {
    const { index, done } = advanceOneStep(2, 10);
    assert.equal(index, 3);
    assert.equal(done, false);
  });

  test("reports done as soon as the resulting index is the final state", () => {
    const { index, done } = advanceOneStep(8, 10);
    assert.equal(index, 9);
    assert.equal(done, true);
  });

  test("never advances past the final state", () => {
    const { index, done } = advanceOneStep(9, 10);
    assert.equal(index, 9);
    assert.equal(done, true);
  });

  test("a single-state trace is immediately done", () => {
    const { index, done } = advanceOneStep(0, 1);
    assert.equal(index, 0);
    assert.equal(done, true);
  });

  test("an empty trace is immediately done at index 0", () => {
    const { index, done } = advanceOneStep(0, 0);
    assert.equal(index, 0);
    assert.equal(done, true);
  });

  test("repeatedly advancing from the start walks every state exactly once and stops at the last", () => {
    const totalSteps = 7;
    let idx = 0;
    let done = false;
    const visited = [idx];
    let guard = totalSteps + 2;
    while (!done) {
      if (guard-- <= 0) throw new Error("advanceOneStep loop did not terminate");
      const result = advanceOneStep(idx, totalSteps);
      idx = result.index;
      done = result.done;
      visited.push(idx);
    }
    assert.deepEqual(visited, [0, 1, 2, 3, 4, 5, 6]);
    assert.equal(idx, stepLast(totalSteps));
  });
});

describe("intervalMsForSpeed (timing only, never changes which step is shown)", () => {
  test("1x speed uses the base interval", () => {
    assert.equal(intervalMsForSpeed(1), BASE_INTERVAL_MS);
  });
  test("2x speed is twice as fast (half the interval)", () => {
    assert.equal(intervalMsForSpeed(2), BASE_INTERVAL_MS / 2);
  });
  test("0.5x speed is half as fast (double the interval)", () => {
    assert.equal(intervalMsForSpeed(0.5), BASE_INTERVAL_MS * 2);
  });
  test("1.5x speed", () => {
    assert.equal(intervalMsForSpeed(1.5), BASE_INTERVAL_MS / 1.5);
  });
  test("all documented speeds produce a positive, finite interval", () => {
    for (const speed of SPEEDS) {
      const ms = intervalMsForSpeed(speed);
      assert.ok(Number.isFinite(ms) && ms > 0, `speed ${speed} produced an invalid interval: ${ms}`);
    }
  });
  test("DEFAULT_SPEED is one of the documented speeds", () => {
    assert.ok(SPEEDS.includes(DEFAULT_SPEED));
  });
});
