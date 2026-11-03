/**
 * PHASE 7 -- pure, framework-agnostic helpers for the pseudocode panel and
 * live variable tracker. Mirrors the role traceSelectors.js /
 * preprocessingSelectors.js already play: every displayed value is derived
 * here from real data (a trace state's `variables` object, or the
 * pseudocode data in ./data/pseudocode.js), never invented by a component.
 */

import { getSearchPseudocode, getPreprocessingPseudocode } from "../data/pseudocode.js";

/**
 * Names of variables that differ between two `variables` snapshots (or are
 * new in `currentVariables`), used to briefly highlight changed values in
 * the Live Variables panel. Order follows `currentVariables`'s own key
 * order. A `null`/`undefined` `previousVariables` (first step of a trace,
 * or nothing selected yet) means every present variable counts as changed
 * -- there's nothing to compare against, so nothing should look "settled".
 *
 * Comparison is by value equality (`!==`), which is sufficient here: every
 * variable snapshot on a trace state is a plain primitive (number, string,
 * or null) -- see executionTrace.js / preprocessingTrace.js -- never an
 * object or array that would need a deep comparison.
 *
 * @param {object|null|undefined} previousVariables
 * @param {object|null|undefined} currentVariables
 * @returns {string[]}
 */
export function getChangedVariableKeys(previousVariables, currentVariables) {
  const current = currentVariables ?? {};
  if (!previousVariables) return Object.keys(current);
  return Object.keys(current).filter((key) => current[key] !== previousVariables[key]);
}

/**
 * Formats a single variable value for display. Shared by every place a
 * variable snapshot is rendered so a number, string, null, or array always
 * looks the same regardless of which panel renders it.
 *
 * @param {*} value
 * @returns {string}
 */
export function formatVariableValue(value) {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  if (typeof value === "string") return `'${value}'`;
  return String(value);
}

/**
 * @param {object|null|undefined} variables
 * @returns {Array<[string, *]>} entries with undefined values filtered out
 */
export function getVariableEntries(variables) {
  return Object.entries(variables ?? {}).filter(([, v]) => v !== undefined);
}

/**
 * Looks up the pseudocode line list + per-line notes for either a search
 * algorithm ("bad-character" | "good-suffix" | "full") or a preprocessing
 * algorithm ("bad-character" | "good-suffix", table-building pseudocode).
 *
 * @param {"search"|"preprocessing"} kind
 * @param {string} algorithm
 * @returns {{title: string, lines: Array, lineNotes: object}|null}
 */
export function getPseudocodeFor(kind, algorithm) {
  return kind === "preprocessing" ? getPreprocessingPseudocode(algorithm) : getSearchPseudocode(algorithm);
}

/**
 * The student-facing "what is this line doing?" note for one line of a
 * pseudocode block, or null if there's no note (or no such line).
 *
 * @param {{lineNotes: object}|null} pseudocode  result of getPseudocodeFor
 * @param {number|null} lineNumber
 * @returns {string|null}
 */
export function getLineNote(pseudocode, lineNumber) {
  if (!pseudocode || lineNumber === null || lineNumber === undefined) return null;
  return pseudocode.lineNotes[lineNumber] ?? null;
}
