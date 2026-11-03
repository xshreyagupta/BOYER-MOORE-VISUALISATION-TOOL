export const RULE_LINKS = Object.freeze({
  // lexer
  "unrecognized-character": "variables",

  // parser / syntax
  "expected-arrow": "variables",
  "expected-expression": "assignment",
  "unexpected-token": "block-structure",
  "expected-then": "if",
  "expected-end-if": "if",
  "unmatched-else": "if-else",
  "expected-do-while": "while",
  "expected-end-while": "while",
  "expected-do-for": "for",
  "expected-to-or-downto": "for",
  "expected-end-for": "for",
  "expected-function-name": "functions",
  "expected-params": "functions",
  "expected-end-function": "functions",
  "return-outside-function": "return",
  "expected-identifier": "variables",
  "expected-rbracket": "arrays",
  "expected-rparen": "max-min",
  "unclosed-block": "block-structure",
  "mismatched-end": "block-structure",

  // indentation
  "inconsistent-indentation": "indentation",
  "unindented-block-body": "indentation",

  // variables
  "used-before-assigned": "variables",
  "undeclared-variable": "variables",
  "assignment-target-not-variable": "variables",

  // arrays
  "negative-literal-index": "arrays",
  "inconsistent-array-usage": "arrays",

  // semantic
  "max-min-arity": "max-min",
  "unknown-function-call": "functions",
  "function-missing-return": "return",
  "empty-block": "block-structure",
});

export function getRuleIdForCode(code) {
  return RULE_LINKS[code] ?? null;
}