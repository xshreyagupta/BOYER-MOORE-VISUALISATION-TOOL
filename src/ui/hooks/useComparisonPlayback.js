import { useMemo } from "react";
import { usePlayback } from "./usePlayback.js";
import { getConfirmedMatches, getPreviousState } from "../lib/traceSelectors.js";
import {
  computeSharedTotalSteps,
  getPanelState,
  buildFreezeDrivingStates,
} from "../lib/comparisonSelectors.js";

/**
 * PHASE 5 -- drives 1, 2, or 3 comparison panels off a SINGLE shared
 * playback timeline. This does not introduce a second playback engine:
 * it calls the exact same `usePlayback` hook Phase 3/4 already use, just
 * fed a synthetic `states` array (see comparisonSelectors.buildFreezeDrivingStates)
 * whose length IS the shared timeline length and whose freeze-detectable
 * entries come from whichever panel is Full Boyer-Moore, if any.
 *
 * @param {Array<{algorithm: string, states: Array, text: string, pattern: string}>} panelResults
 *   one trace-run result per currently visible panel (1-3 of them)
 * @param {*} resetKey  bump whenever a genuinely new comparison should
 *                       reset to step 0 (new Run, or the set of visible
 *                       algorithms changed) -- forwarded straight to
 *                       usePlayback's own resetKey.
 */
export function useComparisonPlayback({ panelResults, resetKey }) {
  const sharedTotalSteps = useMemo(() => computeSharedTotalSteps(panelResults), [panelResults]);

  const drivingStates = useMemo(
    () => buildFreezeDrivingStates(panelResults, sharedTotalSteps),
    [panelResults, sharedTotalSteps]
  );

  const playback = usePlayback({ states: drivingStates, resetKey });
  const { stepIndex } = playback;

  // Per-panel view: each panel's own state/confirmed-matches at the shared
  // step, safely clamped to that panel's own trace length -- a panel that
  // finished earlier just keeps reporting its own final state.
  const panelViews = useMemo(
    () =>
      panelResults.map((panel) => {
        const panelState = getPanelState(panel.states, stepIndex);
        const clampedIndex =
          panel.states.length > 0 ? Math.min(stepIndex, panel.states.length - 1) : 0;
        return {
          algorithm: panel.algorithm,
          result: panel,
          state: panelState,
          // PHASE 7 -- the state one step before this panel's own current
          // step, so the Live Variables panel can tell which variables
          // just changed. Derived the same way `state` itself is: from
          // this panel's own states array, clamped to its own length.
          previousState: getPreviousState(panel.states, clampedIndex),
          confirmedMatches: getConfirmedMatches(panel.states, clampedIndex),
          ownStepIndex: clampedIndex,
          ownTotalSteps: panel.states.length,
          finishedEarly: panel.states.length > 0 && stepIndex > panel.states.length - 1,
        };
      }),
    [panelResults, stepIndex]
  );

  // The mismatch panel (Phase 4) always reads off the driving (Full BM)
  // state directly -- it's the only state shape that ever carries both
  // shift fields.
  const freezeState = drivingStates.length > 0 ? drivingStates[Math.min(stepIndex, drivingStates.length - 1)] : null;

  return { playback, panelViews, freezeState, sharedTotalSteps };
}
