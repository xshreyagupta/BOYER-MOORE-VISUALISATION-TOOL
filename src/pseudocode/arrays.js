// PHASE 10 -- Array validation.
//
// Two focused, low-false-positive checks layered on top of the parser's
// structural guarantee that every `[` has a matching `]` around a real
// expression.
//
//   1. A literal negative index (e.g. text[-1]) is almost always a bug,
//      since this language's arrays are 0-indexed.
//   2. The same name used BOTH as an array (name[...]) and as a plain
//      variable (name) elsewhere is a common sign of a typo or a forgotten
//      index -- e.g. writing `shift ← table` when `table[i]` was meant.
//
// Both are warnings, not errors.

import { createDiagnostic } from "./diagnostics.js";

function isNegativeLiteral(expr) {
  return (
    expr &&
    expr.type === "Unary" &&
    expr.op === "-" &&
    expr.operand &&
    expr.operand.type === "NumberLiteral"
  );
}

function walkExpr(expr, ctx) {
  if (!expr) return;

  switch (expr.type) {
    case "Identifier":
      recordUsage(ctx, expr.name, "plain", expr);
      break;

    case "Index":
      recordUsage(ctx, expr.object.name, "array", expr.object);

      if (isNegativeLiteral(expr.index)) {
        ctx.diagnostics.push(
          createDiagnostic({
            severity: "warning",
            code: "negative-literal-index",
            message: `Array index is a negative literal.`,
            studentMessage: `${expr.object.name}[${
              expr.index.operand
                ? "-" + expr.index.operand.value
                : "..."
            }] uses a negative constant index -- this language's arrays start at 0, so a fixed negative index is almost always a mistake.`,
            line: expr.index.line,
            column: expr.index.column,
            ruleId: "arrays",
            source: "arrays",
          })
        );
      }

      walkExpr(expr.index, ctx);
      break;

    case "Call":
      for (const arg of expr.args) {
        walkExpr(arg, ctx);
      }
      break;

    case "Unary":
      walkExpr(expr.operand, ctx);
      break;

    case "Binary":
    case "Logical":
      walkExpr(expr.left, ctx);
      walkExpr(expr.right, ctx);
      break;

    default:
      break;
  }
}

function recordUsage(ctx, name, kind, node) {
  if (!name) return;

  if (!ctx.usage.has(name)) {
    ctx.usage.set(name, {});
  }

  const entry = ctx.usage.get(name);

  if (!entry[kind]) {
    entry[kind] = node;
  }
}

function walkStatements(statements, ctx) {
  for (const stmt of statements) {
    switch (stmt.type) {
      case "Assignment":
        if (stmt.target.type === "Index") {
          recordUsage(
            ctx,
            stmt.target.object.name,
            "array",
            stmt.target.object
          );

          if (isNegativeLiteral(stmt.target.index)) {
            ctx.diagnostics.push(
              createDiagnostic({
                severity: "warning",
                code: "negative-literal-index",
                message: `Array index is a negative literal.`,
                studentMessage: `${stmt.target.object.name}[...] is assigned using a negative constant index -- this language's arrays start at 0, so a fixed negative index is almost always a mistake.`,
                line: stmt.target.index.line,
                column: stmt.target.index.column,
                ruleId: "arrays",
                source: "arrays",
              })
            );
          }

          walkExpr(stmt.target.index, ctx);
        } else {
          recordUsage(
            ctx,
            stmt.target.name,
            "plain",
            stmt.target
          );
        }

        walkExpr(stmt.value, ctx);
        break;

      case "If":
        walkExpr(stmt.condition, ctx);
        walkStatements(stmt.thenBody, ctx);

        if (stmt.elseBody) {
          walkStatements(stmt.elseBody, ctx);
        }
        break;

      case "While":
        walkExpr(stmt.condition, ctx);
        walkStatements(stmt.body, ctx);
        break;

      case "For":
        walkExpr(stmt.start, ctx);
        walkExpr(stmt.end, ctx);
        walkStatements(stmt.body, ctx);
        break;

      case "Function":
        walkStatements(stmt.body, ctx);
        break;

      case "Return":
        walkExpr(stmt.value, ctx);
        break;

      default:
        break;
    }
  }
}

export function checkArrays(ast) {
  const ctx = {
    diagnostics: [],
    usage: new Map(),
  };

  walkStatements(ast.body, ctx);

  for (const [name, entry] of ctx.usage) {
    if (entry.array && entry.plain) {
      ctx.diagnostics.push(
        createDiagnostic({
          severity: "warning",
          code: "inconsistent-array-usage",
          message: `"${name}" is used both as an array (${name}[...]) and as a plain variable (${name}).`,
          studentMessage: `"${name}" is indexed like an array in one place but used without "[...]" elsewhere -- double check whether a "[...]" is missing (or extra).`,
          line: entry.plain.line,
          column: entry.plain.column,
          endColumn: entry.plain.column + name.length,
          ruleId: "arrays",
          source: "arrays",
        })
      );
    }
  }

  return ctx.diagnostics;
}