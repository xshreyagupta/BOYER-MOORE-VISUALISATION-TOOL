// PHASE 8 -- Pseudocode Practice: starter scaffolding.
//
// These are NOT solutions and not even valid pseudocode yet -- Phase 8 is
// foundation only (no pseudocode language, parser, or validator exists
// yet; that's Phase 9-11). Each starter is just a comment scaffold that
// orients the student toward what they'll eventually write here, per
// algorithm. Once the Pseudocode Rulebook (Phase 9) and the real language
// grammar exist, this file is expected to be replaced by starters written
// in the actual accepted syntax.

import { ALGORITHMS } from "../engine/index.js";

const PLACEHOLDERS = Object.freeze({
  [ALGORITHMS.BAD_CHARACTER]: `// Bad Character -- write your pseudocode here.
//
// The Pseudocode Rulebook (coming soon) will teach the exact syntax
// this editor accepts: variables, IF/WHILE/FOR, arrays, and the
// operators you can use.
//
// Think about:
//   - how the pattern is compared against the text, right to left
//   - what happens on a mismatch
//   - how far the pattern shifts before the next comparison
`,
  [ALGORITHMS.GOOD_SUFFIX]: `// Good Suffix -- write your pseudocode here.
//
// The Pseudocode Rulebook (coming soon) will teach the exact syntax
// this editor accepts: variables, IF/WHILE/FOR, arrays, and the
// operators you can use.
//
// Think about:
//   - what "the matched suffix" means after a mismatch
//   - how the good-suffix table is used to decide a shift
//   - how that shift differs from Bad Character's
`,
  [ALGORITHMS.FULL]: `// Full Boyer-Moore -- write your pseudocode here.
//
// The Pseudocode Rulebook (coming soon) will teach the exact syntax
// this editor accepts: variables, IF/WHILE/FOR, arrays, and the
// operators you can use.
//
// Think about:
//   - running Bad Character and Good Suffix together
//   - shift <- MAX(badCharacterShift, goodSuffixShift)
//   - why the larger valid shift is the safe one to take
`,
});

export function getPseudocodePlaceholder(algorithm) {
  return PLACEHOLDERS[algorithm] ?? "// Write your pseudocode here.\n";
}
