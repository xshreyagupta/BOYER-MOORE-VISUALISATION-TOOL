// PHASE 9 -- Pseudocode Rulebook content.
//
// This module defines the EXACT syntax the Practice Lab's pseudocode
// language will accept once a real parser exists (Phase 10-11). It is pure
// data, framework-agnostic, and mirrors the shape ui/data/pseudocode.js
// already uses for the Phase 1-7 algorithm pseudocode: plain objects a
// component renders, never markup baked into strings.
//
// IMPORTANT: nothing here is executed, parsed, or validated. It is
// educational content only -- see RULEBOOK_SECTIONS[i].valid/.invalid for
// examples of what correct/incorrect syntax LOOKS like, not a working
// checker.
//
// `practiceLink` on a section is optional; when present it renders a
// "PRACTICE ..." button that hands off to the Write Pseudocode tab
// (algorithm: null keeps whatever algorithm is currently selected,
// otherwise it switches to the named algorithm -- see PracticeLab.jsx).

import { ALGORITHMS } from "../engine/index.js";

export const LEVELS = Object.freeze({
  BEGINNER: "beginner",
  CONTROL_FLOW: "control-flow",
  STRUCTURE: "structure",
  BOYER_MOORE: "boyer-moore",
});

export const LEVEL_LABELS = Object.freeze({
  [LEVELS.BEGINNER]: "Beginner",
  [LEVELS.CONTROL_FLOW]: "Control Flow",
  [LEVELS.STRUCTURE]: "Structure",
  [LEVELS.BOYER_MOORE]: "Boyer-Moore Specific",
});

// Order here is the progressive-learning order (requirement 24): beginner
// syntax first, then control flow, then structure, then algorithm-specific
// rules. RulebookToc groups by `level` in this same order.
export const RULEBOOK_SECTIONS = [
  // ---------------------------------------------------------------- BEGINNER
  {
    id: "variables",
    level: LEVELS.BEGINNER,
    title: "Variables",
    explanation:
      "A variable holds a value. Assign to it with \u2190 (read as \u201cgets\u201d). The variable name always goes on the LEFT.",
    examples: [{ code: "i \u2190 0\nj \u2190 m - 1\nshift \u2190 1", caption: "Three variables being assigned a starting value." }],
    valid: { code: "i \u2190 0", note: "Variable on the left, value on the right." },
    invalid: { code: "0 \u2190 i", note: "\u2190 always assigns INTO a variable -- a literal can never be the target." },
  },
  {
    id: "assignment",
    level: LEVELS.BEGINNER,
    title: "Assignment",
    explanation:
      "The expression on the right of \u2190 is evaluated first, then stored into the variable on the left. The variable can appear on both sides.",
    examples: [{ code: "i \u2190 i + 1\nj \u2190 j - 1\nshift \u2190 maxShift", caption: "Updating a variable in terms of itself." }],
    predict: {
      code: "j \u2190 4\nj \u2190 j - 1",
      question: "After both lines run, what is j?",
      answer: "3",
    },
  },
  {
    id: "arithmetic",
    level: LEVELS.BEGINNER,
    title: "Arithmetic Operators",
    explanation: "Five arithmetic operators are supported: + - * / and % (remainder).",
    examples: [{ code: "i \u2190 i + 1\nj \u2190 m - 1\nremainder \u2190 i % 2", caption: "Increment, offset from a length, and a remainder check." }],
  },
  {
    id: "comparisons",
    level: LEVELS.BEGINNER,
    title: "Comparison Operators",
    explanation:
      "= \u2260 < > \u2264 \u2265 compare two values and produce a true/false condition -- they never assign anything.",
    examples: [{ code: "i < n\nj \u2265 0\ntext[i] = pattern[j]", caption: "Three conditions, each true or false." }],
  },
  {
    id: "logical-operators",
    level: LEVELS.BEGINNER,
    title: "Logical Operators",
    explanation: "AND, OR, and NOT combine or invert conditions, the same way they do in ordinary logic.",
    examples: [
      { code: "j \u2265 0 AND text[i] = pattern[j]", caption: "Both conditions must be true." },
      { code: "condition1 OR condition2", caption: "At least one must be true." },
      { code: "NOT condition", caption: "True exactly when condition is false." },
    ],
  },

  // ------------------------------------------------------------ CONTROL FLOW
  {
    id: "if",
    level: LEVELS.CONTROL_FLOW,
    title: "IF",
    explanation:
      "IF starts a conditional block, THEN begins its body, and END IF closes it. Indentation shows what's inside the block.",
    examples: [{ code: "IF text[i] = pattern[j] THEN\n    j \u2190 j - 1\nEND IF", caption: "Only decrement j when the characters match." }],
    valid: { code: "IF j \u2265 0 THEN\n    j \u2190 j - 1\nEND IF", note: "THEN and END IF are both present." },
    invalid: { code: "IF j \u2265 0\n    j \u2190 j - 1\nEND IF", note: "THEN is required by this pseudocode language." },
  },
  {
    id: "if-else",
    level: LEVELS.CONTROL_FLOW,
    title: "IF / ELSE",
    explanation: "ELSE adds a second body that runs only when the condition is false. One IF ... END IF still closes the whole thing.",
    examples: [
      {
        code: "IF text[i] = pattern[j] THEN\n    j \u2190 j - 1\nELSE\n    shift \u2190 1\nEND IF",
        caption: "Decrement on a match, otherwise fall back to a shift of 1.",
      },
    ],
  },
  {
    id: "while",
    level: LEVELS.CONTROL_FLOW,
    title: "WHILE",
    explanation: "WHILE ... DO repeats its body for as long as the condition stays true. END WHILE closes the block.",
    examples: [{ code: "WHILE j \u2265 0 DO\n    j \u2190 j - 1\nEND WHILE", caption: "Counts j down to -1." }],
    valid: { code: "WHILE j \u2265 0 DO\n    j \u2190 j - 1\nEND WHILE", note: "DO and END WHILE both present." },
    invalid: { code: "WHILE j \u2265 0\n    j \u2190 j - 1", note: "Missing DO and missing END WHILE." },
  },
  {
    id: "for",
    level: LEVELS.CONTROL_FLOW,
    title: "FOR",
    explanation: "FOR ... TO ... DO counts a variable up from a starting value to an ending value, once per iteration.",
    examples: [{ code: "FOR i \u2190 0 TO n - 1 DO\n    table[i] \u2190 -1\nEND FOR", caption: "Initializes every entry of table to -1." }],
    practiceLink: { label: "PRACTICE LOOP SYNTAX", algorithm: null },
  },
  {
    id: "reverse-for",
    level: LEVELS.CONTROL_FLOW,
    title: "Reverse FOR",
    highlight: true,
    explanation:
      "FOR ... DOWNTO ... DO counts DOWN instead of up. This is central to Boyer-Moore, which compares a pattern against text from RIGHT TO LEFT.",
    examples: [{ code: "FOR j \u2190 m - 1 DOWNTO 0 DO\n    compare text[j] and pattern[j]\nEND FOR", caption: "Walks j from the last index down to 0." }],
  },

  // --------------------------------------------------------------- STRUCTURE
  {
    id: "functions",
    level: LEVELS.STRUCTURE,
    title: "Functions",
    explanation: "FUNCTION name(parameters) ... END FUNCTION defines a reusable procedure with its own body.",
    examples: [{ code: "FUNCTION buildTable(pattern)\n    ...\n    RETURN table\nEND FUNCTION", caption: "A function that builds and returns a table." }],
  },
  {
    id: "return",
    level: LEVELS.STRUCTURE,
    title: "RETURN",
    explanation: "RETURN sends a value back to whatever called the function.",
    examples: [{ code: "RETURN shift", caption: "Returns the computed shift." }],
  },
  {
    id: "arrays",
    level: LEVELS.STRUCTURE,
    title: "Arrays / Indexing",
    explanation: "text[i], pattern[j], and table[c] read one element out of an array. Indices are integers and counting starts at 0.",
    examples: [{ code: "text[0]\npattern[m - 1]", caption: "The first character of text; the last character of pattern." }],
  },
  {
    id: "max-min",
    level: LEVELS.STRUCTURE,
    title: "MAX / MIN",
    explanation: "MAX(a, b) and MIN(a, b) return the larger or smaller of two values.",
    examples: [{ code: "shift \u2190 MAX(badCharacterShift, goodSuffixShift)", caption: "Full Boyer-Moore always takes the larger valid shift." }],
  },
  {
    id: "comments",
    level: LEVELS.STRUCTURE,
    title: "Comments",
    explanation: "// starts a comment. Everything after // on that line is ignored.",
    examples: [{ code: "// This is a comment", caption: "Notes to yourself -- never executed." }],
  },
  {
    id: "indentation",
    level: LEVELS.STRUCTURE,
    title: "Indentation",
    explanation: "Indent the body of every block two spaces deeper than the line that opened it. This is what makes nested logic readable.",
    examples: [{ code: "IF mismatch THEN\n    badShift \u2190 ...\n    goodShift \u2190 ...\nEND IF", caption: "Both statements are indented inside the IF." }],
    valid: { code: "IF mismatch THEN\n    badShift \u2190 ...\nEND IF", note: "Body indented under IF." },
    invalid: { code: "IF mismatch THEN\nbadShift \u2190 ...\nEND IF", note: "The body isn't indented, so the block is hard to read." },
  },
  {
    id: "block-structure",
    level: LEVELS.STRUCTURE,
    title: "Block Structure",
    explanation:
      "Every IF, WHILE, FOR, and FUNCTION opens a block that must be closed with its matching END -- and blocks must close in the order they opened.",
    examples: [
      {
        code: "WHILE condition DO\n    IF otherCondition THEN\n        statement\n    END IF\nEND WHILE",
        caption: "The inner IF closes before the outer WHILE does.",
      },
    ],
  },

  // ------------------------------------------------------------ BOYER-MOORE
  {
    id: "bm-direction",
    level: LEVELS.BOYER_MOORE,
    title: "Comparison Direction",
    explanation: "Boyer-Moore compares the pattern against the text from RIGHT TO LEFT -- start at the last index of the pattern and count down.",
    examples: [{ code: "j \u2190 m - 1\n...\nj \u2190 j - 1", caption: "Start at the pattern's last index, then move left." }],
  },
  {
    id: "bm-alignment",
    level: LEVELS.BOYER_MOORE,
    title: "Alignment",
    explanation:
      "The pattern is lined up against some position in the text -- its \u201calignment\u201d. Your pseudocode's search state has to keep track of the current alignment as it shifts.",
    examples: [],
  },
  {
    id: "bm-mismatch",
    level: LEVELS.BOYER_MOORE,
    title: "Mismatch",
    explanation: "A mismatch is a text/pattern character pair that doesn't match. It's what triggers a shift computation.",
    examples: [{ code: "IF text[i] \u2260 pattern[j] THEN\n    ...\nEND IF", caption: "The conceptual shape of handling a mismatch -- not the full solution." }],
  },
  {
    id: "bm-bad-character",
    level: LEVELS.BOYER_MOORE,
    title: "Bad Character",
    explanation:
      "The Bad Character heuristic looks at the mismatched text character and proposes a shift based on where that character last occurs in the pattern.",
    examples: [],
  },
  {
    id: "bm-good-suffix",
    level: LEVELS.BOYER_MOORE,
    title: "Good Suffix",
    explanation:
      "The Good Suffix heuristic looks at the suffix of the pattern that DID match before the mismatch, and proposes a shift based on where that suffix occurs again.",
    examples: [],
  },
  {
    id: "bm-full",
    level: LEVELS.BOYER_MOORE,
    title: "Full Boyer-Moore",
    highlight: true,
    explanation: "Full Boyer-Moore runs both heuristics and always takes the LARGER valid shift -- that's the shift guaranteed not to skip a real match.",
    examples: [{ code: "badCharacterShift \u2190 ...\ngoodSuffixShift \u2190 ...\n\nshift \u2190 MAX(badCharacterShift, goodSuffixShift)", caption: "The rule every Full Boyer-Moore implementation follows." }],
    practiceLink: { label: "WRITE BOYER-MOORE PSEUDOCODE", algorithm: ALGORITHMS.FULL },
  },
];

// Requirement 22 -- compact syntax reference, scannable while writing.
export const CHEAT_SHEET = Object.freeze([
  { label: "Variable", code: "x \u2190 value" },
  { label: "IF", code: "IF condition THEN\n    ...\nEND IF" },
  { label: "IF / ELSE", code: "IF condition THEN\n    ...\nELSE\n    ...\nEND IF" },
  { label: "WHILE", code: "WHILE condition DO\n    ...\nEND WHILE" },
  { label: "FOR", code: "FOR i \u2190 0 TO n DO\n    ...\nEND FOR" },
  { label: "Reverse FOR", code: "FOR i \u2190 n DOWNTO 0 DO\n    ...\nEND FOR" },
  { label: "FUNCTION", code: "FUNCTION name(...)\n    ...\nEND FUNCTION" },
  { label: "RETURN", code: "RETURN value" },
  { label: "Array", code: "array[index]" },
  { label: "MAX / MIN", code: "MAX(a, b)\nMIN(a, b)" },
  { label: "Comment", code: "// comment" },
]);

export function getRulebookSection(id) {
  return RULEBOOK_SECTIONS.find((s) => s.id === id) ?? null;
}

export function getSectionsByLevel(level) {
  return RULEBOOK_SECTIONS.filter((s) => s.level === level);
}
