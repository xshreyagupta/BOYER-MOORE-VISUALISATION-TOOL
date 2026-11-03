import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { run, ALGORITHMS } from "../src/engine/index.js";
import { getPreviousState, getConfirmedMatches } from "../src/ui/lib/traceSelectors.js";

const TEXT = "ABCXABCDABXABCDABCDABDE";
const PATTERN = "ABCD";

describe("getPreviousState", () => {
  const { states } = run(ALGORITHMS.FULL, TEXT, PATTERN);

  test("returns null at the first index", () => {
    assert.equal(getPreviousState(states, 0), null);
  });

  test("returns null for a negative index", () => {
    assert.equal(getPreviousState(states, -1), null);
  });

  test("returns the state immediately before currentIndex", () => {
    const prev = getPreviousState(states, 5);
    assert.equal(prev.step, states[4].step);
  });

  test("clamps to the last state when currentIndex is past the end", () => {
    const prev = getPreviousState(states, states.length + 10);
    assert.equal(prev, states[states.length - 1]);
  });

  test("returns null for an empty states array", () => {
    assert.equal(getPreviousState([], 3), null);
  });

  test("returns null for a null/undefined states array", () => {
    assert.equal(getPreviousState(null, 3), null);
    assert.equal(getPreviousState(undefined, 3), null);
  });
});

describe("getConfirmedMatches (regression coverage)", () => {
  test("finds no matches before any FOUND state is reached", () => {
    const { states } = run(ALGORITHMS.FULL, TEXT, PATTERN);
    assert.deepEqual(getConfirmedMatches(states, 0), []);
  });

  test("accumulates every confirmed match up to and including upToStep", () => {
    const { states, matches } = run(ALGORITHMS.FULL, TEXT, PATTERN);
    const confirmedAtEnd = getConfirmedMatches(states, states.length - 1);
    assert.deepEqual(confirmedAtEnd, matches);
  });
});
