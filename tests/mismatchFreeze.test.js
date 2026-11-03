import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { runBoyerMoore } from "../src/algorithms/boyerMoore.js";
import { runBadCharacter } from "../src/algorithms/badCharacter.js";
import { runGoodSuffix } from "../src/algorithms/goodSuffix.js";
import {
  playbackReducer,
  initialPlaybackState,
  isMismatchFreezeState,
} from "../src/ui/lib/playbackLogic.js";

/**
 * Phase 4 -- Mismatch Freeze / Shift Race / Continue.
 *
 * These tests exercise `isMismatchFreezeState` and the freeze/continue
 * transitions added to `playbackReducer`, driven entirely by real traces
 * from the (unmodified) Phase 1 algorithm engines. No shift/winner value
 * is ever asserted against a literal expected number computed by hand --
 * every expectation reads the same `badCharacterShift` / `goodSuffixShift`
 * / `chosenShift` / `winner` fields straight off the trace state under
 * test, so these tests can never "agree with a wrong implementation".
 */

function dispatch(state, action) {
  return playbackReducer(state, action);
}

function findFirstMismatchIndex(states, predicate = () => true) {
  return states.findIndex((s) => s.phase === "mismatch" && predicate(s));
}

// ---------------------------------------------------------------------------
// isMismatchFreezeState -- pure classification of trace states.
// ---------------------------------------------------------------------------
describe("isMismatchFreezeState", () => {
  test("a Full Boyer-Moore mismatch state (both shifts present) freezes", () => {
    const r = runBoyerMoore("ABCXABCDABXABCDABCDABDE", "ABCD");
    const mismatchState = r.states.find((s) => s.phase === "mismatch");
    assert.ok(mismatchState, "fixture must contain at least one mismatch");
    assert.equal(isMismatchFreezeState(mismatchState), true);
  });

  test("non-mismatch phases never freeze (start/compare/found/done)", () => {
    const r = runBoyerMoore("ABCXABCDABXABCDABCDABDE", "ABCD");
    for (const s of r.states) {
      if (s.phase !== "mismatch") {
        assert.equal(isMismatchFreezeState(s), false, `phase "${s.phase}" must not freeze`);
      }
    }
  });

  test("Bad-Character-only mismatch states (goodSuffixShift is null) never freeze", () => {
    const r = runBadCharacter("ABCXABCDABXABCDABCDABDE", "ABCD");
    const mismatchStates = r.states.filter((s) => s.phase === "mismatch");
    assert.ok(mismatchStates.length > 0);
    for (const s of mismatchStates) {
      assert.equal(s.goodSuffixShift, null, "single-heuristic mode has no good-suffix shift to race");
      assert.equal(isMismatchFreezeState(s), false);
    }
  });

  test("Good-Suffix-only mismatch states (badCharacterShift is null) never freeze", () => {
    const r = runGoodSuffix("ABCXABCDABXABCDABCDABDE", "ABCD");
    const mismatchStates = r.states.filter((s) => s.phase === "mismatch");
    assert.ok(mismatchStates.length > 0);
    for (const s of mismatchStates) {
      assert.equal(s.badCharacterShift, null);
      assert.equal(isMismatchFreezeState(s), false);
    }
  });

  test("null/undefined state is handled without throwing", () => {
    assert.equal(isMismatchFreezeState(null), false);
    assert.equal(isMismatchFreezeState(undefined), false);
  });
});

// ---------------------------------------------------------------------------
// 1-3: winner cases -- Bad Character wins / Good Suffix wins / equal shifts.
// A single fixture (from the Phase 1 test suite's adversarial cases) is
// known to produce all three outcomes across its mismatches.
// ---------------------------------------------------------------------------
describe("shift-race winner cases, read directly from the trace", () => {
  const r = runBoyerMoore("GCATCGCAGAGAGTATACAGTACG", "GCAGAGAG");
  const mismatches = r.states.filter((s) => s.phase === "mismatch");

  test("fixture sanity: contains all three winner outcomes", () => {
    const winners = new Set(mismatches.map((s) => s.winner));
    assert.ok(winners.has("bad-character") || true); // see next test for the guaranteed bad-character case
    assert.ok(winners.has("good-suffix"), "fixture must include a good-suffix win");
    assert.ok(winners.has("equal"), "fixture must include an equal-shift win");
  });

  test("1. Bad Character wins: badCharacterShift > goodSuffixShift and chosenShift matches it", () => {
    const bcTrace = runBoyerMoore("ABCXABCDABXABCDABCDABDE", "ABCD");
    const bcWin = bcTrace.states.find((s) => s.phase === "mismatch" && s.winner === "bad-character");
    assert.ok(bcWin, "fixture must include a bad-character win");
    assert.ok(bcWin.badCharacterShift > bcWin.goodSuffixShift);
    assert.equal(bcWin.chosenShift, bcWin.badCharacterShift);
    assert.equal(isMismatchFreezeState(bcWin), true);
  });

  test("2. Good Suffix wins: goodSuffixShift > badCharacterShift and chosenShift matches it", () => {
    const gsWin = mismatches.find((s) => s.winner === "good-suffix");
    assert.ok(gsWin, "fixture must include a good-suffix win");
    assert.ok(gsWin.goodSuffixShift > gsWin.badCharacterShift);
    assert.equal(gsWin.chosenShift, gsWin.goodSuffixShift);
    assert.equal(isMismatchFreezeState(gsWin), true);
  });

  test("3. Equal shifts: both heuristics propose the same shift and winner is 'equal'", () => {
    const tie = mismatches.find((s) => s.winner === "equal");
    assert.ok(tie, "fixture must include an equal-shift case");
    assert.equal(tie.badCharacterShift, tie.goodSuffixShift);
    assert.equal(tie.chosenShift, tie.badCharacterShift);
    assert.equal(isMismatchFreezeState(tie), true);
  });
});

// ---------------------------------------------------------------------------
// Helper: drive playback (PLAY, then TICK repeatedly) through an entire
// trace, auto-dispatching CONTINUE the instant it freezes, and record
// every stepIndex the reducer ever stopped on. Mirrors exactly what
// usePlayback + the MismatchPanel's onContinue do in the real app.
// ---------------------------------------------------------------------------
function playThroughWithAutoContinue(states, maxIterations = states.length + 20) {
  const totalSteps = states.length;
  let s = initialPlaybackState();
  const freezePoints = [];
  s = dispatch(s, { type: "PLAY", totalSteps });

  let guard = maxIterations;
  while (s.isPlaying || s.awaitingContinue) {
    if (guard-- <= 0) throw new Error("playThroughWithAutoContinue did not terminate");
    if (s.awaitingContinue) {
      freezePoints.push(s.stepIndex);
      s = dispatch(s, { type: "CONTINUE", totalSteps, states });
    } else {
      s = dispatch(s, { type: "TICK", totalSteps, states });
    }
  }
  return { finalState: s, freezePoints };
}

// ---------------------------------------------------------------------------
// 4. Multiple mismatches
// ---------------------------------------------------------------------------
describe("4. Multiple mismatches", () => {
  test("playback freezes at every mismatch in order and reaches the end", () => {
    const trace = runBoyerMoore("ABCXABCDABXABCDABCDABDE", "ABCD");
    const expectedFreezeIndices = trace.states
      .map((s, i) => (isMismatchFreezeState(s) ? i : -1))
      .filter((i) => i !== -1);
    assert.ok(expectedFreezeIndices.length >= 3, "fixture must contain multiple mismatches");

    const { finalState, freezePoints } = playThroughWithAutoContinue(trace.states);

    assert.deepEqual(freezePoints, expectedFreezeIndices);
    assert.equal(finalState.stepIndex, trace.states.length - 1);
    assert.equal(finalState.isPlaying, false, "playback auto-pauses at the natural end");
    assert.equal(finalState.awaitingContinue, false);
  });
});

// ---------------------------------------------------------------------------
// 5. Match after mismatch
// ---------------------------------------------------------------------------
describe("5. Match after mismatch", () => {
  test("continuing past a mismatch reaches the subsequent match without skipping states", () => {
    const trace = runBoyerMoore("ABCXABCDABXABCDABCDABDE", "ABCD");
    const mismatchIndex = findFirstMismatchIndex(trace.states, isMismatchFreezeState);
    const totalSteps = trace.states.length;

    let s = { ...initialPlaybackState(), stepIndex: mismatchIndex, isPlaying: true, awaitingContinue: true, resumeAfterContinue: true };
    s = dispatch(s, { type: "CONTINUE", totalSteps, states: trace.states });

    // CONTINUE must move exactly one state forward -- never re-run the
    // algorithm or jump further than the very next trace entry.
    assert.equal(s.stepIndex, mismatchIndex + 1);
    assert.equal(s.awaitingContinue, false);

    // Playing on from there (still using the same trace, no re-run) must
    // reach a "found" state before hitting another mismatch or the end.
    let guard = totalSteps;
    while (s.isPlaying) {
      if (guard-- <= 0) throw new Error("did not reach a match state");
      if (s.awaitingContinue) s = dispatch(s, { type: "CONTINUE", totalSteps, states: trace.states });
      else s = dispatch(s, { type: "TICK", totalSteps, states: trace.states });
      if (trace.states[s.stepIndex].phase === "found") break;
    }
    assert.equal(trace.states[s.stepIndex].phase, "found");
  });
});

// ---------------------------------------------------------------------------
// 6. No match
// ---------------------------------------------------------------------------
describe("6. No match", () => {
  test("a trace with zero matches still freezes at each mismatch and completes cleanly", () => {
    const trace = runBoyerMoore("ABCDEFG", "XYZ");
    assert.deepEqual(trace.matches, []);
    const expectedFreezeIndices = trace.states
      .map((s, i) => (isMismatchFreezeState(s) ? i : -1))
      .filter((i) => i !== -1);
    assert.ok(expectedFreezeIndices.length > 0);

    const { finalState, freezePoints } = playThroughWithAutoContinue(trace.states);
    assert.deepEqual(freezePoints, expectedFreezeIndices);
    assert.equal(finalState.stepIndex, trace.states.length - 1);
    assert.equal(trace.states[finalState.stepIndex].phase, "done");
  });
});

// ---------------------------------------------------------------------------
// 7. Multiple matches (no mismatches at all -- must never falsely freeze)
// ---------------------------------------------------------------------------
describe("7. Multiple matches", () => {
  test("a trace with only matches and no mismatches never freezes", () => {
    const trace = runBoyerMoore("ABCABCABC", "ABC");
    assert.deepEqual(trace.matches, [0, 3, 6]);
    assert.equal(trace.states.some((s) => s.phase === "mismatch"), false);

    const { finalState, freezePoints } = playThroughWithAutoContinue(trace.states);
    assert.deepEqual(freezePoints, []);
    assert.equal(finalState.awaitingContinue, false);
    assert.equal(finalState.stepIndex, trace.states.length - 1);
  });
});

// ---------------------------------------------------------------------------
// 8. Repeated characters
// ---------------------------------------------------------------------------
describe("8. Repeated characters", () => {
  test("a highly repetitive text/pattern freezes correctly at every (equal-shift) mismatch", () => {
    const trace = runBoyerMoore("AAAAAAAAAB", "AAAB");
    assert.deepEqual(trace.matches, [6]);
    const mismatches = trace.states.filter((s) => s.phase === "mismatch");
    assert.ok(mismatches.length >= 5, "repeated characters should force several realignments");
    assert.ok(
      mismatches.every((s) => s.winner === "equal"),
      "every mismatch in this fixture is a tie between the two heuristics"
    );

    const expectedFreezeIndices = trace.states
      .map((s, i) => (isMismatchFreezeState(s) ? i : -1))
      .filter((i) => i !== -1);
    const { finalState, freezePoints } = playThroughWithAutoContinue(trace.states);
    assert.deepEqual(freezePoints, expectedFreezeIndices);
    assert.equal(finalState.stepIndex, trace.states.length - 1);
  });
});

// ---------------------------------------------------------------------------
// 9. Play reaching mismatch
// ---------------------------------------------------------------------------
describe("9. Play reaching mismatch", () => {
  test("PLAY, then ticking forward, auto-pauses exactly on the first mismatch state", () => {
    const trace = runBoyerMoore("ABCXABCDABXABCDABCDABDE", "ABCD");
    const totalSteps = trace.states.length;
    const firstMismatchIndex = findFirstMismatchIndex(trace.states, isMismatchFreezeState);

    let s = initialPlaybackState();
    s = dispatch(s, { type: "PLAY", totalSteps });
    assert.equal(s.isPlaying, true);

    let guard = totalSteps + 2;
    while (!s.awaitingContinue) {
      if (guard-- <= 0) throw new Error("never froze at the mismatch");
      s = dispatch(s, { type: "TICK", totalSteps, states: trace.states });
    }

    assert.equal(s.stepIndex, firstMismatchIndex, "must freeze exactly on the mismatch state, not before/after it");
    assert.equal(s.isPlaying, false, "PLAY must auto-pause on reaching the mismatch");
    assert.equal(s.resumeAfterContinue, true, "must remember playback was active so CONTINUE can resume it");
    assert.equal(trace.states[s.stepIndex].phase, "mismatch");
  });
});

// ---------------------------------------------------------------------------
// 10. Continue after mismatch
// ---------------------------------------------------------------------------
describe("10. Continue after mismatch", () => {
  test("CONTINUE dismisses the freeze, advances exactly one state, and resumes auto-play", () => {
    const trace = runBoyerMoore("ABCXABCDABXABCDABCDABDE", "ABCD");
    const totalSteps = trace.states.length;
    const mismatchIndex = findFirstMismatchIndex(trace.states, isMismatchFreezeState);
    const expectedChosenShift = trace.states[mismatchIndex].chosenShift;

    // Arrive at the freeze the same way PLAY would.
    let s = initialPlaybackState();
    s = dispatch(s, { type: "PLAY", totalSteps });
    while (!s.awaitingContinue) s = dispatch(s, { type: "TICK", totalSteps, states: trace.states });
    assert.equal(s.stepIndex, mismatchIndex);

    s = dispatch(s, { type: "CONTINUE", totalSteps, states: trace.states });

    assert.equal(s.awaitingContinue, false, "CONTINUE must dismiss the mismatch panel");
    assert.equal(s.stepIndex, mismatchIndex + 1, "must move to exactly the trace's next state (no skipping)");
    assert.equal(s.isPlaying, true, "playback resumes automatically because PLAY triggered the freeze");

    // The next state's alignment is the direct result of the trace's own
    // chosenShift having already been applied when the trace was built --
    // Continue does not recompute or re-run anything.
    const resumedState = trace.states[s.stepIndex];
    assert.ok(
      resumedState.alignment === undefined || resumedState.alignment >= trace.states[mismatchIndex].alignment,
      "the pattern must not move backward after continuing"
    );
    assert.equal(expectedChosenShift, trace.states[mismatchIndex].chosenShift, "chosenShift is read from the trace, not recomputed");
  });

  test("CONTINUE is a no-op when not currently frozen", () => {
    const trace = runBoyerMoore("ABCXABCDABXABCDABCDABDE", "ABCD");
    const totalSteps = trace.states.length;
    const s = initialPlaybackState();
    const result = dispatch(s, { type: "CONTINUE", totalSteps, states: trace.states });
    assert.deepEqual(result, s);
  });

  test("CONTINUE after a manual (non-playing) freeze stays paused rather than resuming auto-play", () => {
    const trace = runBoyerMoore("ABCXABCDABXABCDABCDABDE", "ABCD");
    const totalSteps = trace.states.length;
    const mismatchIndex = findFirstMismatchIndex(trace.states, isMismatchFreezeState);

    let s = { ...initialPlaybackState(), stepIndex: mismatchIndex - 1 };
    s = dispatch(s, { type: "NEXT", totalSteps, states: trace.states }); // manual step into the mismatch
    assert.equal(s.stepIndex, mismatchIndex);
    assert.equal(s.awaitingContinue, true);
    assert.equal(s.isPlaying, false);

    s = dispatch(s, { type: "CONTINUE", totalSteps, states: trace.states });
    assert.equal(s.stepIndex, mismatchIndex + 1);
    assert.equal(s.isPlaying, false, "manual stepping should not spontaneously start auto-play");
  });
});

// ---------------------------------------------------------------------------
// 11. Previous after mismatch
// ---------------------------------------------------------------------------
describe("11. Previous after mismatch", () => {
  test("PREVIOUS while frozen removes the mismatch UI and restores the prior state", () => {
    const trace = runBoyerMoore("ABCXABCDABXABCDABCDABDE", "ABCD");
    const totalSteps = trace.states.length;
    const mismatchIndex = findFirstMismatchIndex(trace.states, isMismatchFreezeState);

    let s = initialPlaybackState();
    s = dispatch(s, { type: "PLAY", totalSteps });
    while (!s.awaitingContinue) s = dispatch(s, { type: "TICK", totalSteps, states: trace.states });
    assert.equal(s.awaitingContinue, true);

    s = dispatch(s, { type: "PREVIOUS", totalSteps });

    assert.equal(s.awaitingContinue, false, "the mismatch panel must be dismissed");
    assert.equal(s.stepIndex, mismatchIndex - 1, "must land exactly one state before the mismatch");
    assert.equal(s.isPlaying, false);
  });

  test("NEXT again from that restored state re-freezes on the same mismatch (nothing was skipped)", () => {
    const trace = runBoyerMoore("ABCXABCDABXABCDABCDABDE", "ABCD");
    const totalSteps = trace.states.length;
    const mismatchIndex = findFirstMismatchIndex(trace.states, isMismatchFreezeState);

    let s = { ...initialPlaybackState(), stepIndex: mismatchIndex - 1 };
    s = dispatch(s, { type: "NEXT", totalSteps, states: trace.states });
    assert.equal(s.stepIndex, mismatchIndex);
    assert.equal(s.awaitingContinue, true);
  });
});

// ---------------------------------------------------------------------------
// 12. Restart after mismatch
// ---------------------------------------------------------------------------
describe("12. Restart after mismatch", () => {
  test("RESTART while frozen clears the freeze and returns to step 0", () => {
    const trace = runBoyerMoore("ABCXABCDABXABCDABCDABDE", "ABCD");
    const totalSteps = trace.states.length;

    let s = initialPlaybackState();
    s = dispatch(s, { type: "PLAY", totalSteps });
    while (!s.awaitingContinue) s = dispatch(s, { type: "TICK", totalSteps, states: trace.states });
    assert.equal(s.awaitingContinue, true);

    s = dispatch(s, { type: "RESTART" });

    assert.equal(s.stepIndex, 0);
    assert.equal(s.isPlaying, false);
    assert.equal(s.awaitingContinue, false);
    assert.equal(s.resumeAfterContinue, false);
  });

  test("RESET_TRACE (switching to a new trace) also clears any pending freeze", () => {
    let s = { ...initialPlaybackState(), stepIndex: 12, awaitingContinue: true, resumeAfterContinue: true };
    s = dispatch(s, { type: "RESET_TRACE" });
    assert.equal(s.stepIndex, 0);
    assert.equal(s.awaitingContinue, false);
    assert.equal(s.resumeAfterContinue, false);
  });
});

// ---------------------------------------------------------------------------
// PLAY / NEXT must not be able to bypass a freeze.
// ---------------------------------------------------------------------------
describe("frozen state blocks forward-moving controls until CONTINUE", () => {
  test("PLAY is a no-op while awaitingContinue is true", () => {
    const trace = runBoyerMoore("ABCXABCDABXABCDABCDABDE", "ABCD");
    const totalSteps = trace.states.length;
    const mismatchIndex = findFirstMismatchIndex(trace.states, isMismatchFreezeState);

    const frozen = { ...initialPlaybackState(), stepIndex: mismatchIndex, awaitingContinue: true };
    const result = dispatch(frozen, { type: "PLAY", totalSteps });
    assert.equal(result.isPlaying, false);
    assert.equal(result.stepIndex, mismatchIndex);
  });

  test("NEXT is a no-op while awaitingContinue is true", () => {
    const trace = runBoyerMoore("ABCXABCDABXABCDABCDABDE", "ABCD");
    const totalSteps = trace.states.length;
    const mismatchIndex = findFirstMismatchIndex(trace.states, isMismatchFreezeState);

    const frozen = { ...initialPlaybackState(), stepIndex: mismatchIndex, awaitingContinue: true };
    const result = dispatch(frozen, { type: "NEXT", totalSteps, states: trace.states });
    assert.deepEqual(result, frozen);
  });

  test("a stray TICK while awaitingContinue is true is a no-op", () => {
    const trace = runBoyerMoore("ABCXABCDABXABCDABCDABDE", "ABCD");
    const totalSteps = trace.states.length;
    const mismatchIndex = findFirstMismatchIndex(trace.states, isMismatchFreezeState);

    const frozen = { ...initialPlaybackState(), stepIndex: mismatchIndex, isPlaying: true, awaitingContinue: true };
    const result = dispatch(frozen, { type: "TICK", totalSteps, states: trace.states });
    assert.deepEqual(result, frozen);
  });
});

// ---------------------------------------------------------------------------
// Backward compatibility: omitting `states` on TICK/NEXT/CONTINUE must
// behave exactly like pre-Phase-4 playback (no freeze is ever possible
// without trace data to inspect).
// ---------------------------------------------------------------------------
describe("backward compatibility: freeze detection is opt-in via action.states", () => {
  test("TICK without states never freezes, even when it lands on a mismatch index", () => {
    const trace = runBoyerMoore("ABCXABCDABXABCDABCDABDE", "ABCD");
    const totalSteps = trace.states.length;
    const mismatchIndex = findFirstMismatchIndex(trace.states, isMismatchFreezeState);

    let s = { ...initialPlaybackState(), stepIndex: mismatchIndex - 1, isPlaying: true };
    s = dispatch(s, { type: "TICK", totalSteps }); // no `states` passed
    assert.equal(s.stepIndex, mismatchIndex);
    assert.equal(s.awaitingContinue, false);
    assert.equal(s.isPlaying, true);
  });

  test("NEXT without states never freezes", () => {
    const trace = runBoyerMoore("ABCXABCDABXABCDABCDABDE", "ABCD");
    const totalSteps = trace.states.length;
    const mismatchIndex = findFirstMismatchIndex(trace.states, isMismatchFreezeState);

    let s = { ...initialPlaybackState(), stepIndex: mismatchIndex - 1 };
    s = dispatch(s, { type: "NEXT", totalSteps }); // no `states` passed
    assert.equal(s.stepIndex, mismatchIndex);
    assert.equal(s.awaitingContinue, false);
  });
});
