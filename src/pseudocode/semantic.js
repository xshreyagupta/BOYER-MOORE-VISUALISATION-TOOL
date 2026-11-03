// PHASE 10 -- Semantic validation.
//
// Checks that go beyond "is this grammatically well-formed" (parser.js)
// into "does this actually make sense", grounded in the Rulebook's own
// rules.
//
// Checks:
//   - RETURN only makes sense inside a FUNCTION.
//   - A FUNCTION with a body but no RETURN gets a warning.
//   - MAX(a, b) / MIN(a, b) require exactly two arguments.
//   - Calls to unknown functions are errors.
//   - Empty blocks are warnings.

import { createDiagnostic } from "./diagnostics.js";

const BUILTIN_FUNCTIONS = new Set(["MAX", "MIN"]);

function collectFunctionNames(statements, names) {
  for (const stmt of statements) {
    if (stmt.type === "Function" && stmt.name) {
      names.add(stmt.name);
    }

    for (const key of ["thenBody", "elseBody", "body"]) {
      if (Array.isArray(stmt[key])) {
        collectFunctionNames(stmt[key], names);
      }
    }
  }
}

function containsReturn(statements) {
  for (const stmt of statements) {
    if (stmt.type === "Return") {
      return true;
    }

    if (stmt.type === "Function") {
      continue;
    }

    for (const key of ["thenBody", "elseBody", "body"]) {
      if (
        Array.isArray(stmt[key]) &&
        containsReturn(stmt[key])
      ) {
        return true;
      }
    }
  }

  return false;
}

function checkCallExpr(expr, knownFunctions, diagnostics) {
  if (!expr) return;

  switch (expr.type) {
    case "Call": {
      const upper = expr.name.toUpperCase();

      if (BUILTIN_FUNCTIONS.has(upper)) {
        if (expr.args.length !== 2) {
          diagnostics.push(
            createDiagnostic({
              severity: "error",
              code: "max-min-arity",
              message: `${upper} expects exactly 2 arguments, got ${expr.args.length}.`,
              studentMessage: `${upper}(a, b) always takes exactly two values -- it got ${expr.args.length}.`,
              line: expr.line,
              column: expr.column,
              ruleId: "max-min",
              source: "semantic",
            })
          );
        }
      } else if (!knownFunctions.has(expr.name)) {
        diagnostics.push(
          createDiagnostic({
            severity: "error",
            code: "unknown-function-call",
            message: `"${expr.name}(...)" is called, but no FUNCTION named "${expr.name}" is defined.`,
            studentMessage: `There's no FUNCTION ${expr.name}(...) defined anywhere -- define it first, use MAX/MIN, or check for a typo.`,
            line: expr.line,
            column: expr.column,
            endColumn: expr.column + expr.name.length,
            ruleId: "functions",
            source: "semantic",
          })
        );
      }

      for (const arg of expr.args) {
        checkCallExpr(arg, knownFunctions, diagnostics);
      }

      break;
    }

    case "Index":
      checkCallExpr(expr.object, knownFunctions, diagnostics);
      checkCallExpr(expr.index, knownFunctions, diagnostics);
      break;

    case "Unary":
      checkCallExpr(expr.operand, knownFunctions, diagnostics);
      break;

    case "Binary":
    case "Logical":
      checkCallExpr(expr.left, knownFunctions, diagnostics);
      checkCallExpr(expr.right, knownFunctions, diagnostics);
      break;

    default:
      break;
  }
}

function checkEmptyBlock(stmt, diagnostics) {
  const emptyBodyMessage = (keyword) => ({
    severity: "warning",
    code: "empty-block",
    message: `${keyword} block has no statements in it.`,
    studentMessage: `This ${keyword} block is empty -- add its body, or remove the ${keyword} if it isn't needed.`,
    line: stmt.line,
    column: 1,
    ruleId: "block-structure",
    source: "semantic",
  });

  if (stmt.type === "If" && stmt.thenBody.length === 0) {
    diagnostics.push(createDiagnostic(emptyBodyMessage("IF")));
  }

  if (
    stmt.type === "If" &&
    stmt.elseBody &&
    stmt.elseBody.length === 0
  ) {
    diagnostics.push(createDiagnostic(emptyBodyMessage("ELSE")));
  }

  if (
    stmt.type === "While" &&
    stmt.body.length === 0
  ) {
    diagnostics.push(createDiagnostic(emptyBodyMessage("WHILE")));
  }

  if (
    stmt.type === "For" &&
    stmt.body.length === 0
  ) {
    diagnostics.push(createDiagnostic(emptyBodyMessage("FOR")));
  }

  if (
    stmt.type === "Function" &&
    stmt.body.length === 0
  ) {
    diagnostics.push(
      createDiagnostic(emptyBodyMessage("FUNCTION"))
    );
  }
}

function walkStatements(
  statements,
  insideFunction,
  knownFunctions,
  diagnostics
) {
  for (const stmt of statements) {
    checkEmptyBlock(stmt, diagnostics);

    switch (stmt.type) {
      case "Assignment":
        if (stmt.target.type === "Index") {
          checkCallExpr(
            stmt.target.index,
            knownFunctions,
            diagnostics
          );
        }

        checkCallExpr(
          stmt.value,
          knownFunctions,
          diagnostics
        );
        break;

      case "If":
        checkCallExpr(
          stmt.condition,
          knownFunctions,
          diagnostics
        );

        walkStatements(
          stmt.thenBody,
          insideFunction,
          knownFunctions,
          diagnostics
        );

        if (stmt.elseBody) {
          walkStatements(
            stmt.elseBody,
            insideFunction,
            knownFunctions,
            diagnostics
          );
        }
        break;

      case "While":
        checkCallExpr(
          stmt.condition,
          knownFunctions,
          diagnostics
        );

        walkStatements(
          stmt.body,
          insideFunction,
          knownFunctions,
          diagnostics
        );
        break;

      case "For":
        checkCallExpr(
          stmt.start,
          knownFunctions,
          diagnostics
        );

        checkCallExpr(
          stmt.end,
          knownFunctions,
          diagnostics
        );

        walkStatements(
          stmt.body,
          insideFunction,
          knownFunctions,
          diagnostics
        );
        break;

      case "Function":
        if (
          stmt.body.length > 0 &&
          !containsReturn(stmt.body)
        ) {
          diagnostics.push(
            createDiagnostic({
              severity: "warning",
              code: "function-missing-return",
              message: `FUNCTION "${stmt.name ?? ""}" never RETURNs a value.`,
              studentMessage: `This function doesn't RETURN anything -- if it's meant to produce a value, add a RETURN statement.`,
              line: stmt.line,
              column: 1,
              ruleId: "return",
              source: "semantic",
            })
          );
        }

        walkStatements(
          stmt.body,
          true,
          knownFunctions,
          diagnostics
        );
        break;

      case "Return":
        if (!insideFunction) {
          diagnostics.push(
            createDiagnostic({
              severity: "error",
              code: "return-outside-function",
              message: `RETURN used outside of a FUNCTION.`,
              studentMessage: `RETURN only makes sense inside a FUNCTION -- it sends a value back to whatever called that function.`,
              line: stmt.line,
              column: stmt.column ?? 1,
              ruleId: "return",
              source: "semantic",
            })
          );
        }

        checkCallExpr(
          stmt.value,
          knownFunctions,
          diagnostics
        );
        break;

      default:
        break;
    }
  }
}

export function checkSemantics(ast) {
  const diagnostics = [];
  const knownFunctions = new Set();

  collectFunctionNames(ast.body, knownFunctions);

  walkStatements(
    ast.body,
    false,
    knownFunctions,
    diagnostics
  );

  return diagnostics;
}