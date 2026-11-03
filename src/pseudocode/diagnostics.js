export const Severity = Object.freeze({
  ERROR: "error",
  WARNING: "warning",
});

export function createDiagnostic({
  severity,
  code,
  message,
  studentMessage,
  line,
  column = 1,
  endLine,
  endColumn,
  ruleId = null,
  source,
}) {
  return {
    severity,
    code,
    message,
    studentMessage: studentMessage ?? message,
    line,
    column,
    endLine: endLine ?? line,
    endColumn: endColumn ?? column + 1,
    ruleId,
    source,
  };
}

export function sortDiagnostics(diagnostics) {
  return [...diagnostics].sort((a, b) => {
    if (a.line !== b.line) return a.line - b.line;
    if (a.column !== b.column) return a.column - b.column;
    if (a.severity !== b.severity) {
      return a.severity === Severity.ERROR ? -1 : 1;
    }
    return 0;
  });
}

export function countBySeverity(diagnostics) {
  let errors = 0;
  let warnings = 0;

  for (const d of diagnostics) {
    if (d.severity === Severity.ERROR) errors++;
    else if (d.severity === Severity.WARNING) warnings++;
  }

  return { errors, warnings };
}