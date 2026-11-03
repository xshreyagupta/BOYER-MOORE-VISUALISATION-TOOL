/**
 * Shared preprocessing routines.
 *
 * Both the Bad Character and Good Suffix heuristics (and Full Boyer-Moore,
 * which uses both) call these exact functions at run time. There is no
 * separate "for visualization" copy of this logic anywhere else in the
 * project.
 *
 * PHASE 6 -- both functions below accept an optional `{ onStep }` callback.
 * It is purely an observation hook: every `onStep(...)` call is inserted
 * around the *existing* reads/writes with zero change to control flow or to
 * any value that gets computed. When `onStep` is omitted (every pre-Phase-6
 * call site: badCharacter.js, goodSuffix.js, boyerMoore.js) these functions
 * are byte-for-byte the same computation they always were. When it *is*
 * supplied (only preprocessingTrace.js does this), the caller receives a
 * blow-by-blow account of the same run for the Preprocessing Lab
 * visualizer -- there is no second, simplified implementation anywhere.
 */

/**
 * Builds the last-occurrence table for the Bad Character heuristic.
 * lastOccurrenceTable.get(c) = highest index of character c in pattern,
 * or undefined if c does not appear in pattern.
 * @param {string} pattern
 * @param {{ onStep?: (event: object) => void }} [options]
 * @returns {Map<string, number>}
 */
export function buildLastOccurrenceTable(pattern, { onStep } = {}) {
  const table = new Map();
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    const previousValue = table.has(char) ? table.get(char) : null;
    table.set(char, i);
    if (onStep) {
      onStep({
        type: "scan",
        index: i,
        char,
        previousValue,
        newValue: i,
        tableSnapshot: Object.fromEntries(table),
      });
    }
  }
  return table;
}

/**
 * @param {Map<string, number>} table
 * @param {string} char
 * @returns {number} last index of char in the pattern, or -1 if absent.
 */
export function lastOccurrence(table, char) {
  return table.has(char) ? table.get(char) : -1;
}

/**
 * Builds the strong Good Suffix shift table.
 *
 * Standard two-case preprocessing:
 *   Case 1: the matched suffix occurs elsewhere in the pattern, preceded
 *           by a character different from the one that caused the mismatch.
 *   Case 2: only part of the matched suffix occurs as a prefix of the
 *           pattern.
 *
 * Returns { shift, bpos } where shift has length m + 1:
 *   shift[j] = how far to advance the pattern when the suffix
 *              pattern[j..m-1] matched and the mismatch happened at
 *              pattern index j - 1 (j === 0 means a full match).
 *
 * @param {string} pattern
 * @param {{ onStep?: (event: object) => void }} [options]
 * @returns {{ shift: number[], bpos: number[] }}
 */
export function buildGoodSuffixTable(pattern, { onStep } = {}) {
  const m = pattern.length;
  const shift = new Array(m + 1).fill(0);
  const bpos = new Array(m + 1).fill(0);

  const emit = onStep ? (event) => onStep({ ...event, shift: shift.slice(), bpos: bpos.slice() }) : null;

  // ---- Case 1 ----
  let i = m;
  let j = m + 1;
  bpos[i] = j;
  if (emit) emit({ type: "case1-init", i, j });

  while (i > 0) {
    while (j <= m && pattern[i - 1] !== pattern[j - 1]) {
      if (emit) {
        emit({
          type: "case1-compare",
          i,
          j,
          leftChar: pattern[i - 1],
          rightChar: pattern[j - 1],
          result: "mismatch",
        });
      }
      if (shift[j] === 0) {
        shift[j] = j - i;
        if (emit) emit({ type: "case1-shift-set", i, j, value: shift[j] });
      }
      const fromJ = j;
      j = bpos[j];
      if (emit) emit({ type: "case1-jump", i, fromJ, j });
    }
    if (emit && j <= m) {
      // The inner while exited because the characters matched (j > m would
      // have exited via the other clause, with nothing to compare) -- a
      // read-only re-check purely for the trace, changes nothing.
      emit({
        type: "case1-compare",
        i,
        j,
        leftChar: pattern[i - 1],
        rightChar: pattern[j - 1],
        result: "match",
      });
    }
    const fromI = i;
    const fromJ = j;
    i--;
    j--;
    bpos[i] = j;
    if (emit) emit({ type: "case1-bpos-set", fromI, fromJ, i, j });
  }

  // ---- Case 2 ----
  j = bpos[0];
  if (emit) emit({ type: "case2-init", j });
  for (i = 0; i <= m; i++) {
    if (shift[i] === 0) {
      shift[i] = j;
      if (emit) emit({ type: "case2-shift-set", i, j, value: shift[i] });
    } else if (emit) {
      emit({ type: "case2-skip", i, existingValue: shift[i] });
    }
    if (i === j) {
      const fromJ = j;
      j = bpos[j];
      if (emit) emit({ type: "case2-jump", i, fromJ, j });
    }
  }

  if (emit) emit({ type: "done" });

  return { shift, bpos };
}
