import { buildLastOccurrenceTable, lastOccurrence } from "./preprocessing.js";
import { createTraceBuilder, buildResult, validateInput, PHASES } from "../engine/executionTrace.js";

/*
 * PSEUDOCODE -- Bad Character heuristic
 * Line numbers below are referenced by `pseudocodeLine` in emitted states,
 * and will be the canonical source for the Phase 9 pseudocode panel.
 *
 *  1  last <- buildLastOccurrenceTable(pattern)
 *  2  s <- 0
 *  3  while s <= n - m:
 *  4      j <- m - 1
 *  5      while j >= 0 and pattern[j] == text[s + j]:
 *  6          j <- j - 1
 *  7      if j < 0:
 *  8          report match at s
 *  9          s <- s + (s + m < n ? m - last[text[s + m]] : 1)
 * 10      else:
 * 11          badCharacterShift <- max(1, j - last[text[s + j]])
 * 12          s <- s + badCharacterShift
 * 13  done
 */

/**
 * Runs Boyer-Moore using only the Bad Character heuristic.
 * @param {string} text
 * @param {string} pattern
 */
export function runBadCharacter(text, pattern) {
  const { valid, error } = validateInput(text, pattern);
  if (!valid) {
    return buildResult({ algorithm: "bad-character", text, pattern, error });
  }

  const n = text.length;
  const m = pattern.length;
  const last = buildLastOccurrenceTable(pattern);
  const trace = createTraceBuilder();
  const matches = [];

  trace.push({
    phase: PHASES.START,
    alignment: 0,
    pseudocodeLine: 1,
    explanation: `Preprocessed the last-occurrence table for pattern "${pattern}".`,
    variables: { s: 0, m, n },
  });

  let s = 0;
  // Safety net only: a correct implementation visits at most n - m + 1
  // alignments. This guards tests against ever hanging on a regression.
  let guard = n + 2;

  while (s <= n - m) {
    if (guard-- <= 0) throw new Error("runBadCharacter: exceeded expected iteration bound");
    trace.stats.alignments++;
    let j = m - 1;

    trace.push({
      phase: PHASES.COMPARE,
      alignment: s,
      i: s + j,
      j,
      pseudocodeLine: 4,
      explanation: `New alignment at shift ${s}. Comparing from the rightmost pattern character.`,
      variables: { s, j },
    });

    while (j >= 0) {
      trace.stats.comparisons++;
      const textChar = text[s + j];
      const patternChar = pattern[j];
      const isMatch = textChar === patternChar;

      trace.push({
        phase: PHASES.COMPARE,
        alignment: s,
        i: s + j,
        j,
        textChar,
        patternChar,
        comparisonResult: isMatch ? "match" : "mismatch",
        pseudocodeLine: isMatch ? 6 : 7,
        explanation: isMatch
          ? `text[${s + j}] = '${textChar}' matches pattern[${j}] = '${patternChar}'.`
          : `text[${s + j}] = '${textChar}' does not match pattern[${j}] = '${patternChar}'.`,
        variables: { s, j },
      });

      if (!isMatch) {
        trace.stats.mismatches++;
        break;
      }
      j--;
    }

    if (j < 0) {
      trace.stats.matches++;
      matches.push(s);
      const nextChar = s + m < n ? text[s + m] : null;
      const shift = nextChar !== null ? Math.max(1, m - lastOccurrence(last, nextChar)) : 1;

      trace.push({
        phase: PHASES.FOUND,
        alignment: s,
        matchIndex: s,
        chosenShift: shift,
        pseudocodeLine: 9,
        explanation: `Full match found at index ${s}. Shifting by ${shift} to continue searching.`,
        variables: { s, shift },
      });

      trace.stats.shifts++;
      s += shift;
    } else {
      const textChar = text[s + j];
      const shift = Math.max(1, j - lastOccurrence(last, textChar));

      trace.push({
        phase: PHASES.MISMATCH,
        alignment: s,
        i: s + j,
        j,
        textChar,
        patternChar: pattern[j],
        comparisonResult: "mismatch",
        badCharacterShift: shift,
        chosenShift: shift,
        winner: "bad-character",
        pseudocodeLine: 11,
        explanation: `Bad Character shift: max(1, ${j} - lastOccurrence('${textChar}')) = ${shift}.`,
        variables: { s, j, shift },
      });

      trace.stats.shifts++;
      s += shift;
    }
  }

  trace.push({
    phase: PHASES.DONE,
    alignment: s,
    pseudocodeLine: 13,
    explanation:
      matches.length > 0
        ? `Search complete. Found ${matches.length} match${matches.length === 1 ? "" : "es"}.`
        : "Search complete. No matches found.",
    variables: { totalMatches: matches.length },
  });

  return buildResult({
    algorithm: "bad-character",
    text,
    pattern,
    states: trace.getStates(),
    stats: trace.stats,
    matches,
    preprocessing: { lastOccurrenceTable: Object.fromEntries(last) },
  });
}
