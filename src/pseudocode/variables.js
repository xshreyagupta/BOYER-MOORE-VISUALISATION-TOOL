import { createDiagnostic } from "./diagnostics.js";

export const BUILTIN_NAMES = Object.freeze([
  "text",
  "pattern",
  "n",
  "m",
]);

function collectAssignedNames(statements, names) {
  for (const stmt of statements) {
    switch (stmt.type) {
      case "Assignment": {
        const root =
          stmt.target.type === "Index"
            ? stmt.target.object
            : stmt.target;

        if (root && root.type === "Identifier") {
          names.add(root.name);
        }
        break;
      }

      case "If":
        collectAssignedNames(stmt.thenBody, names);

        if (stmt.elseBody) {
          collectAssignedNames(stmt.elseBody, names);
        }
        break;

      case "While":
        collectAssignedNames(stmt.body, names);
        break;

      case "For":
        if (stmt.variable) names.add(stmt.variable);
        collectAssignedNames(stmt.body, names);
        break;

      default:
        break;
    }
  }
}

function isKnown(name, scopeChain) {
  return scopeChain.some((set) => set.has(name));
}

function checkExpr(expr, scopeChain, diagnostics) {
  if (!expr) return;

  switch (expr.type) {
    case "Identifier":
      if (!isKnown(expr.name, scopeChain)) {
        diagnostics.push(
          createDiagnostic({
            severity: "error",
            code: "undeclared-variable",
            message: `"${expr.name}" is used but never assigned a value anywhere.`,
            studentMessage: `"${expr.name}" doesn't have a value yet -- assign it first with ${expr.name} ← ... (or check for a typo in the name).`,
            line: expr.line,
            column: expr.column,
            endColumn: expr.column + expr.name.length,
            ruleId: "variables",
            source: "variables",
          })
        );
      }
      break;

    case "Index":
      checkExpr(expr.object, scopeChain, diagnostics);
      checkExpr(expr.index, scopeChain, diagnostics);
      break;

    case "Call":
      for (const arg of expr.args) {
        checkExpr(arg, scopeChain, diagnostics);
      }
      break;

    case "Unary":
      checkExpr(expr.operand, scopeChain, diagnostics);
      break;

    case "Binary":
    case "Logical":
      checkExpr(expr.left, scopeChain, diagnostics);
      checkExpr(expr.right, scopeChain, diagnostics);
      break;

    default:
      break;
  }
}

function checkStatements(statements, scopeChain, diagnostics) {
  for (const stmt of statements) {
    switch (stmt.type) {
      case "Assignment":
        if (stmt.target.type === "Index") {
          checkExpr(stmt.target.index, scopeChain, diagnostics);
        }
        checkExpr(stmt.value, scopeChain, diagnostics);
        break;

      case "If":
        checkExpr(stmt.condition, scopeChain, diagnostics);
        checkStatements(stmt.thenBody, scopeChain, diagnostics);

        if (stmt.elseBody) {
          checkStatements(stmt.elseBody, scopeChain, diagnostics);
        }
        break;

      case "While":
        checkExpr(stmt.condition, scopeChain, diagnostics);
        checkStatements(stmt.body, scopeChain, diagnostics);
        break;

      case "For":
        checkExpr(stmt.start, scopeChain, diagnostics);
        checkExpr(stmt.end, scopeChain, diagnostics);
        checkStatements(stmt.body, scopeChain, diagnostics);
        break;

      case "Function": {
        const localNames = new Set(stmt.params ?? []);
        collectAssignedNames(stmt.body, localNames);

        checkStatements(
          stmt.body,
          [localNames, ...scopeChain],
          diagnostics
        );
        break;
      }

      case "Return":
        checkExpr(stmt.value, scopeChain, diagnostics);
        break;

      default:
        break;
    }
  }
}

export function checkVariables(ast) {
  const diagnostics = [];
  const globalNames = new Set(BUILTIN_NAMES);

  collectAssignedNames(ast.body, globalNames);
  checkStatements(ast.body, [globalNames], diagnostics);

  return diagnostics;
}