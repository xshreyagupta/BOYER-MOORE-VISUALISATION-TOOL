// PHASE 10 -- "Load Example" starter templates.
//
// Unlike pseudocodePlaceholders.js (Phase 8's comment-only scaffolds,
// written before a real pseudocode language existed), these are actual
// pseudocode written in the grammar the Phase 10 validator accepts.
//
// `text`, `pattern`, `n` (text length), and `m` (pattern length) are the
// implicit search inputs.
//
// NOTE ON DESIGN: this pseudocode language only allows whole-number array
// indices (see expressionEvaluator.js) and has no character-code / ORD
// builtin, so a "last occurrence" table cannot honestly be keyed by
// character the way a real implementation would key it by alphabet symbol.
// Rather than fake that with a table indexed by pattern position (which
// silently turns the heuristic into a no-op), these templates compute the
// bad-character and good-suffix shifts directly against the pattern's
// actual characters with small nested loops. It's less efficient than the
// textbook O(1)-lookup preprocessing tables, but it is a real, inspectable
// computation a student can step through -- not a hardcoded/fake result.

import { ALGORITHMS } from "../engine/index.js";

const BAD_CHARACTER = `// Bad Character heuristic
FUNCTION badCharacterSearch()
  s ← 0
  WHILE s ≤ n - m DO
    j ← m - 1
    WHILE j ≥ 0 AND pattern[j] = text[s + j] DO
      j ← j - 1
    END WHILE

    IF j < 0 THEN
      matchFound ← s
      IF s + m < n THEN
        lastOccurrence ← -1
        k ← m - 1
        WHILE k ≥ 0 AND lastOccurrence = -1 DO
          IF pattern[k] = text[s + m] THEN
            lastOccurrence ← k
          END IF
          k ← k - 1
        END WHILE

        badCharacterShift ← MAX(1, m - lastOccurrence)
        s ← s + badCharacterShift
      ELSE
        s ← s + 1
      END IF
    ELSE
      lastOccurrence ← -1
      k ← j - 1
      WHILE k ≥ 0 AND lastOccurrence = -1 DO
        IF pattern[k] = text[s + j] THEN
          lastOccurrence ← k
        END IF
        k ← k - 1
      END WHILE

      badCharacterShift ← MAX(1, j - lastOccurrence)
      s ← s + badCharacterShift
    END IF
  END WHILE

  RETURN matchFound
END FUNCTION
`;

const GOOD_SUFFIX = `// Good Suffix heuristic
FUNCTION goodSuffixSearch()
  s ← 0
  WHILE s ≤ n - m DO
    j ← m - 1
    WHILE j ≥ 0 AND pattern[j] = text[s + j] DO
      j ← j - 1
    END WHILE

    IF j < 0 THEN
      matchFound ← s
      trialShift ← 1
      found ← 0
      WHILE found = 0 AND trialShift ≤ m DO
        consistent ← 1
        p ← 0
        WHILE consistent = 1 AND p ≤ m - 1 DO
          IF p - trialShift ≥ 0 THEN
            IF pattern[p - trialShift] ≠ pattern[p] THEN
              consistent ← 0
            END IF
          END IF
          p ← p + 1
        END WHILE

        IF consistent = 1 THEN
          found ← 1
          goodSuffixShift ← trialShift
        ELSE
          trialShift ← trialShift + 1
        END IF
      END WHILE

      IF found = 0 THEN
        goodSuffixShift ← m
      END IF

      s ← s + MAX(1, goodSuffixShift)
    ELSE
      trialShift ← 1
      found ← 0
      WHILE found = 0 AND trialShift ≤ m DO
        consistent ← 1
        p ← j + 1
        WHILE consistent = 1 AND p ≤ m - 1 DO
          IF p - trialShift ≥ 0 THEN
            IF pattern[p - trialShift] ≠ pattern[p] THEN
              consistent ← 0
            END IF
          END IF
          p ← p + 1
        END WHILE

        IF consistent = 1 THEN
          found ← 1
          goodSuffixShift ← trialShift
        ELSE
          trialShift ← trialShift + 1
        END IF
      END WHILE

      IF found = 0 THEN
        goodSuffixShift ← m
      END IF

      s ← s + MAX(1, goodSuffixShift)
    END IF
  END WHILE

  RETURN matchFound
END FUNCTION
`;

const FULL = `// Full Boyer-Moore -- Bad Character and Good Suffix together
FUNCTION fullBoyerMoore()
  s ← 0
  WHILE s ≤ n - m DO
    j ← m - 1
    WHILE j ≥ 0 AND pattern[j] = text[s + j] DO
      j ← j - 1
    END WHILE

    IF j < 0 THEN
      matchFound ← s
      trialShift ← 1
      found ← 0
      WHILE found = 0 AND trialShift ≤ m DO
        consistent ← 1
        p ← 0
        WHILE consistent = 1 AND p ≤ m - 1 DO
          IF p - trialShift ≥ 0 THEN
            IF pattern[p - trialShift] ≠ pattern[p] THEN
              consistent ← 0
            END IF
          END IF
          p ← p + 1
        END WHILE

        IF consistent = 1 THEN
          found ← 1
          goodSuffixShift ← trialShift
        ELSE
          trialShift ← trialShift + 1
        END IF
      END WHILE

      IF found = 0 THEN
        goodSuffixShift ← m
      END IF

      s ← s + MAX(1, goodSuffixShift)
    ELSE
      lastOccurrence ← -1
      k ← j - 1
      WHILE k ≥ 0 AND lastOccurrence = -1 DO
        IF pattern[k] = text[s + j] THEN
          lastOccurrence ← k
        END IF
        k ← k - 1
      END WHILE

      badCharacterShift ← MAX(1, j - lastOccurrence)

      trialShift ← 1
      found ← 0
      WHILE found = 0 AND trialShift ≤ m DO
        consistent ← 1
        p ← j + 1
        WHILE consistent = 1 AND p ≤ m - 1 DO
          IF p - trialShift ≥ 0 THEN
            IF pattern[p - trialShift] ≠ pattern[p] THEN
              consistent ← 0
            END IF
          END IF
          p ← p + 1
        END WHILE

        IF consistent = 1 THEN
          found ← 1
          goodSuffixShift ← trialShift
        ELSE
          trialShift ← trialShift + 1
        END IF
      END WHILE

      IF found = 0 THEN
        goodSuffixShift ← m
      END IF

      shift ← MAX(badCharacterShift, goodSuffixShift)
      s ← s + shift
    END IF
  END WHILE

  RETURN matchFound
END FUNCTION
`;

const STARTER_TEMPLATES = Object.freeze({
  [ALGORITHMS.BAD_CHARACTER]: BAD_CHARACTER,
  [ALGORITHMS.GOOD_SUFFIX]: GOOD_SUFFIX,
  [ALGORITHMS.FULL]: FULL,
});

export function getStarterTemplate(algorithm) {
  return (
    STARTER_TEMPLATES[algorithm] ??
    "// No example available for this algorithm yet.\n"
  );
}