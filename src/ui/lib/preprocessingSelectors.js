/**
 * Pure, framework-agnostic helpers that translate a (preprocessing trace,
 * stepIndex) pair into view props for the Preprocessing Lab components.
 * Mirrors the role traceSelectors.js plays for the search visualizer:
 * every displayed value is derived here from the trace, never invented by
 * a component.
 *
 * A "trace" here is the return value of traceBadCharacter or
 * traceGoodSuffix (src/algorithms/preprocessingTrace.js).
 */

/**
 * @param {{ pattern: string }} trace
 * @returns {string[]} pattern characters, in order
 */
export function getPatternChars(trace) {
  return trace ? trace.pattern.split("") : [];
}

/**
 * The current step object, clamped to a valid index. Returns null only
 * when the trace has no steps at all (shouldn't happen -- every trace has
 * at least START and DONE).
 *
 * @param {{ steps: object[] }} trace
 * @param {number} stepIndex
 */
export function getCurrentStep(trace, stepIndex) {
  if (!trace || !trace.steps || trace.steps.length === 0) return null;
  const clamped = Math.min(Math.max(stepIndex, 0), trace.steps.length - 1);
  return trace.steps[clamped];
}

/**
 * Per-pattern-character highlight role for PatternStrip, derived from the
 * current step's `patternHighlights`. Multiple roles can theoretically
 * apply to the same index (e.g. "suffix" region also being the
 * "compare-left" anchor) -- the more specific comparison role wins for
 * display purposes.
 *
 * @param {object|null} step
 * @param {number} index
 * @returns {"idle"|"suffix"|"active"|"compare-left"|"compare-right"}
 */
export function getPatternCharRole(step, index) {
  if (!step || !step.patternHighlights || step.patternHighlights.length === 0) return "idle";
  const roles = step.patternHighlights.filter((h) => h.index === index).map((h) => h.role);
  if (roles.length === 0) return "idle";
  if (roles.includes("active")) return "active";
  if (roles.includes("compare-left")) return "compare-left";
  if (roles.includes("compare-right")) return "compare-right";
  if (roles.includes("suffix")) return "suffix";
  return roles[0];
}

/**
 * Bad Character table cell status for character `char`, given the current
 * step.
 *
 * @param {object|null} step  a Bad Character trace step
 * @param {string} char
 * @returns {"unset"|"active"|"settled"}
 */
export function getBadCharacterCellStatus(step, char) {
  if (!step) return "unset";
  const inSnapshot = Object.prototype.hasOwnProperty.call(step.tableSnapshot ?? {}, char);
  if (!inSnapshot) return "unset";
  if (step.type === "scan" && step.variables?.char === char) return "active";
  return "settled";
}

/**
 * Good Suffix `shift` array cell status at index `idx`, given the current
 * step.
 *
 * @param {object|null} step  a Good Suffix trace step
 * @param {number} idx
 * @returns {"unset"|"active"|"settled"}
 */
export function getGoodSuffixShiftCellStatus(step, idx) {
  if (!step) return "unset";
  if (!step.shiftTouched?.[idx]) return "unset";
  if (step.activeShift === idx) return "active";
  return "settled";
}

/**
 * Good Suffix `bpos` array cell status at index `idx`, given the current
 * step.
 *
 * @param {object|null} step  a Good Suffix trace step
 * @param {number} idx
 * @returns {"unset"|"active"|"settled"}
 */
export function getGoodSuffixBposCellStatus(step, idx) {
  if (!step) return "unset";
  if (!step.bposTouched?.[idx]) return "unset";
  if (step.activeBpos === idx) return "active";
  return "settled";
}

/**
 * True once playback has reached the final (DONE) step of the trace.
 *
 * @param {{ steps: object[] }} trace
 * @param {number} stepIndex
 */
export function isTraceComplete(trace, stepIndex) {
  if (!trace || !trace.steps || trace.steps.length === 0) return false;
  return stepIndex >= trace.steps.length - 1;
}

/**
 * A short, stable label for the phase the current step belongs to, used
 * for the CurrentOperationPanel / TableExplanationPanel tag.
 *
 * @param {object|null} step
 * @returns {string}
 */
export function getStepPhaseLabel(step) {
  if (!step) return "";
  const { type } = step;
  if (type === "start") return "SETUP";
  if (type === "done") return "COMPLETE";
  if (type === "scan") return "SCANNING";
  if (type?.startsWith("case1")) return "CASE 1";
  if (type?.startsWith("case2")) return "CASE 2";
  return type ?? "";
}
