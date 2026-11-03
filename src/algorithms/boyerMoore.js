import { buildLastOccurrenceTable, lastOccurrence, buildGoodSuffixTable } from "./preprocessing.js";
import { createTraceBuilder, buildResult, validateInput, PHASES, WINNERS } from "../engine/executionTrace.js";

/*
 * PSEUDOCODE -- Full Boyer-Moore (both heuristics, larger valid shift wins)
 *
 *  1  last <- buildLastOccurrenceTable(pattern)
 *  2  {shift, bpos} <- buildGoodSuffixTable(pattern)
 *  3  s <- 0
 *  4  while s <= n - m:
 *  5      j <- m - 1
 *  6      while j >= 0 and pattern[j] == text[s + j]:
 *  7          j <- j - 1
 *  8      if j < 0:
 *  9          report match at s
 * 10          s <- s + shift[0]
 * 11      else:
 * 12          badCharacterShift <- max(1, j - last[text[s + j]])
 * 13          goodSuffixShift <- shift[j + 1]
 * 14          chosenShift <- max(badCharacterShift, goodSuffixShift)
 * 15          s <- s + chosenShift
 * 16  done
 */

/**
 * Runs Full Boyer-Moore: both heuristics are evaluated at every mismatch
 * and the larger valid shift is taken.
 * @param {string} text
 * @param {string} pattern
 */
export function runBoyerMoore(text, pattern) {
  const { valid, error } = validateInput(text, pattern);
  if (!valid) {
    return buildResult({ algorithm: "full", text, pattern, error });
  }

  const n = text.length;
  const m = pattern.length;
  const last = buildLastOccurrenceTable(pattern);
  const { shift: shiftTable, bpos } = buildGoodSuffixTable(pattern);
  const trace = createTraceBuilder();
  const matches = [];

  trace.push({
    phase: PHASES.START,
    alignment: 0,
    pseudocodeLine: 1,
    explanation: `Preprocessed both the last-occurrence table and the Good Suffix shift table for pattern "${pattern}".`,
    variables: { s: 0, m, n },
  });

  let s = 0;
  let guard = n + 2;

  while (s <= n - m) {
    if (guard-- <= 0) throw new Error("runBoyerMoore: exceeded expected iteration bound");
    trace.stats.alignments++;
    let j = m - 1;

    trace.push({
      phase: PHASES.COMPARE,
      alignment: s,
      i: s + j,
      j,
      pseudocodeLine: 5,
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
        pseudocodeLine: isMatch ? 7 : 8,
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
        chosenShift: shift,
        pseudocodeLine: 9,
        explanation: `Full match found at index ${s}. Shifting by shift[0] = ${shift}.`,
        variables: { s, shift },
      });

      trace.stats.shifts++;
      s += shift;
    } else {
      const textChar = text[s + j];
      const badCharacterShift = Math.max(1, j - lastOccurrence(last, textChar));
      const goodSuffixShift = shiftTable[j + 1];
      const chosenShift = Math.max(badCharacterShift, goodSuffixShift);

      let winner;
      if (badCharacterShift > goodSuffixShift) winner = WINNERS.BAD_CHARACTER;
      else if (goodSuffixShift > badCharacterShift) winner = WINNERS.GOOD_SUFFIX;
      else winner = WINNERS.EQUAL;

      trace.push({
        phase: PHASES.MISMATCH,
        alignment: s,
        i: s + j,
        j,
        textChar,
        patternChar: pattern[j],
        comparisonResult: "mismatch",
        badCharacterShift,
        goodSuffixShift,
        chosenShift,
        winner,
        pseudocodeLine: 14,
        explanation: `Mismatch at pattern index ${j}. Bad Character proposes ${badCharacterShift}, Good Suffix proposes ${goodSuffixShift}. max(${badCharacterShift}, ${goodSuffixShift}) = ${chosenShift}${
          winner === WINNERS.EQUAL ? " -- both heuristics agree." : `, so ${winner.replace("-", " ")} wins.`
        }`,
        variables: { s, j, badCharacterShift, goodSuffixShift, chosenShift },
      });

      trace.stats.shifts++;
      s += chosenShift;
    }
  }

  trace.push({
    phase: PHASES.DONE,
    alignment: s,
    pseudocodeLine: 16,
    explanation:
      matches.length > 0
        ? `Search complete. Found ${matches.length} match${matches.length === 1 ? "" : "es"}.`
        : "Search complete. No matches found.",
    variables: { totalMatches: matches.length },
  });

  return buildResult({
    algorithm: "full",
    text,
    pattern,
    states: trace.getStates(),
    stats: trace.stats,
    matches,
    preprocessing: {
      lastOccurrenceTable: Object.fromEntries(last),
      shiftTable,
      bpos,
    },
  });
}
