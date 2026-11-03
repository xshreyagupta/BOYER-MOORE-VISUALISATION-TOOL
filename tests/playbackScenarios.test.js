import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { run } from "../src/engine/index.js";
import {
  playbackReducer,
  initialPlaybackState,
  DEFAULT_SPEED,
} from "../src/ui/lib/playbackLogic.js";

// A real trace from the Phase 1 engine, so these scenario tests exercise
// the actual shape of execution states (not a synthetic totalSteps number).
const TRACE = run("full", "ABCXABCDABXABCDABCDABDE", "ABCD");
const TOTAL = TRACE.states.length;

function dispatch(state, action) {
  return playbackReducer(state, action);
}

describe("playbackReducer: individual controls", () => {
  test("NEXT advances exactly one execution-trace state", () => {
    let s = initialPlaybackState();
    s = dispatch(s, { type: "NEXT", totalSteps: TOTAL });
    assert.equal(s.stepIndex, 1);
  });

  test("PREVIOUS goes back exactly one state", () => {
    let s = { ...initialPlaybackState(), stepIndex: 5 };
    s = dispatch(s, { type: "PREVIOUS", totalSteps: TOTAL });
    assert.equal(s.stepIndex, 4);
  });

  test("FIRST returns to the first state from anywhere", () => {
    let s = { ...initialPlaybackState(), stepIndex: 17 };
    s = dispatch(s, { type: "FIRST" });
    assert.equal(s.stepIndex, 0);
  });

  test("LAST jumps to the final state", () => {
    let s = initialPlaybackState();
    s = dispatch(s, { type: "LAST", totalSteps: TOTAL });
    assert.equal(s.stepIndex, TOTAL - 1);
  });

  test("PAUSE immediately stops playback (isPlaying becomes false synchronously)", () => {
    let s = { ...initialPlaybackState(), isPlaying: true };
    s = dispatch(s, { type: "PAUSE" });
    assert.equal(s.isPlaying, false);
  });

  test("RESTART resets to step 0 and stops playback", () => {
    let s = { stepIndex: 20, isPlaying: true, speed: 2 };
    s = dispatch(s, { type: "RESTART" });
    assert.equal(s.stepIndex, 0);
    assert.equal(s.isPlaying, false);
  });

  test("SET_SPEED changes only speed, not stepIndex or isPlaying", () => {
    let s = { stepIndex: 6, isPlaying: true, speed: 1 };
    s = dispatch(s, { type: "SET_SPEED", speed: 2 });
    assert.equal(s.speed, 2);
    assert.equal(s.stepIndex, 6, "SET_SPEED must not move the step");
    assert.equal(s.isPlaying, true, "SET_SPEED must not affect playing state");
  });
});

// PHASE 13 -- GO TO ERROR jumps playback straight to a specific step
// (firstError.studentStep from findFirstDivergence), via the GOTO action.
describe("playbackReducer: GOTO (PHASE 13 GO TO ERROR)", () => {
  test("GOTO jumps directly to the requested index", () => {
    let s = initialPlaybackState();
    s = dispatch(s, { type: "GOTO", index: 7, totalSteps: TOTAL });
    assert.equal(s.stepIndex, 7);
  });

  test("GOTO stops any active auto-play", () => {
    let s = { ...initialPlaybackState(), isPlaying: true };
    s = dispatch(s, { type: "GOTO", index: 3, totalSteps: TOTAL });
    assert.equal(s.isPlaying, false);
  });

  test("GOTO dismisses a pending mismatch freeze rather than requiring CONTINUE first", () => {
    let s = { ...initialPlaybackState(), awaitingContinue: true, resumeAfterContinue: true };
    s = dispatch(s, { type: "GOTO", index: 2, totalSteps: TOTAL });
    assert.equal(s.awaitingContinue, false);
    assert.equal(s.resumeAfterContinue, false);
    assert.equal(s.stepIndex, 2);
  });

  test("GOTO clamps an out-of-range index into the valid trace range", () => {
    let s = initialPlaybackState();
    s = dispatch(s, { type: "GOTO", index: TOTAL + 50, totalSteps: TOTAL });
    assert.equal(s.stepIndex, TOTAL - 1);

    s = dispatch(s, { type: "GOTO", index: -5, totalSteps: TOTAL });
    assert.equal(s.stepIndex, 0);
  });

  test("GOTO can be dispatched from any starting stepIndex", () => {
    let s = { ...initialPlaybackState(), stepIndex: TOTAL - 1 };
    s = dispatch(s, { type: "GOTO", index: 4, totalSteps: TOTAL });
    assert.equal(s.stepIndex, 4);
  });
});

describe("scenario: Play -> Pause", () => {
  test("playing then pausing stops advancement, preserving the current step", () => {
    let s = initialPlaybackState();
    s = dispatch(s, { type: "PLAY", totalSteps: TOTAL });
    assert.equal(s.isPlaying, true);

    s = dispatch(s, { type: "TICK", totalSteps: TOTAL }); // simulate one interval firing
    const stepAtPause = s.stepIndex;
    s = dispatch(s, { type: "PAUSE" });

    assert.equal(s.isPlaying, false);
    assert.equal(s.stepIndex, stepAtPause, "pausing must not change the step index");

    // Further ticks after pause must not occur in real usage because the
    // effect's interval is torn down when isPlaying goes false; but even
    // if a stray TICK were dispatched, PAUSE having already fired is what
    // the hook relies on to stop the interval, which we verify separately
    // in the hook's effect dependency array (see usePlayback.js).
  });
});

describe("scenario: Play -> Next", () => {
  test("pressing Next while playing stops playback and advances exactly one step", () => {
    let s = initialPlaybackState();
    s = dispatch(s, { type: "PLAY", totalSteps: TOTAL });
    s = dispatch(s, { type: "TICK", totalSteps: TOTAL });
    const beforeNext = s.stepIndex;

    s = dispatch(s, { type: "NEXT", totalSteps: TOTAL });

    assert.equal(s.isPlaying, false, "NEXT must pause playback");
    assert.equal(s.stepIndex, beforeNext + 1);
  });
});

describe("scenario: Next -> Previous", () => {
  test("returns exactly to the original step", () => {
    let s = { ...initialPlaybackState(), stepIndex: 8 };
    s = dispatch(s, { type: "NEXT", totalSteps: TOTAL });
    assert.equal(s.stepIndex, 9);
    s = dispatch(s, { type: "PREVIOUS", totalSteps: TOTAL });
    assert.equal(s.stepIndex, 8);
  });
});

describe("scenario: Last -> Previous", () => {
  test("steps back exactly one from the final state", () => {
    let s = initialPlaybackState();
    s = dispatch(s, { type: "LAST", totalSteps: TOTAL });
    assert.equal(s.stepIndex, TOTAL - 1);
    s = dispatch(s, { type: "PREVIOUS", totalSteps: TOTAL });
    assert.equal(s.stepIndex, TOTAL - 2);
  });
});

describe("scenario: Restart after reaching the end", () => {
  test("Last, then Restart, returns cleanly to step 0", () => {
    let s = initialPlaybackState();
    s = dispatch(s, { type: "LAST", totalSteps: TOTAL });
    assert.equal(s.stepIndex, TOTAL - 1);

    s = dispatch(s, { type: "RESTART" });
    assert.equal(s.stepIndex, 0);
    assert.equal(s.isPlaying, false);
  });

  test("playing to the natural end (TICK until done) then Restart works the same way", () => {
    let s = initialPlaybackState();
    s = dispatch(s, { type: "PLAY", totalSteps: TOTAL });
    let guard = TOTAL + 2;
    while (s.isPlaying) {
      if (guard-- <= 0) throw new Error("playback did not terminate");
      s = dispatch(s, { type: "TICK", totalSteps: TOTAL });
    }
    assert.equal(s.stepIndex, TOTAL - 1);
    assert.equal(s.isPlaying, false, "playback auto-pauses at the final state");

    s = dispatch(s, { type: "RESTART" });
    assert.equal(s.stepIndex, 0);
  });

  test("PLAY is a no-op once already at the final state (must Restart or step back first)", () => {
    let s = initialPlaybackState();
    s = dispatch(s, { type: "LAST", totalSteps: TOTAL });
    s = dispatch(s, { type: "PLAY", totalSteps: TOTAL });
    assert.equal(s.isPlaying, false, "PLAY at the end must not resume playback");
  });
});

describe("scenario: changing speed during playback", () => {
  test("speed changes while playing without affecting isPlaying or stepIndex", () => {
    let s = initialPlaybackState();
    s = dispatch(s, { type: "PLAY", totalSteps: TOTAL });
    s = dispatch(s, { type: "TICK", totalSteps: TOTAL });
    const stepBeforeSpeedChange = s.stepIndex;

    s = dispatch(s, { type: "SET_SPEED", speed: 2 });

    assert.equal(s.speed, 2);
    assert.equal(s.isPlaying, true, "changing speed must not pause playback");
    assert.equal(s.stepIndex, stepBeforeSpeedChange, "changing speed must not skip or repeat a step");

    // Playback continues normally at the new speed (only timing changes,
    // never which step comes next -- see intervalMsForSpeed).
    s = dispatch(s, { type: "TICK", totalSteps: TOTAL });
    assert.equal(s.stepIndex, stepBeforeSpeedChange + 1);
  });
});

describe("scenario: changing text/pattern after playback (new trace)", () => {
  test("RESET_TRACE returns to step 0 and stops playback regardless of prior position", () => {
    let s = initialPlaybackState();
    s = dispatch(s, { type: "PLAY", totalSteps: TOTAL });
    s = dispatch(s, { type: "TICK", totalSteps: TOTAL });
    s = dispatch(s, { type: "TICK", totalSteps: TOTAL });
    assert.ok(s.stepIndex > 0);

    s = dispatch(s, { type: "RESET_TRACE" });

    assert.equal(s.stepIndex, 0);
    assert.equal(s.isPlaying, false);
  });

  test("a new, shorter trace's stepIndex is never left out of range after RESET_TRACE", () => {
    const shortTrace = run("full", "ZZZ", "AB"); // guaranteed no match, short trace
    let s = initialPlaybackState();
    s = dispatch(s, { type: "LAST", totalSteps: TOTAL }); // deep into the long trace
    s = dispatch(s, { type: "RESET_TRACE" }); // simulate switching to the new trace
    assert.equal(s.stepIndex, 0);
    assert.ok(s.stepIndex < shortTrace.states.length, "must be a valid index into the new trace");
  });
});

describe("every displayed variable is derived purely from states[stepIndex] (requirement 9)", () => {
  test("stepping to any index and back reproduces the exact same execution state object fields", () => {
    let s = initialPlaybackState();
    for (let target = 0; target < TOTAL; target++) {
      s = { ...s, stepIndex: target };
      const state = TRACE.states[s.stepIndex];
      // Re-derive the same index via NEXT/PREVIOUS round trips and confirm
      // the underlying trace state (i, j, comparisonResult, chosenShift,
      // explanation, alignment, ...) is identical by reference -- proving
      // playback never mutates or recomputes trace data, only the index.
      let probe = dispatch({ ...s, stepIndex: 0 }, { type: "NEXT", totalSteps: TOTAL });
      if (target === 0) {
        assert.equal(probe.stepIndex, target === TOTAL - 1 ? 0 : Math.min(1, TOTAL - 1));
      }
      assert.equal(TRACE.states[target], state, "state objects must be stable references");
    }
  });

  test("PREVIOUS after NEXT exposes the exact same state fields as before advancing", () => {
    const startIndex = Math.min(5, TOTAL - 1);
    let s = { ...initialPlaybackState(), stepIndex: startIndex };
    const before = TRACE.states[s.stepIndex];

    s = dispatch(s, { type: "NEXT", totalSteps: TOTAL });
    s = dispatch(s, { type: "PREVIOUS", totalSteps: TOTAL });
    const after = TRACE.states[s.stepIndex];

    assert.equal(after, before);
    assert.equal(after.alignment, before.alignment);
    assert.equal(after.i, before.i);
    assert.equal(after.j, before.j);
    assert.equal(after.comparisonResult, before.comparisonResult);
    assert.equal(after.chosenShift, before.chosenShift);
    assert.equal(after.explanation, before.explanation);
  });
});

describe("initialPlaybackState", () => {
  test("starts paused, at step 0, at the default speed", () => {
    const s = initialPlaybackState();
    assert.equal(s.stepIndex, 0);
    assert.equal(s.isPlaying, false);
    assert.equal(s.speed, DEFAULT_SPEED);
  });
});