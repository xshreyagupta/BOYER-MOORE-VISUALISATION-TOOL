import { useCallback, useEffect } from "react";
import { useReducer } from "react";
import {
  playbackReducer,
  initialPlaybackState,
  isAtStart,
  isAtEnd,
  intervalMsForSpeed,
} from "../lib/playbackLogic.js";

/**
 * Drives a `stepIndex` through an already-computed preprocessing trace
 * (traceBadCharacter / traceGoodSuffix -- src/algorithms/preprocessingTrace.js).
 *
 * This is deliberately the table-construction sibling of usePlayback.js
 * (src/ui/hooks/usePlayback.js): both are thin wrappers around the exact
 * same `playbackReducer` in src/ui/lib/playbackLogic.js, so
 * First/Previous/Play/Pause/Next/Last/Restart/Speed behave identically in
 * the Preprocessing Lab as they do in the search visualizer -- there is
 * only one playback engine in the project.
 *
 * Preprocessing traces have no "mismatch freeze" concept, so `states`
 * (table-construction steps) never trip `isMismatchFreezeState` --
 * `awaitingContinue` stays false throughout and every action always moves.
 *
 * @param {object} args
 * @param {object[]} args.steps    the current trace's `steps` array
 * @param {*} args.resetKey        changes whenever a brand-new trace should
 *                                 be shown (new pattern, or switching
 *                                 between Bad Character / Good Suffix);
 *                                 resets to step 0 and stops playback.
 */
export function useTablePlayback({ steps, resetKey }) {
  const [state, dispatch] = useReducer(playbackReducer, undefined, initialPlaybackState);
  const { stepIndex, isPlaying, speed } = state;
  const totalSteps = steps.length;

  useEffect(() => {
    dispatch({ type: "RESET_TRACE" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (!isPlaying || totalSteps <= 0) return undefined;
    const id = setInterval(() => {
      dispatch({ type: "TICK", totalSteps });
    }, intervalMsForSpeed(speed));
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, speed, totalSteps]);

  const first = useCallback(() => dispatch({ type: "FIRST" }), []);
  const previous = useCallback(() => dispatch({ type: "PREVIOUS", totalSteps }), [totalSteps]);
  const next = useCallback(() => dispatch({ type: "NEXT", totalSteps }), [totalSteps]);
  const last = useCallback(() => dispatch({ type: "LAST", totalSteps }), [totalSteps]);
  const play = useCallback(() => dispatch({ type: "PLAY", totalSteps }), [totalSteps]);
  const pause = useCallback(() => dispatch({ type: "PAUSE" }), []);
  const restart = useCallback(() => dispatch({ type: "RESTART" }), []);
  const setSpeed = useCallback((newSpeed) => dispatch({ type: "SET_SPEED", speed: newSpeed }), []);

  return {
    stepIndex,
    isPlaying,
    speed,
    setSpeed,
    atStart: isAtStart(stepIndex),
    atEnd: isAtEnd(stepIndex, totalSteps),
    totalSteps,
    awaitingContinue: false,
    actions: { first, previous, next, last, play, pause, restart },
  };
}
