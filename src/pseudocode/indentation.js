import { createDiagnostic } from "./diagnostics.js";

function leadingSpaces(rawLine) {
  const match = /^ */.exec(rawLine ?? "");
  return match ? match[0].length : 0;
}

function checkLine(lineNo, expectedIndent, rawLines, diagnostics, seen) {
  if (lineNo == null || seen.has(lineNo)) return;

  seen.add(lineNo);

  const raw = rawLines[lineNo - 1] ?? "";
  if (raw.trim() === "") return;

  const actual = leadingSpaces(raw);

  if (actual !== expectedIndent) {
    diagnostics.push(
      createDiagnostic({
        severity: "warning",
        code: "inconsistent-indentation",
        message: `Line ${lineNo} is indented ${actual} space${actual === 1 ? "" : "s"}, expected ${expectedIndent}.`,
        studentMessage: `Indent this line ${expectedIndent} space${expectedIndent === 1 ? "" : "s"} (2 spaces per nesting level) so the block structure is easy to read.`,
        line: lineNo,
        column: 1,
        ruleId: "indentation",
        source: "indentation",
      })
    );
  }
}

function walkBlock(statements, depth, rawLines, diagnostics, seen) {
  for (const stmt of statements) {
    checkLine(stmt.line, depth * 2, rawLines, diagnostics, seen);
    walkStatement(stmt, depth, rawLines, diagnostics, seen);
  }
}

function walkStatement(stmt, depth, rawLines, diagnostics, seen) {
  switch (stmt.type) {
    case "If":
      walkBlock(stmt.thenBody, depth + 1, rawLines, diagnostics, seen);

      if (stmt.elseLine != null) {
        checkLine(stmt.elseLine, depth * 2, rawLines, diagnostics, seen);
      }

      if (stmt.elseBody) {
        walkBlock(stmt.elseBody, depth + 1, rawLines, diagnostics, seen);
      }

      checkLine(stmt.endLine, depth * 2, rawLines, diagnostics, seen);
      break;

    case "While":
    case "For":
      walkBlock(stmt.body, depth + 1, rawLines, diagnostics, seen);
      checkLine(stmt.endLine, depth * 2, rawLines, diagnostics, seen);
      break;

    case "Function":
      walkBlock(stmt.body, depth + 1, rawLines, diagnostics, seen);
      checkLine(stmt.endLine, depth * 2, rawLines, diagnostics, seen);
      break;

    default:
      break;
  }
}

export function checkIndentation(ast, rawLines) {
  const diagnostics = [];
  const seen = new Set();

  walkBlock(ast.body, 0, rawLines, diagnostics, seen);

  return diagnostics;
}