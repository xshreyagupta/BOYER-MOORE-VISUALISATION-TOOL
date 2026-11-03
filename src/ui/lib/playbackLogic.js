/**
 * Pure playback-index arithmetic, deliberately kept free of React so it can
 * be unit tested the same way the algorithms are (node:test, no DOM). The
 * `usePlayback` hook is a thin wrapper around these functions plus a timer;
 * it does not duplicate any of this logic itself.
 *
 * Playback never re-runs the algorithm -- it only moves an index into the
 * already-computed `states` array produced by the engine (see
 * src/engine/executionTrace.js). All functions here operate on
 * `totalSteps` (states.length) and a `stepIndex`, nothing else.
 *
 * PHASE 4 -- Mismatch Freeze / Shift Race / Continue
 * ---------------------------------------------------
 * Full Boyer-Moore mismatch states carry both `badCharacterShift` and
 * `goodSuffixShift` (see src/algorithms/boyerMoore.js). Whenever playback
 * lands on such a state -- via an automatic TICK or a manual NEXT -- it
 * must freeze there (`awaitingContinue: true`) until the user explicitly
 * dispatches CONTINUE, at which point playback advances exactly one more
 * state using the trace's own `chosenShift`/next alignment (already baked
 * into the trace; nothing here recomputes a shift). This never introduces
 * a second playback system: freezing/continuing are just additional
 * transitions inside the same `playbackReducer`, gated behind an optional
 * `states` array passed in on the relevant actions. Callers (existing
 * tests) that never pass `states` see byte-for-byte the same behavior as
 * before Phase 4 -- freeze detection only activates when `action.states`
 * is supplied.
 */

export const SPEEDS = Object.freeze([0.5, 1, 1.5, 2]);
export const DEFAULT_SPEED = 1;

/** Base interval, in ms, between auto-advanced steps at 1x speed. */
export const BASE_INTERVAL_MS = 900;

/**
 * Clamps an index into the valid range for a trace of `totalSteps` states.
 * A trace with zero states clamps everything to 0.
 */
export function clampStepIndex(index, totalSteps) {
  if (totalSteps <= 0) return 0;
  return Math.min(Math.max(index, 0), totalSteps - 1);
}

export function stepFirst() {
  return 0;
}

export function stepLast(totalSteps) {
  return totalSteps > 0 ? totalSteps - 1 : 0;
}

export function stepPrevious(index, totalSteps) {
  return clampStepIndex(index - 1, totalSteps);
}

export function stepNext(index, totalSteps) {
  return clampStepIndex(index + 1, totalSteps);
}

export function isAtStart(index) {
  return index <= 0;
}

export function isAtEnd(index, totalSteps) {
  return totalSteps <= 0 || index >= totalSteps - 1;
}

/**
 * Computes the result of a single automatic playback tick.
 * Returns the new index plus whether playback should stop because the
 * trace's final state has now been reached.
 *
 * @param {number} index       current step index
 * @param {number} totalSteps  result.states.length
 * @returns {{ index: number, done: boolean }}
 */
export function advanceOneStep(index, totalSteps) {
  if (totalSteps <= 0) return { index: 0, done: true };
  const next = index + 1;
  if (next >= totalSteps - 1) {
    return { index: stepLast(totalSteps), done: true };
  }
  return { index: next, done: false };
}

/**
 * Converts a playback speed multiplier into an interval duration in ms.
 * Only affects timing -- never touches which step is shown.
 */
export function intervalMsForSpeed(speed, baseIntervalMs = BASE_INTERVAL_MS) {
  return baseIntervalMs / speed;
}

/**
 * True when `state` is a Full Boyer-Moore mismatch state that must freeze
 * playback -- i.e. a mismatch where *both* heuristics proposed a shift, so
 * there is a genuine Bad Character vs. Good Suffix comparison to show. The
 * single-heuristic modes (Bad Character only / Good Suffix only) also emit
 * `phase: "mismatch"` states, but with only one of the two shift fields
 * populated -- those have nothing to race and never freeze.
 *
 * Deliberately duck-typed on the two shift fields rather than importing
 * PHASES/WINNERS from the engine, so this module keeps its existing
 * zero-dependency, plain-data contract (states are just plain objects here).
 *
 * @param {object|null|undefined} state  a single execution-trace state
 * @returns {boolean}
 */
export function isMismatchFreezeState(state) {
  return (
    !!state &&
    state.phase === "mismatch" &&
    state.badCharacterShift !== null &&
    state.badCharacterShift !== undefined &&
    state.goodSuffixShift !== null &&
    state.goodSuffixShift !== undefined
  );
}

/**
 * The complete playback state: an index into an existing execution trace,
 * whether it's auto-advancing, and at what speed. Nothing here ever
 * touches algorithm/trace data itself.
 *
 * `awaitingContinue` is true while playback is frozen at a Full
 * Boyer-Moore mismatch, waiting for the user to press CONTINUE.
 * `resumeAfterContinue` remembers whether playback was actively auto-
 * advancing (PLAY) at the moment it froze, so CONTINUE knows whether to
 * resume auto-play or simply step forward once and stay paused.
 *
 * @typedef {{
 *   stepIndex: number,
 *   isPlaying: boolean,
 *   speed: number,
 *   awaitingContinue: boolean,
 *   resumeAfterContinue: boolean,
 * }} PlaybackState
 */

export function initialPlaybackState(speed = DEFAULT_SPEED) {
  return { stepIndex: 0, isPlaying: false, speed, awaitingContinue: false, resumeAfterContinue: false };
}

/**
 * Pure reducer driving every playback control. This is the single source
 * of truth for what each button does; the `usePlayback` hook dispatches
 * into this reducer via useReducer rather than re-implementing any of
 * this logic itself, and this module's tests exercise it directly.
 *
 * Action shapes:
 *   { type: "FIRST" }
 *   { type: "PREVIOUS", totalSteps }
 *   { type: "NEXT", totalSteps, states? }
 *   { type: "LAST", totalSteps }
 *   { type: "PLAY", totalSteps }
 *   { type: "PAUSE" }
 *   { type: "RESTART" }
 *   { type: "SET_SPEED", speed }
 *   { type: "TICK", totalSteps, states? } -- one automatic playback advance
 *   { type: "CONTINUE", totalSteps, states? } -- dismiss a mismatch freeze
 *   { type: "RESET_TRACE" }               -- a brand new trace was run
 *   { type: "GOTO", index, totalSteps }   -- jump straight to a specific
 *                                            step (PHASE 13 "GO TO ERROR")
 *
 * `states` (the full execution-trace states array) is optional on NEXT/
 * TICK/CONTINUE. When omitted, these actions behave exactly as they did
 * before Phase 4 (no freeze detection is possible without the trace data
 * to inspect) -- this keeps every pre-Phase-4 caller/test unaffected.
 * When provided, TICK and NEXT freeze (`awaitingContinue: true`) instead
 * of landing past a Full Boyer-Moore mismatch state, and CONTINUE is the
 * only action that can move off of it.
 *
 * @param {PlaybackState} state
 * @param {object} action
 * @returns {PlaybackState}
 */
export function playbackReducer(state, action) {
  switch (action.type) {
    case "FIRST":
      // Stepping to the very first state always leaves any freeze behind.
      return { ...state, isPlaying: false, stepIndex: stepFirst(), awaitingContinue: false, resumeAfterContinue: false };

    case "PREVIOUS":
      // Rewinding always dismisses the mismatch panel -- the student is
      // reviewing an earlier moment, not deciding the pending shift.
      return {
        ...state,
        isPlaying: false,
        stepIndex: stepPrevious(state.stepIndex, action.totalSteps),
        awaitingContinue: false,
        resumeAfterContinue: false,
      };

    case "NEXT": {
      // Already frozen: NEXT must not silently step past the pending
      // decision -- only CONTINUE may do that.
      if (state.awaitingContinue) return state;
      const nextIndex = stepNext(state.stepIndex, action.totalSteps);
      const landedState = action.states ? action.states[nextIndex] : null;
      const freeze = isMismatchFreezeState(landedState);
      return {
        ...state,
        isPlaying: false,
        stepIndex: nextIndex,
        awaitingContinue: freeze,
        resumeAfterContinue: false,
      };
    }

    case "LAST":
      return { ...state, isPlaying: false, stepIndex: stepLast(action.totalSteps), awaitingContinue: false, resumeAfterContinue: false };

    case "PLAY":
      // Can't auto-advance out of a freeze -- the student must press
      // CONTINUE, which is the only thing allowed to apply the shift.
      if (state.awaitingContinue) return state;
      if (action.totalSteps <= 0 || isAtEnd(state.stepIndex, action.totalSteps)) return state;
      return { ...state, isPlaying: true };

    case "PAUSE":
      return { ...state, isPlaying: false };

    case "RESTART":
      return { ...state, isPlaying: false, stepIndex: 0, awaitingContinue: false, resumeAfterContinue: false };

    case "SET_SPEED":
      // Speed only affects timing (see intervalMsForSpeed) -- stepIndex
      // and isPlaying are untouched.
      return { ...state, speed: action.speed };

    case "TICK": {
      // Should never fire while frozen (the hook tears down the auto-play
      // interval the instant awaitingContinue becomes true), but guard
      // anyway so a stray TICK can never sneak past an unresolved freeze.
      if (state.awaitingContinue) return state;

      const { index, done } = advanceOneStep(state.stepIndex, action.totalSteps);
      const landedState = action.states ? action.states[index] : null;

      if (isMismatchFreezeState(landedState)) {
        // Freeze exactly on the mismatch state. Remember that playback
        // was actively running so CONTINUE can resume it automatically.
        return { ...state, stepIndex: index, isPlaying: false, awaitingContinue: true, resumeAfterContinue: true };
      }

      return { ...state, stepIndex: index, isPlaying: done ? false : state.isPlaying, awaitingContinue: false };
    }

    case "CONTINUE": {
      // No-op if there is nothing to continue from -- CONTINUE only ever
      // does something while frozen.
      if (!state.awaitingContinue) return state;

      const { index, done } = advanceOneStep(state.stepIndex, action.totalSteps);
      const landedState = action.states ? action.states[index] : null;
      const freezeAgain = isMismatchFreezeState(landedState);

      return {
        ...state,
        stepIndex: index,
        awaitingContinue: freezeAgain,
        // Only resume auto-play if it was running before the freeze, we
        // didn't just land at the trace's end, and we didn't immediately
        // land on another mismatch that itself needs a decision.
        isPlaying: state.resumeAfterContinue && !done && !freezeAgain,
        resumeAfterContinue: freezeAgain ? state.resumeAfterContinue : false,
      };
    }

    case "RESET_TRACE":
      return { ...state, isPlaying: false, stepIndex: 0, awaitingContinue: false, resumeAfterContinue: false };

    case "GOTO":
      // Jumping straight to a specific step (PHASE 13 "GO TO ERROR") is a
      // direct navigation, exactly like FIRST/PREVIOUS/LAST: it stops any
      // auto-play and always leaves a pending mismatch freeze behind, since
      // the student is jumping to review a specific moment, not deciding
      // the shift a freeze is waiting on. The target index is clamped into
      // range so an out-of-range or stale step number never breaks
      // playback.
      return {
        ...state,
        isPlaying: false,
        stepIndex: clampStepIndex(action.index, action.totalSteps),
        awaitingContinue: false,
        resumeAfterContinue: false,
      };

    default:
      return state;
  }
}
