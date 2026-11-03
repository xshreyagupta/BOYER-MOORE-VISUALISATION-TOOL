/**
 * PHASE 12 -- pure, framework-agnostic helpers for the Student Execution
 * visualization.
 *
 * Mirrors the role traceSelectors.js / pseudocodeSelectors.js already play
 * for the *reference* algorithm traces: every displayed value here is
 * derived from a real Phase 11 execution-trace state, never invented.
 *
 * IMPORTANT: this module deliberately does NOT reuse
 * src/ui/lib/traceSelectors.js. That module's selectors are written
 * against the reference engine's state shape (`phase`, `i`, `j`,
 * `comparisonResult`, ...) -- see src/engine/executionTrace.js. Student
 * pseudocode states have a different, looser shape (`currentComparison`,
 * `alignment`, `mismatch`, ...) produced by
 * src/pseudocode/executionTrace.js's normalizeBoyerMooreState, and a
 * student program is never guaranteed to populate any particular field.
 * Treating the two shapes as interchangeable would silently produce wrong
 * highlighting, so this module exists instead of stretching the old one.
 */

/**
 * Number of leading spaces on a raw source line, for purely-visual nesting
 * indent in the pseudocode panel. This does not judge correctness (that's
 * src/pseudocode/indentation.js's job) -- it only reflects however the
 * student actually indented their own code, unmodified.
 *
 * @param {string} rawLine
 * @returns {number}
 */
function leadingSpaces(rawLine) {
  const match = /^ */.exec(rawLine ?? "");
  return match ? match[0].length : 0;
}

/**
 * Builds a `{title, lines, lineNotes}` block -- the same shape
 * PseudocodePanel already renders for the reference algorithms (see
 * src/ui/data/pseudocode.js) -- directly from the student's own source
 * text, so the Phase 7 line-highlighting panel can be reused as-is instead
 * of building a second one. Line numbers match 1:1 with what the lexer
 * assigns (raw line index + 1 -- see src/pseudocode/lexer.js), which is
 * also what every trace state's `line` field refers to.
 *
 * The student's code is never modified: line text is only trimmed on the
 * left for display indent purposes, nothing is reformatted or reflowed.
 *
 * @param {string} source
 * @returns {{title: string, lines: Array<{line:number,text:string,indent:number}>, lineNotes: object}}
 */
export function buildPseudocodeFromSource(source) {
  const rawLines = (source ?? "").split("\n");

  return {
    title: "Your pseudocode",
    lines: rawLines.map((raw, i) => ({
      line: i + 1,
      text: raw.slice(leadingSpaces(raw)),
      indent: Math.round(leadingSpaces(raw) / 2),
    })),
    lineNotes: {},
  };
}

/**
 * The pseudocode line that should be highlighted right now.
 *
 * Ordinarily this is simply the current trace state's own `line`. But once
 * execution has stopped on a runtime error or step-limit, the failure can
 * occur on a line that never reached `recordState` (e.g. an error thrown
 * mid-expression-evaluation) -- in that case the error object's own `line`
 * is the more accurate thing to point at, so it takes precedence while
 * parked on the trace's final, already-failed step.
 *
 * @param {object|null} currentState
 * @param {object|null} result   the full executeSource()/execute() result
 * @param {boolean} isAtEnd      whether the current step is the last state
 * @returns {number|null}
 */
export function getActiveLine(currentState, result, isAtEnd) {
  const failed = result?.status === "runtime-error" || result?.status === "step-limit";

  if (failed && isAtEnd && result?.error?.line != null) {
    return result.error.line;
  }

  return currentState?.line ?? null;
}

/**
 * Status for a single TEXT character cell, derived only from the current
 * state's `currentComparison` (there is no `phase`/`i`/`j` concept for an
 * arbitrary student program -- see the module doc above). A cell is only
 * ever "match"/"mismatch" while it's the exact index that was just
 * compared; every other cell is "idle". This under-decorates relative to
 * the reference TextRenderer on purpose: inventing "settled"/"dim"
 * semantics would require assuming a comparison order the student's code
 * may not actually follow.
 *
 * @param {object|null} state  current student trace state
 * @param {number} textIndex
 * @returns {"match"|"mismatch"|"idle"}
 */
export function getStudentTextCellStatus(state, textIndex) {
  const c = state?.currentComparison;
  if (!c || c.textIndex !== textIndex) return "idle";
  return c.result === "match" ? "match" : "mismatch";
}

/**
 * Status for a single PATTERN character cell. See getStudentTextCellStatus.
 *
 * @param {object|null} state
 * @param {number} patternIndex
 * @returns {"match"|"mismatch"|"idle"}
 */
export function getStudentPatternCellStatus(state, patternIndex) {
  const c = state?.currentComparison;
  if (!c || c.patternIndex !== patternIndex) return "idle";
  return c.result === "match" ? "match" : "mismatch";
}

/**
 * Whether `state.alignment` is a real, usable alignment value -- as
 * opposed to absent. Explicitly rejects `undefined`/`null` rather than
 * falsy, because `0` is a completely legitimate alignment (the very first
 * position) and must never be confused with "not produced".
 *
 * @param {object|null} state
 * @returns {boolean}
 */
export function hasAlignment(state) {
  return typeof state?.alignment === "number";
}

/**
 * @param {object|null} state
 * @param {"badCharacterShift"|"goodSuffixShift"|"chosenShift"} field
 * @returns {boolean}
 */
export function hasShiftField(state, field) {
  return state != null && state[field] !== undefined && state[field] !== null;
}

/**
 * Summarizes which shift values the current state actually carries, so
 * callers can decide which shift UI to show without repeating the
 * presence checks (and, critically, without ever substituting a default
 * of 0 for an absent one -- see hasShiftField).
 *
 * @param {object|null} state
 * @returns {{hasBad: boolean, hasGood: boolean, hasChosen: boolean, hasBoth: boolean}}
 */
export function getShiftAvailability(state) {
  const hasBad = hasShiftField(state, "badCharacterShift");
  const hasGood = hasShiftField(state, "goodSuffixShift");
  const hasChosen = hasShiftField(state, "chosenShift");
  return { hasBad, hasGood, hasChosen, hasBoth: hasBad && hasGood };
}

/**
 * A display-only label for which of two already-present shift values is
 * larger. This never computes a shift -- both inputs must already exist on
 * the trace state (see getShiftAvailability) -- it only characterizes a
 * relationship between two numbers already being displayed, the same way
 * a chart's "higher bar" label doesn't count as inventing data.
 *
 * @param {number} badCharacterShift
 * @param {number} goodSuffixShift
 * @returns {"bad-character"|"good-suffix"|"equal"}
 */
export function getShiftWinnerLabel(badCharacterShift, goodSuffixShift) {
  if (badCharacterShift === goodSuffixShift) return "equal";
  return badCharacterShift > goodSuffixShift ? "bad-character" : "good-suffix";
}

/**
 * A short, factual, per-step sentence describing what the trace state
 * actually recorded -- Phase 12 requirement 14, "Execution Explanation".
 * Built only from fields that are actually present on `state`; never
 * hardcoded to one specific algorithm's variable names.
 *
 * @param {object|null} state
 * @returns {string}
 */
export function explainStudentState(state) {
  if (!state) {
    return "Run the pseudocode to see it execute step by step.";
  }

  const lineTag = state.line != null ? `Line ${state.line}` : "This step";

  if (state.currentComparison) {
    const { textIndex, patternIndex, result } = state.currentComparison;
    return `${lineTag} compared TEXT[${textIndex}] with PATTERN[${patternIndex}] \u2014 ${result}.`;
  }

  if (state.nodeType === "Assignment" && state.changedVariables?.length > 0) {
    const name = state.changedVariables[0];
    const value = state.variables?.[name];
    return `${lineTag} assigned ${name} = ${formatForExplanation(value)}.`;
  }

  if (state.nodeType === "While") {
    return `${lineTag}: WHILE condition evaluated to ${state.conditionMet ? "TRUE" : "FALSE"}.`;
  }

  if (state.nodeType === "For") {
    const varName = state.loopVar ?? "loop variable";
    const varValue = state.loopVar != null ? state.variables?.[state.loopVar] : undefined;
    return `${lineTag}: FOR loop, ${varName} = ${formatForExplanation(varValue)} (iteration ${state.iteration ?? 0}).`;
  }

  if (state.nodeType === "If") {
    return `${lineTag}: IF condition took the ${state.branch === "then" ? "THEN" : "ELSE"} branch.`;
  }

  if (state.nodeType === "Return") {
    return `${lineTag} returned ${formatForExplanation(state.returnValue)}.`;
  }

  return `${lineTag} executed.`;
}

/**
 * @param {*} value
 * @returns {string}
 */
function formatForExplanation(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return `'${value}'`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
