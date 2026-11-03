import { buildLastOccurrenceTable, buildGoodSuffixTable } from "./preprocessing.js";

/**
 * PHASE 6 -- Preprocessing execution traces.
 *
 * This module does NOT reimplement the Bad Character or Good Suffix
 * preprocessing logic. It calls `buildLastOccurrenceTable` /
 * `buildGoodSuffixTable` from ./preprocessing.js -- the exact same
 * functions `badCharacter.js`, `goodSuffix.js`, and `boyerMoore.js` call at
 * search time -- passing an `onStep` observer. Every step pushed below is a
 * direct record of something that function actually did; nothing here
 * guesses, recomputes, or approximates a table value or a shift.
 *
 *   buildLastOccurrenceTable / buildGoodSuffixTable (real algorithm)
 *     --onStep-->  raw events
 *     -->  traceBadCharacter / traceGoodSuffix (this file): annotate each
 *          raw event with a step number, a plain-English explanation, and
 *          pattern-highlight hints
 *     -->  preprocessingSelectors.js: turn a (trace, stepIndex) pair into
 *          view props
 *     -->  TableView / PatternStrip / CurrentOperationPanel /
 *          TableExplanationPanel / FinalTableSummary (UI)
 *
 * The `table` / `shift` / `bpos` returned alongside `steps` are the literal
 * return values of the real functions -- the same values
 * `runBadCharacter` / `runGoodSuffix` / `runBoyerMoore` put into
 * `result.preprocessing`. FinalTableSummary renders those, not a copy.
 */

export const BC_STEP_TYPES = Object.freeze({
  START: "start",
  SCAN: "scan",
  DONE: "done",
});

export const GS_STEP_TYPES = Object.freeze({
  START: "start",
  CASE1_INIT: "case1-init",
  CASE1_COMPARE: "case1-compare",
  CASE1_SHIFT_SET: "case1-shift-set",
  CASE1_JUMP: "case1-jump",
  CASE1_BPOS_SET: "case1-bpos-set",
  CASE2_INIT: "case2-init",
  CASE2_SHIFT_SET: "case2-shift-set",
  CASE2_SKIP: "case2-skip",
  CASE2_JUMP: "case2-jump",
  DONE: "done",
});

/**
 * Builds the full step-by-step trace of Bad Character (last-occurrence
 * table) preprocessing for `pattern`.
 *
 * @param {string} pattern
 * @returns {{ algorithm: "bad-character", pattern: string, table: object, steps: object[] }}
 */
export function traceBadCharacter(pattern) {
  const m = pattern.length;
  const rawEvents = [];
  const table = buildLastOccurrenceTable(pattern, { onStep: (event) => rawEvents.push(event) });
  const finalTable = Object.fromEntries(table);

  const steps = [];
  let n = 0;

  steps.push({
    step: n++,
    algorithm: "bad-character",
    type: BC_STEP_TYPES.START,
    pseudocodeLine: 1,
    explanation:
      m === 0
        ? "Pattern is empty -- there is no last-occurrence table to build."
        : `Building the Bad Character last-occurrence table for pattern "${pattern}". Scanning left to right, index 0 to ${m - 1}, so that a later occurrence of a character always overwrites an earlier one.`,
    patternHighlights: [],
    tableSnapshot: {},
    variables: { m },
  });

  for (const event of rawEvents) {
    const { index, char, previousValue, tableSnapshot } = event;
    steps.push({
      step: n++,
      algorithm: "bad-character",
      type: BC_STEP_TYPES.SCAN,
      pseudocodeLine: 2,
      explanation:
        previousValue === null
          ? `pattern[${index}] = '${char}' \u2192 first time seeing '${char}'. Record lastOccurrence['${char}'] = ${index}.`
          : `pattern[${index}] = '${char}' \u2192 '${char}' was previously recorded at index ${previousValue}. Overwrite lastOccurrence['${char}'] = ${index} (the later index wins).`,
      patternHighlights: [{ index, role: "active" }],
      tableSnapshot: { ...tableSnapshot },
      variables: { index, char, previousValue, newValue: index },
    });
  }

  const distinctChars = Object.keys(finalTable).length;
  steps.push({
    step: n++,
    algorithm: "bad-character",
    type: BC_STEP_TYPES.DONE,
    pseudocodeLine: 3,
    explanation:
      m === 0
        ? "Table complete: empty (empty pattern)."
        : `Last-occurrence table complete: ${distinctChars} distinct character${distinctChars === 1 ? "" : "s"} recorded across ${m} pattern position${m === 1 ? "" : "s"}.`,
    patternHighlights: [],
    tableSnapshot: { ...finalTable },
    variables: { distinctChars, m },
  });

  return { algorithm: "bad-character", pattern, table: finalTable, steps };
}

/**
 * Builds the full step-by-step trace of Good Suffix table preprocessing
 * (the two-case `shift`/`bpos` construction) for `pattern`.
 *
 * @param {string} pattern
 * @returns {{ algorithm: "good-suffix", pattern: string, shift: number[], bpos: number[], steps: object[] }}
 */
export function traceGoodSuffix(pattern) {
  const m = pattern.length;
  const rawEvents = [];
  const { shift: finalShift, bpos: finalBpos } = buildGoodSuffixTable(pattern, {
    onStep: (event) => rawEvents.push(event),
  });

  const steps = [];
  let n = 0;

  // Cumulative "has this cell been touched yet" tracking, replayed in step
  // order, so the UI can tell a genuine 0 shift/bpos value apart from a
  // cell that simply hasn't been computed yet.
  const shiftTouched = new Array(m + 1).fill(false);
  const bposTouched = new Array(m + 1).fill(false);

  function pushStep({ type, pseudocodeLine, explanation, patternHighlights, variables, event, activeShift, activeBpos }) {
    steps.push({
      step: n++,
      algorithm: "good-suffix",
      type,
      pseudocodeLine,
      explanation,
      patternHighlights: patternHighlights ?? [],
      shiftSnapshot: event ? event.shift.slice() : new Array(m + 1).fill(0),
      bposSnapshot: event ? event.bpos.slice() : new Array(m + 1).fill(0),
      shiftTouched: shiftTouched.slice(),
      bposTouched: bposTouched.slice(),
      activeShift: activeShift ?? null,
      activeBpos: activeBpos ?? null,
      variables: variables ?? {},
    });
  }

  // Suffix pattern[i..m-1] highlighted whenever `i` marks the current
  // border boundary; comparison anchors highlighted at i-1 / j-1.
  function suffixHighlights(i, extra = []) {
    const highlights = [...extra];
    if (i >= 0 && i < m) {
      for (let idx = i; idx < m; idx++) highlights.push({ index: idx, role: "suffix" });
    }
    return highlights;
  }

  pushStep({
    type: GS_STEP_TYPES.START,
    pseudocodeLine: 1,
    explanation:
      m === 0
        ? "Pattern is empty -- there is no Good Suffix table to build."
        : `Building the Good Suffix shift table for pattern "${pattern}" (length ${m}). Case 1 finds every place a matched suffix reoccurs inside the pattern; Case 2 fills in whatever Case 1 left as a prefix-border fallback.`,
    variables: { m },
  });

  for (const event of rawEvents) {
    switch (event.type) {
      case "case1-init": {
        bposTouched[event.i] = true;
        pushStep({
          type: GS_STEP_TYPES.CASE1_INIT,
          pseudocodeLine: 2,
          explanation: `Case 1 setup: i = ${event.i} (one past the last pattern index), j = ${event.j}. bpos[${event.i}] = ${event.j} -- the boundary case, an empty suffix borders the whole pattern.`,
          patternHighlights: suffixHighlights(event.i),
          variables: { i: event.i, j: event.j },
          event,
          activeBpos: event.i,
        });
        break;
      }
      case "case1-compare": {
        const matched = event.result === "match";
        pushStep({
          type: GS_STEP_TYPES.CASE1_COMPARE,
          pseudocodeLine: 3,
          explanation: matched
            ? `Comparing pattern[${event.i - 1}] = '${event.leftChar}' against pattern[${event.j - 1}] = '${event.rightChar}': they match, so the inner search stops here.`
            : `Comparing pattern[${event.i - 1}] = '${event.leftChar}' against pattern[${event.j - 1}] = '${event.rightChar}': they differ, so this position of the pattern is not a valid reoccurrence.`,
          patternHighlights: suffixHighlights(event.i, [
            { index: event.i - 1, role: "compare-left" },
            ...(event.j - 1 >= 0 && event.j - 1 < m ? [{ index: event.j - 1, role: "compare-right" }] : []),
          ]),
          variables: { i: event.i, j: event.j, leftChar: event.leftChar, rightChar: event.rightChar, result: event.result },
          event,
        });
        break;
      }
      case "case1-shift-set": {
        shiftTouched[event.j] = true;
        pushStep({
          type: GS_STEP_TYPES.CASE1_SHIFT_SET,
          pseudocodeLine: 4,
          explanation: `shift[${event.j}] was still unset, so record it now: shift[${event.j}] = j - i = ${event.j} - ${event.i} = ${event.value}.`,
          patternHighlights: suffixHighlights(event.i),
          variables: { i: event.i, j: event.j, value: event.value },
          event,
          activeShift: event.j,
        });
        break;
      }
      case "case1-jump": {
        pushStep({
          type: GS_STEP_TYPES.CASE1_JUMP,
          pseudocodeLine: 5,
          explanation: `Follow the border link: j = bpos[${event.fromJ}] = ${event.j}. Keep looking for another reoccurrence of the suffix.`,
          patternHighlights: suffixHighlights(event.i),
          variables: { i: event.i, fromJ: event.fromJ, j: event.j },
          event,
        });
        break;
      }
      case "case1-bpos-set": {
        bposTouched[event.i] = true;
        pushStep({
          type: GS_STEP_TYPES.CASE1_BPOS_SET,
          pseudocodeLine: 6,
          explanation: `Extend the border by one character: i: ${event.fromI} \u2192 ${event.i}, j: ${event.fromJ} \u2192 ${event.j}. bpos[${event.i}] = ${event.j} -- widest border of the suffix pattern[${event.i}..${m - 1}] starts at pattern index ${event.j}.`,
          patternHighlights: suffixHighlights(event.i),
          variables: { i: event.i, j: event.j },
          event,
          activeBpos: event.i,
        });
        break;
      }
      case "case2-init": {
        pushStep({
          type: GS_STEP_TYPES.CASE2_INIT,
          pseudocodeLine: 8,
          explanation: `Case 2 setup: j = bpos[0] = ${event.j} -- the widest border of the entire pattern. This fills every shift[i] that Case 1 left at 0, using the widest prefix-border that still fits.`,
          variables: { j: event.j },
          event,
        });
        break;
      }
      case "case2-shift-set": {
        shiftTouched[event.i] = true;
        pushStep({
          type: GS_STEP_TYPES.CASE2_SHIFT_SET,
          pseudocodeLine: 9,
          explanation: `shift[${event.i}] is still 0 (Case 1 never set it), so fall back to the widest prefix-border: shift[${event.i}] = j = ${event.value}.`,
          patternHighlights: suffixHighlights(event.i),
          variables: { i: event.i, j: event.j, value: event.value },
          event,
          activeShift: event.i,
        });
        break;
      }
      case "case2-skip": {
        pushStep({
          type: GS_STEP_TYPES.CASE2_SKIP,
          pseudocodeLine: 9,
          explanation: `shift[${event.i}] = ${event.existingValue} already, set by Case 1 -- Case 2 leaves it untouched (Case 1 found a stronger shift).`,
          patternHighlights: suffixHighlights(event.i),
          variables: { i: event.i, existingValue: event.existingValue },
          event,
        });
        break;
      }
      case "case2-jump": {
        pushStep({
          type: GS_STEP_TYPES.CASE2_JUMP,
          pseudocodeLine: 10,
          explanation: `i has reached the current border boundary (i = j = ${event.i}), so narrow the fallback border: j = bpos[${event.i}] = ${event.j}.`,
          variables: { i: event.i, fromJ: event.fromJ, j: event.j },
          event,
        });
        break;
      }
      default:
        break;
    }
  }

  pushStep({
    type: GS_STEP_TYPES.DONE,
    pseudocodeLine: 12,
    explanation: `Good Suffix table complete. shift = [${finalShift.join(", ")}], bpos = [${finalBpos.join(", ")}].`,
    variables: { shift: finalShift.slice(), bpos: finalBpos.slice() },
    event: { shift: finalShift, bpos: finalBpos },
  });
  // The DONE step marks every cell as touched -- by this point the real
  // algorithm has finished and every entry has a final value.
  steps[steps.length - 1].shiftTouched = new Array(m + 1).fill(true);
  steps[steps.length - 1].bposTouched = new Array(m + 1).fill(true);

  return { algorithm: "good-suffix", pattern, shift: finalShift, bpos: finalBpos, steps };
}
