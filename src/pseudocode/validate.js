// PHASE 10 -- Validation pipeline.
//
// Orchestrates the lexer -> parser -> indentation/variables/arrays/semantic
// passes into a single `validate(source)` entry point. This is the one
// function the UI (and Phase 11's executeSource) call to find out whether a
// student's pseudocode is safe to run.
//
// If the source can't even be tokenized or parsed cleanly, we stop there --
// running the later structural passes (indentation/variables/arrays/
// semantic) against a broken AST would only produce confusing, cascading
// diagnostics that don't actually help the student.

import { tokenize } from "./lexer.js";
import { parse } from "./parser.js";
import { checkIndentation } from "./indentation.js";
import { checkVariables } from "./variables.js";
import { checkArrays } from "./arrays.js";
import { checkSemantics } from "./semantic.js";
import {
  Severity,
  createDiagnostic,
  sortDiagnostics,
  countBySeverity,
} from "./diagnostics.js";
import { getRuleIdForCode } from "./ruleLinks.js";

function attachRuleId(diagnostic) {
  if (diagnostic.ruleId) {
    return diagnostic;
  }

  return {
    ...diagnostic,
    ruleId: getRuleIdForCode(diagnostic.code),
  };
}

function lexerErrorToDiagnostic(error) {
  return createDiagnostic({
    severity: Severity.ERROR,
    code: "unrecognized-character",
    message: error.message,
    studentMessage: error.message,
    line: error.line,
    column: error.column,
    endColumn: error.endColumn,
    source: "lexer",
  });
}

export function validate(source) {
  const rawLines = (source ?? "").split("\n");

  const { tokens, errors: lexerErrors } = tokenize(
    source ?? ""
  );

  if (lexerErrors.length > 0) {
    const diagnostics = sortDiagnostics(
      lexerErrors.map((error) =>
        attachRuleId(lexerErrorToDiagnostic(error))
      )
    );

    const { errors, warnings } =
      countBySeverity(diagnostics);

    return {
      valid: errors === 0,
      diagnostics,
      errorCount: errors,
      warningCount: warnings,
      ast: null,
    };
  }

  const ast = parse(tokens);

  const parseErrors = ast.diagnostics.filter(
    (d) => d.severity === Severity.ERROR
  );

  if (parseErrors.length > 0) {
    const diagnostics = sortDiagnostics(
      ast.diagnostics.map(attachRuleId)
    );

    const { errors, warnings } =
      countBySeverity(diagnostics);

    return {
      valid: errors === 0,
      diagnostics,
      errorCount: errors,
      warningCount: warnings,
      ast: null,
    };
  }

  const structuralDiagnostics = [
    ...ast.diagnostics,
    ...checkIndentation(ast, rawLines),
    ...checkVariables(ast),
    ...checkArrays(ast),
    ...checkSemantics(ast),
  ].map(attachRuleId);

  const diagnostics = sortDiagnostics(
    structuralDiagnostics
  );

  const { errors, warnings } =
    countBySeverity(diagnostics);

  return {
    valid: errors === 0,
    diagnostics,
    errorCount: errors,
    warningCount: warnings,
    ast,
  };
}
