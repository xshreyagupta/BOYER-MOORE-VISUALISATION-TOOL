// PHASE 11 -- Runtime (execution-time) error types.
//
// Separate from Phase 10 validation diagnostics.
//
// Phase 10:
// "Your pseudocode is invalid."
//
// Phase 11:
// "Your pseudocode is valid, but execution failed."

export const RuntimeErrorType = Object.freeze({
  DIVISION_BY_ZERO: "division-by-zero",
  INDEX_OUT_OF_BOUNDS: "index-out-of-bounds",
  INVALID_ARRAY_ACCESS: "invalid-array-access",
  UNDEFINED_VARIABLE: "undefined-runtime-value",
  UNDEFINED_FUNCTION: "undefined-function",
  INVALID_OPERATION: "invalid-operation",
  ARITY_MISMATCH: "arity-mismatch",
  EXCESSIVE_RECURSION: "excessive-recursion",
  STEP_LIMIT: "step-limit",
  INVALID_AST: "invalid-ast",
});

export class PseudocodeRuntimeError extends Error {
  constructor({
    type,
    message,
    studentMessage,
    line,
    column,
  }) {
    super(message);

    this.name = "PseudocodeRuntimeError";
    this.type = type;
    this.studentMessage =
      studentMessage ?? message;
    this.line = line ?? null;
    this.column = column ?? null;
  }

  toDiagnostic() {
    return {
      type: this.type,
      message: this.message,
      studentMessage: this.studentMessage,
      line: this.line,
      column: this.column,
    };
  }
}

export function runtimeError(
  type,
  message,
  studentMessage,
  node
) {
  return new PseudocodeRuntimeError({
    type,
    message,
    studentMessage,
    line: node?.line ?? null,
    column: node?.column ?? null,
  });
}