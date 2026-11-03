import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { tokenize } from "../../src/pseudocode/lexer.js";
import { parse } from "../../src/pseudocode/parser.js";

function parseSource(source) {
  const { tokens } = tokenize(source);
  return parse(tokens);
}

describe("parser: expressions", () => {
  test("parses a simple assignment", () => {
    const ast = parseSource("i ← 0");

    assert.equal(ast.diagnostics.length, 0);
    assert.equal(ast.body.length, 1);
    assert.equal(ast.body[0].type, "Assignment");
    assert.equal(ast.body[0].target.name, "i");
    assert.equal(ast.body[0].value.type, "NumberLiteral");
    assert.equal(ast.body[0].value.value, 0);
  });

  test("parses array index assignment", () => {
    const ast = parseSource("table[i] ← -1");

    assert.equal(ast.diagnostics.length, 0);

    const stmt = ast.body[0];

    assert.equal(stmt.target.type, "Index");
    assert.equal(stmt.target.object.name, "table");
    assert.equal(stmt.target.index.name, "i");

    assert.equal(stmt.value.type, "Unary");
    assert.equal(stmt.value.op, "-");
  });

  test("respects arithmetic precedence: * before +", () => {
    const ast = parseSource(
      "x ← 1 + 2 * 3"
    );

    const value = ast.body[0].value;

    assert.equal(value.type, "Binary");
    assert.equal(value.op, "PLUS");

    assert.equal(value.right.type, "Binary");
    assert.equal(value.right.op, "STAR");
  });

  test("parentheses override precedence", () => {
    const ast = parseSource(
      "x ← (1 + 2) * 3"
    );

    const value = ast.body[0].value;

    assert.equal(value.op, "STAR");
    assert.equal(value.left.op, "PLUS");
  });

  test("parses comparison and logical operators with AND binding tighter than OR", () => {
    const ast = parseSource(
      "y ← 0\nx ← a = b OR c AND d"
    );

    const value = ast.body[1].value;

    assert.equal(value.type, "Logical");
    assert.equal(value.op, "OR");

    assert.equal(value.right.type, "Logical");
    assert.equal(value.right.op, "AND");
  });

  test("parses NOT as a unary prefix", () => {
    const ast = parseSource(
      "x ← 0\nIF NOT x = 0 THEN\n  x ← 1\nEND IF"
    );

    const cond = ast.body[1].condition;

    assert.equal(cond.type, "Unary");
    assert.equal(cond.op, "NOT");
  });

  test("parses a function call with arguments", () => {
    const ast = parseSource(
      "x ← MAX(1, 2)"
    );

    const value = ast.body[0].value;

    assert.equal(value.type, "Call");
    assert.equal(value.name, "MAX");
    assert.equal(value.args.length, 2);
  });

  test("parses array read access", () => {
    const ast = parseSource(
      "x ← text[i]"
    );

    const value = ast.body[0].value;

    assert.equal(value.type, "Index");
    assert.equal(value.object.name, "text");
    assert.equal(value.index.name, "i");
  });

  test("reports a missing arrow after an identifier", () => {
    const ast = parseSource("i 0");

    assert.ok(
      ast.diagnostics.some(
        (d) => d.code === "expected-arrow"
      )
    );
  });

  test("reports an unrecognized statement start", () => {
    const ast = parseSource("+ 1");

    assert.ok(
      ast.diagnostics.some(
        (d) => d.code === "unexpected-token"
      )
    );
  });

  test("reports a missing closing bracket", () => {
    const ast = parseSource(
      "x ← text[i"
    );

    assert.ok(
      ast.diagnostics.some(
        (d) => d.code === "expected-rbracket"
      )
    );
  });

  test("recovers after a syntax error and still parses the next line", () => {
    const ast = parseSource(
      "i 0\nj ← 1"
    );

    assert.ok(ast.diagnostics.length >= 1);

    const assignment = ast.body.find(
      (s) =>
        s.type === "Assignment" &&
        s.target.name === "j"
    );

    assert.ok(
      assignment,
      "expected the second line to still be parsed"
    );
  });

  test("every diagnostic carries a 1-based line and column", () => {
    const ast = parseSource("i 0");

    for (const d of ast.diagnostics) {
      assert.ok(d.line >= 1);
      assert.ok(d.column >= 1);
    }
  });
});