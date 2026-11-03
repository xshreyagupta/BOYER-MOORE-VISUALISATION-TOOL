/**
 * Pure, framework-agnostic helpers that translate a single execution-trace
 * state (see src/engine/executionTrace.js) into per-cell visual statuses.
 * Kept separate from the components so TextRenderer and PatternRenderer
 * derive their highlighting from exactly the same rules.
 */

/**
 * Returns the list of pattern-start indices that have been confirmed as
 * full matches by the time `upToStep` (inclusive) has been reached. Used
 * to render permanent "confirmed match" highlighting in the text even
 * after the algorithm has moved on to later alignments.
 *
 * @param {Array} states  full states array from a trace-run result
 * @param {number} upToStep  index into `states` of the current step
 * @returns {number[]} start indices (into text) of confirmed matches
 */
export function getConfirmedMatches(states, upToStep) {
  const confirmed = [];
  for (let k = 0; k <= upToStep && k < states.length; k++) {
    const s = states[k];
    if (s.phase === "found" && s.matchIndex !== null) {
      confirmed.push(s.matchIndex);
    }
  }
  return confirmed;
}

/**
 * @param {number} textIndex
 * @param {number} patternLength
 * @param {number[]} confirmedMatches
 */
function isInsideConfirmedMatch(textIndex, patternLength, confirmedMatches) {
  return confirmedMatches.some((m) => textIndex >= m && textIndex < m + patternLength);
}

/**
 * PHASE 7 -- the trace state immediately before `currentIndex`, used by the
 * Live Variables panel to detect which variables just changed. Returns
 * null at the very first state (nothing to compare against) or when
 * `states` is empty; otherwise clamps into range the same way every other
 * state lookup in this file does, so a panel that has finished early never
 * reads out of bounds.
 *
 * @param {Array} states  a single panel's result.states
 * @param {number} currentIndex  that panel's own (already-clamped) step index
 * @returns {object|null}
 */
export function getPreviousState(states, currentIndex) {
  if (!states || states.length === 0 || currentIndex <= 0) return null;
  const idx = Math.min(currentIndex - 1, states.length - 1);
  return states[idx] ?? null;
}

/**
 * Status for a single text character cell at `textIndex`, given the
 * current execution state.
 *
 * @param {object} state           current trace state (or null)
 * @param {number} textIndex
 * @param {number} patternLength
 * @param {number[]} confirmedMatches
 * @returns {"confirmed"|"active"|"match"|"mismatch"|"settled"|"idle"|"dim"}
 */
export function getTextCellStatus(state, textIndex, patternLength, confirmedMatches) {
  if (isInsideConfirmedMatch(textIndex, patternLength, confirmedMatches)) {
    return "confirmed";
  }
  if (!state) return "dim";

  const { phase, alignment: s, j, i, comparisonResult } = state;

  if (phase === "done") return "dim";

  const windowStart = s;
  const windowEnd = s + patternLength - 1;
  const inWindow = textIndex >= windowStart && textIndex <= windowEnd;
  if (!inWindow) return "dim";

  if ((phase === "compare" || phase === "mismatch") && i === textIndex) {
    if (comparisonResult === "match") return "match";
    if (comparisonResult === "mismatch") return "mismatch";
    return "active";
  }

  if (phase === "found") return "match";

  if ((phase === "compare" || phase === "mismatch") && j !== null) {
    const patternIndexForThisCell = textIndex - s;
    if (patternIndexForThisCell > j) return "settled";
  }

  return "idle";
}

/**
 * Status for a single pattern character cell at `patternIndex`, given the
 * current execution state. The pattern track itself is positioned by the
 * caller (translateX by alignment); this only decides per-cell color.
 *
 * @param {object} state  current trace state (or null)
 * @param {number} patternIndex
 * @returns {"active"|"match"|"mismatch"|"settled"|"idle"}
 */
export function getPatternCellStatus(state, patternIndex) {
  if (!state) return "idle";
  const { phase, j, comparisonResult } = state;

  if (phase === "start") return "idle";
  if (phase === "done") return "idle";
  if (phase === "found") return "match";

  if ((phase === "compare" || phase === "mismatch") && j !== null) {
    if (patternIndex === j) {
      if (comparisonResult === "match") return "match";
      if (comparisonResult === "mismatch") return "mismatch";
      return "active";
    }
    if (patternIndex > j) return "settled";
    return "idle";
  }

  return "idle";
}
