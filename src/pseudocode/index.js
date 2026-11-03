export { validate } from "./validate.js";
export {
  tokenize,
  TokenType,
} from "./lexer.js";

export { parse } from "./parser.js";

export {
  checkIndentation,
} from "./indentation.js";

export {
  checkVariables,
  BUILTIN_NAMES,
} from "./variables.js";

export {
  checkArrays,
} from "./arrays.js";

export {
  checkSemantics,
} from "./semantic.js";

export {
  Severity,
  createDiagnostic,
  sortDiagnostics,
  countBySeverity,
} from "./diagnostics.js";

export {
  getRuleIdForCode,
  RULE_LINKS,
} from "./ruleLinks.js";

// PHASE 11 -- pseudocode execution engine.
export {
  execute,
  executeSource,
  RuntimeErrorType,
} from "./interpreter.js";

// PHASE 13 -- first-divergence detector.
export {
  findFirstDivergence,
  CATEGORY_LABELS,
} from "./firstDivergence.js";