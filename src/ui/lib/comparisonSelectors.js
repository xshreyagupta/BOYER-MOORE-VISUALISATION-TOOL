/**
 * PHASE 5 -- 1 / 2 / 3 Screen Comparison Mode.
 *
 * Pure, framework-agnostic helpers that let several algorithm runs (each
 * with its own, possibly different-length, execution trace) share ONE
 * playback timeline. Nothing here duplicates playback logic -- it only
 * maps a single shared `stepIndex` onto each panel's own trace, reusing
 * `clampStepIndex` from playbackLogic.js (the same clamp Phase 3/4 already
 * rely on) so a panel whose trace finishes early simply stays clamped to
 * its own last state instead of ever being read out of bounds.
 *
 * Design notes:
 * - There is still exactly one playbackReducer / one usePlayback instance
 *   driving the whole comparison view (see useComparisonPlayback.js).
 * - Phase 4's mismatch freeze is keyed off Full Boyer-Moore specifically
 *   (only `runBoyerMoore` ever emits a state with *both* badCharacterShift
 *   and goodSuffixShift populated -- see playbackLogic.isMismatchFreezeState
 *   and badCharacter.js/goodSuffix.js, which each only ever populate their
 *   own single shift field). So the shared reducer's freeze detection is
 *   driven by a synthetic "projected Full BM" states array: one entry per
 *   shared step, each entry being Full BM's own state at that shared step
 *   (clamped to Full BM's own trace length). If Full Boyer-Moore isn't one
 *   of the panels currently on screen, that array is all `null` and no
 *   freeze can ever trigger -- matching the existing "no states -> no
 *   freeze possible" contract playbackLogic already documents.
 */

import { ALGORITHMS } from "../../engine/index.js";
import { clampStepIndex } from "./playbackLogic.js";

/** The three fixed 2-screen combinations Phase 5 allows. */
export const ALGORITHM_PAIRS = Object.freeze([
  {
    id: "bad-character+good-suffix",
    label: "Bad Character + Good Suffix",
    algorithms: [ALGORITHMS.BAD_CHARACTER, ALGORITHMS.GOOD_SUFFIX],
  },
  {
    id: "bad-character+full",
    label: "Bad Character + Full Boyer-Moore",
    algorithms: [ALGORITHMS.BAD_CHARACTER, ALGORITHMS.FULL],
  },
  {
    id: "good-suffix+full",
    label: "Good Suffix + Full Boyer-Moore",
    algorithms: [ALGORITHMS.GOOD_SUFFIX, ALGORITHMS.FULL],
  },
]);

/** The single fixed 3-screen combination, in display order. */
export const ALL_THREE_ALGORITHMS = Object.freeze([
  ALGORITHMS.BAD_CHARACTER,
  ALGORITHMS.GOOD_SUFFIX,
  ALGORITHMS.FULL,
]);

export const DEFAULT_PAIR_ID = ALGORITHM_PAIRS[1].id; // Bad Character + Full

export function getPairById(pairId) {
  return ALGORITHM_PAIRS.find((p) => p.id === pairId) ?? ALGORITHM_PAIRS[0];
}

/**
 * The longest trace among the currently visible panels defines the shared
 * comparison timeline. Zero panels (shouldn't happen, but defensively) or
 * all-empty traces (e.g. every panel errored) yield 0, same convention
 * `totalSteps <= 0` already uses everywhere else in playbackLogic.
 *
 * @param {Array<{states: Array}>} panelResults  each panel's trace-run result
 * @returns {number}
 */
export function computeSharedTotalSteps(panelResults) {
  let max = 0;
  for (const { states } of panelResults) {
    if (states.length > max) max = states.length;
  }
  return max;
}

/**
 * Maps a shared-timeline step onto one panel's own execution-trace state.
 * A panel with fewer steps than the shared timeline simply stays clamped
 * to its own final state once the shared index runs past its length --
 * this is the "keep it at its final state, never access an invalid trace
 * index" requirement. A panel with zero states (e.g. validation error)
 * always reads as null.
 *
 * @param {Array} states          one panel's result.states
 * @param {number} sharedStepIndex
 * @returns {object|null}
 */
export function getPanelState(states, sharedStepIndex) {
  if (!states || states.length === 0) return null;
  return states[clampStepIndex(sharedStepIndex, states.length)];
}

/**
 * Builds the synthetic "Full BM projected onto the shared timeline" states
 * array the shared playbackReducer uses for Phase 4 freeze detection (see
 * module doc above). Always exactly `sharedTotalSteps` entries long, so it
 * can be handed straight to usePlayback/playbackReducer in place of a
 * single trace's `states` array with no further adaptation needed there.
 *
 * @param {Array<{algorithm: string, states: Array}>} panelResults
 * @param {number} sharedTotalSteps
 * @returns {Array<object|null>}
 */
export function buildFreezeDrivingStates(panelResults, sharedTotalSteps) {
  const fullPanel = panelResults.find((p) => p.algorithm === ALGORITHMS.FULL);
  const fullStates = fullPanel ? fullPanel.states : [];
  const driving = new Array(sharedTotalSteps);
  for (let k = 0; k < sharedTotalSteps; k++) {
    driving[k] = fullStates.length > 0 ? fullStates[clampStepIndex(k, fullStates.length)] : null;
  }
  return driving;
}
