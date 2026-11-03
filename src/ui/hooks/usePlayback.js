import { useCallback, useEffect, useReducer } from "react";
import {
  playbackReducer,
  initialPlaybackState,
  isAtStart,
  isAtEnd,
  intervalMsForSpeed,
} from "../lib/playbackLogic.js";

/**
 * Drives a `stepIndex` through an already-computed execution trace
 * (`states`, e.g. result.states from the Phase 1 engine, or a student
 * trace from src/pseudocode/executionTrace.js).
 *
 * This hook is a thin wrapper around `playbackReducer` in
 * src/ui/lib/playbackLogic.js plus a timer -- it does not duplicate any
 * of that logic itself. First/Previous/Play/Pause/Next/Last/Restart/
 * Speed/Continue/GoTo all dispatch straight into the single shared
 * reducer, so behavior is identical everywhere this hook is used
 * (the main visualizer via useComparisonPlayback, and the Practice Lab's
 * StudentExecutionLab).
 *
 * PHASE 4 -- Mismatch Freeze / Shift Race / Continue
 * ---------------------------------------------------
 * When `states` is supplied (it always is here), TICK and NEXT freeze
 * (`awaitingContinue: true`) instead of landing past a Full Boyer-Moore
 * mismatch state; `continueFromMismatch` is the only action that can move
 * off of it.
 *
 * PHASE 13 -- GO TO ERROR
 * ------------------------
 * `actions.goTo(index)` jumps straight to a specific trace step (used by
 * WritePseudocode's "GO TO ERROR" button via StudentExecutionLab). It
 * stops any auto-play, dismisses a pending freeze, and clamps the target
 * index into the valid trace range.
 *
 * @param {object} args
 * @param {object[]} args.states  the current trace's states array
 * @param {*} args.resetKey       changes whenever a brand-new trace should
 *                                be shown; resets to step 0 and stops
 *                                playback.
 */
export function usePlayback({ states, resetKey }) {
  const [state, dispatch] = useReducer(playbackReducer, undefined, initialPlaybackState);
  const { stepIndex, isPlaying, speed, awaitingContinue } = state;
  const totalSteps = states.length;

  useEffect(() => {
    dispatch({ type: "RESET_TRACE" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (!isPlaying || totalSteps <= 0) return undefined;
    const id = setInterval(() => {
      dispatch({ type: "TICK", totalSteps, states });
    }, intervalMsForSpeed(speed));
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, speed, totalSteps, states]);

  const first = useCallback(() => dispatch({ type: "FIRST" }), []);
  const previous = useCallback(() => dispatch({ type: "PREVIOUS", totalSteps }), [totalSteps]);
  const next = useCallback(() => dispatch({ type: "NEXT", totalSteps, states }), [totalSteps, states]);
  const last = useCallback(() => dispatch({ type: "LAST", totalSteps }), [totalSteps]);
  const play = useCallback(() => dispatch({ type: "PLAY", totalSteps }), [totalSteps]);
  const pause = useCallback(() => dispatch({ type: "PAUSE" }), []);
  const restart = useCallback(() => dispatch({ type: "RESTART" }), []);
  const setSpeed = useCallback((newSpeed) => dispatch({ type: "SET_SPEED", speed: newSpeed }), []);
  const continueFromMismatch = useCallback(
    () => dispatch({ type: "CONTINUE", totalSteps, states }),
    [totalSteps, states]
  );
  const goTo = useCallback((index) => dispatch({ type: "GOTO", index, totalSteps }), [totalSteps]);

  return {
    stepIndex,
    isPlaying,
    speed,
    setSpeed,
    atStart: isAtStart(stepIndex),
    atEnd: isAtEnd(stepIndex, totalSteps),
    totalSteps,
    awaitingContinue,
    actions: { first, previous, next, last, play, pause, restart, continueFromMismatch, goTo },
  };
}
