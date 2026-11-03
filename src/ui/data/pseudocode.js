/**
 * PHASE 7 -- Canonical pseudocode source data.
 *
 * This module does not invent new pseudocode. Every SEARCH_PSEUDOCODE block
 * below is transcribed verbatim from the `PSEUDOCODE` comment block that
 * already lives at the top of the corresponding algorithm file --
 * src/algorithms/badCharacter.js, src/algorithms/goodSuffix.js,
 * src/algorithms/boyerMoore.js -- which is also where each state's
 * `pseudocodeLine` number is assigned. Line numbers here are only ever
 * changed if the source comment changes; this file must be kept in sync
 * with those comments, not the other way around.
 *
 * PREPROCESSING_PSEUDOCODE mirrors the same idea for
 * src/algorithms/preprocessingTrace.js, whose `pseudocodeLine` values are
 * assigned against the real control flow of
 * buildLastOccurrenceTable / buildGoodSuffixTable in
 * src/algorithms/preprocessing.js. A couple of line numbers in the Good
 * Suffix preprocessing trace (7 and 11) are never the *current* line of any
 * single event -- they're the surrounding loop headers -- but they're kept
 * in the listing because the pseudocode has to read as a complete,
 * runnable procedure, not just the highlightable subset.
 *
 * Every entry is `{ line, text, indent }`:
 *   line    1-based line number, matching `pseudocodeLine` on trace states
 *   text    the code for that line (no leading whitespace)
 *   indent  nesting depth, purely for rendering
 *
 * `lineNotes[line]` is the short, student-friendly answer to "what is this
 * line doing?" used by the clickable pseudocode panel. These are new
 * (Phase 7 requirement 8) -- there's no existing source of student-facing,
 * per-line prose to reuse, unlike the trace's own `explanation` field,
 * which describes a *moment* in the run, not a *line* of code in general.
 */

function line(n, text, indent = 0) {
  return { line: n, text, indent };
}

export const SEARCH_PSEUDOCODE = Object.freeze({
  "bad-character": {
    title: "Bad Character",
    lines: [
      line(1, "last <- buildLastOccurrenceTable(pattern)"),
      line(2, "s <- 0"),
      line(3, "while s <= n - m:"),
      line(4, "j <- m - 1", 1),
      line(5, "while j >= 0 and pattern[j] == text[s + j]:", 1),
      line(6, "j <- j - 1", 2),
      line(7, "if j < 0:", 1),
      line(8, "report match at s", 2),
      line(9, "s <- s + (s + m < n ? m - last[text[s + m]] : 1)", 2),
      line(10, "else:", 1),
      line(11, "badCharacterShift <- max(1, j - last[text[s + j]])", 2),
      line(12, "s <- s + badCharacterShift", 2),
      line(13, "done"),
    ],
    lineNotes: {
      1: "Preprocess the pattern once, up front: for every character, remember the rightmost index it occurs at.",
      2: "Start with the pattern aligned at the very beginning of the text.",
      3: "Keep trying alignments as long as the pattern still fits inside the remaining text.",
      4: "Start comparing from the rightmost character of the pattern, not the leftmost -- this is the whole point of Boyer-Moore.",
      5: "Keep comparing right-to-left as long as characters keep matching.",
      6: "A match: move one position further left and compare again.",
      7: "The comparison loop stopped -- figure out whether that's because every character matched (j < 0) or because one mismatched.",
      8: "j went all the way past 0, so every pattern character matched: report a match at this alignment.",
      9: "Shift far enough that the next occurrence (if any) of the character just past the match lines up with its last occurrence in the pattern.",
      10: "Otherwise, a mismatch happened at pattern index j.",
      11: "Look up where the mismatched text character last occurs in the pattern, and shift so that occurrence lines up -- but never shift by less than 1.",
      12: "Apply that shift and try the next alignment.",
      13: "No more alignments fit -- the search is over.",
    },
  },

  "good-suffix": {
    title: "Good Suffix",
    lines: [
      line(1, "{shift, bpos} <- buildGoodSuffixTable(pattern)"),
      line(2, "s <- 0"),
      line(3, "while s <= n - m:"),
      line(4, "j <- m - 1", 1),
      line(5, "while j >= 0 and pattern[j] == text[s + j]:", 1),
      line(6, "j <- j - 1", 2),
      line(7, "if j < 0:", 1),
      line(8, "report match at s", 2),
      line(9, "s <- s + shift[0]", 2),
      line(10, "else:", 1),
      line(11, "goodSuffixShift <- shift[j + 1]", 2),
      line(12, "s <- s + goodSuffixShift", 2),
      line(13, "done"),
    ],
    lineNotes: {
      1: "Preprocess the pattern once, up front: build the shift table from the two-case border analysis.",
      2: "Start with the pattern aligned at the very beginning of the text.",
      3: "Keep trying alignments as long as the pattern still fits inside the remaining text.",
      4: "Start comparing from the rightmost character of the pattern.",
      5: "Keep comparing right-to-left as long as characters keep matching -- the run of matched characters is the \"good suffix\".",
      6: "A match: move one position further left and compare again.",
      7: "The comparison loop stopped -- figure out whether every character matched (j < 0) or one mismatched.",
      8: "Every pattern character matched: report a match at this alignment.",
      9: "shift[0] tells you how far the matched suffix can safely move and still possibly align again.",
      10: "Otherwise, a mismatch happened at pattern index j, after matching the suffix pattern[j+1 .. m-1].",
      11: "Look up the precomputed shift for this matched suffix length: how far to move so that suffix realigns (or its best partial match does).",
      12: "Apply that shift and try the next alignment.",
      13: "No more alignments fit -- the search is over.",
    },
  },

  full: {
    title: "Full Boyer-Moore",
    lines: [
      line(1, "last <- buildLastOccurrenceTable(pattern)"),
      line(2, "{shift, bpos} <- buildGoodSuffixTable(pattern)"),
      line(3, "s <- 0"),
      line(4, "while s <= n - m:"),
      line(5, "j <- m - 1", 1),
      line(6, "while j >= 0 and pattern[j] == text[s + j]:", 1),
      line(7, "j <- j - 1", 2),
      line(8, "if j < 0:", 1),
      line(9, "report match at s", 2),
      line(10, "s <- s + shift[0]", 2),
      line(11, "else:", 1),
      line(12, "badCharacterShift <- max(1, j - last[text[s + j]])", 2),
      line(13, "goodSuffixShift <- shift[j + 1]", 2),
      line(14, "chosenShift <- max(badCharacterShift, goodSuffixShift)", 2),
      line(15, "s <- s + chosenShift", 2),
      line(16, "done"),
    ],
    lineNotes: {
      1: "Preprocess for the Bad Character heuristic: remember the rightmost index of every character in the pattern.",
      2: "Preprocess for the Good Suffix heuristic: build the shift table from the two-case border analysis.",
      3: "Start with the pattern aligned at the very beginning of the text.",
      4: "Keep trying alignments as long as the pattern still fits inside the remaining text.",
      5: "Start comparing from the rightmost character of the pattern.",
      6: "Keep comparing right-to-left as long as characters keep matching.",
      7: "A match: move one position further left and compare again.",
      8: "The comparison loop stopped -- figure out whether every character matched (j < 0) or one mismatched.",
      9: "Every pattern character matched: report a match at this alignment.",
      10: "shift[0] tells you how far the matched suffix can safely move and still possibly align again.",
      11: "Otherwise, a mismatch happened at pattern index j.",
      12: "Compute what Bad Character alone would propose for this mismatch.",
      13: "Compute what Good Suffix alone would propose for this same mismatch.",
      14: "Both heuristics calculate a safe shift. Full Boyer-Moore chooses the larger valid shift -- it's always safe to take the bigger one.",
      15: "Apply the chosen shift and try the next alignment.",
      16: "No more alignments fit -- the search is over.",
    },
  },
});

export const PREPROCESSING_PSEUDOCODE = Object.freeze({
  "bad-character": {
    title: "Bad Character -- Preprocessing",
    lines: [
      line(1, "last <- empty map"),
      line(2, "for i <- 0 to m - 1: last[pattern[i]] <- i"),
      line(3, "return last"),
    ],
    lineNotes: {
      1: "Start with no characters recorded yet.",
      2: "Scan the pattern left to right. Every time a character is seen, record its index -- a later occurrence always overwrites an earlier one, so what's left is the *rightmost* index of each character.",
      3: "The table is complete: for every character in the pattern, the index of its last occurrence.",
    },
  },

  "good-suffix": {
    title: "Good Suffix -- Preprocessing",
    lines: [
      line(1, "shift[0..m] <- 0; bpos[0..m] <- 0  // Case 1: reoccurring borders"),
      line(2, "i <- m; j <- m + 1; bpos[i] <- j"),
      line(3, "while i > 0:", 0),
      line(4, "while j <= m and pattern[i-1] != pattern[j-1]:", 1),
      line(5, "if shift[j] == 0: shift[j] <- j - i", 2),
      line(6, "j <- bpos[j]", 2),
      line(7, "i <- i - 1; j <- j - 1; bpos[i] <- j", 1),
      line(8, "j <- bpos[0]  // Case 2: prefix-border fallback"),
      line(9, "for i <- 0 to m: if shift[i] == 0: shift[i] <- j", 1),
      line(10, "if i == j: j <- bpos[j]", 2),
      line(11, "return shift, bpos"),
      line(12, "done"),
    ],
    lineNotes: {
      1: "Set up empty shift and bpos tables before Case 1 begins. Case 1 finds every place a matched suffix reoccurs inside the pattern.",
      2: "i marks the border boundary (starts one past the last index); j starts one past that. bpos[m] = m + 1 is the boundary case: an empty suffix trivially borders the whole pattern.",
      3: "Walk the border boundary i down to 0, extending the widest border by one character each time round.",
      4: "Look for a reoccurrence of the current suffix: keep comparing pattern[i-1] against pattern[j-1] while they differ.",
      5: "The first time a given suffix length (index j) is reached without a shift already recorded, this position is exactly how far a real Boyer-Moore search should shift when that suffix is the one that matched.",
      6: "No reoccurrence yet at this j -- follow the border link to try a shorter candidate border.",
      7: "The inner search stopped because the characters matched: extend the border by one character (i and j both step down) and record the new widest border in bpos.",
      8: "Case 1 is done. Case 2 fills in whatever shift[i] Case 1 left at 0, using the widest border of the *entire* pattern as a fallback.",
      9: "Walk every shift index left to right; wherever Case 1 never set a value (still 0), fall back to the widest prefix-border length j.",
      10: "Once i catches up to the current fallback border j, that border is no longer wide enough to cover this position -- narrow it by following bpos.",
      11: "Both tables are complete and are handed back to the caller (Bad Character/Good Suffix/Full Boyer-Moore all read shift and bpos from here).",
      12: "Preprocessing is done.",
    },
  },
});

/**
 * @param {"bad-character"|"good-suffix"|"full"} algorithm
 * @returns {{title: string, lines: Array, lineNotes: object}|null}
 */
export function getSearchPseudocode(algorithm) {
  return SEARCH_PSEUDOCODE[algorithm] ?? null;
}

/**
 * @param {"bad-character"|"good-suffix"} algorithm
 * @returns {{title: string, lines: Array, lineNotes: object}|null}
 */
export function getPreprocessingPseudocode(algorithm) {
  return PREPROCESSING_PSEUDOCODE[algorithm] ?? null;
}
