import { buildGoodSuffixTable } from "./preprocessing.js";
import { createTraceBuilder, buildResult, validateInput, PHASES } from "../engine/executionTrace.js";

/*
 * PSEUDOCODE -- Good Suffix heuristic
 *
 *  1  {shift, bpos} <- buildGoodSuffixTable(pattern)
 *  2  s <- 0
 *  3  while s <= n - m:
 *  4      j <- m - 1
 *  5      while j >= 0 and pattern[j] == text[s + j]:
 *  6          j <- j - 1
 *  7      if j < 0:
 *  8          report match at s
 *  9          s <- s + shift[0]
 * 10      else:
 * 11          goodSuffixShift <- shift[j + 1]
 * 12          s <- s + goodSuffixShift
 * 13  done
 */

/**
 * Runs Boyer-Moore using only the Good Suffix heuristic.
 * @param {string} text
 * @param {string} pattern
 */
export function runGoodSuffix(text, pattern) {
  const { valid, error } = validateInput(text, pattern);
  if (!valid) {
    return buildResult({ algorithm: "good-suffix", text, pattern, error });
  }

  const n = text.length;
  const m = pattern.length;
  const { shift: shiftTable, bpos } = buildGoodSuffixTable(pattern);
  const trace = createTraceBuilder();
  const matches = [];

  trace.push({
    phase: PHASES.START,
    alignment: 0,
    pseudocodeLine: 1,
    explanation: `Preprocessed the Good Suffix shift table for pattern "${pattern}".`,
    variables: { s: 0, m, n },
  });

  let s = 0;
  let guard = n + 2;

  while (s <= n - m) {
    if (guard-- <= 0) throw new Error("runGoodSuffix: exceeded expected iteration bound");
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
      const shift = shiftTable[0];

      trace.push({
        phase: PHASES.FOUND,
        alignment: s,
        matchIndex: s,
        goodSuffixShift: shift,
        chosenShift: shift,
        pseudocodeLine: 9,
        explanation: `Full match found at index ${s}. Good Suffix table gives shift[0] = ${shift}.`,
        variables: { s, shift },
      });

      trace.stats.shifts++;
      s += shift;
    } else {
      const shift = shiftTable[j + 1];

      trace.push({
        phase: PHASES.MISMATCH,
        alignment: s,
        i: s + j,
        j,
        textChar: text[s + j],
        patternChar: pattern[j],
        comparisonResult: "mismatch",
        goodSuffixShift: shift,
        chosenShift: shift,
        winner: "good-suffix",
        pseudocodeLine: 11,
        explanation: `Good Suffix shift: shift[${j + 1}] = ${shift}.`,
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
    algorithm: "good-suffix",
    text,
    pattern,
    states: trace.getStates(),
    stats: trace.stats,
    matches,
    preprocessing: { shiftTable, bpos },
  });
}
