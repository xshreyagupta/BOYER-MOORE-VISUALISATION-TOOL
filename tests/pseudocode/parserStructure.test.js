import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { tokenize } from "../../src/pseudocode/lexer.js";
import { parse } from "../../src/pseudocode/parser.js";

function parseSource(source) {
  const { tokens } = tokenize(source);
  return parse(tokens);
}

describe("parser: IF", () => {
  test("parses IF / THEN / END IF with no ELSE", () => {
    const ast = parseSource(
      "IF j ≥ 0 THEN\n  j ← j - 1\nEND IF"
    );

    assert.equal(ast.diagnostics.length, 0);
    assert.equal(ast.body[0].type, "If");
    assert.equal(ast.body[0].thenBody.length, 1);
    assert.equal(ast.body[0].elseBody, null);
  });

  test("parses IF / ELSE / END IF", () => {
    const ast = parseSource(
      "IF x = 0 THEN\n  y ← 1\nELSE\n  y ← 2\nEND IF"
    );

    assert.equal(ast.diagnostics.length, 0);
    assert.equal(
      ast.body[0].elseBody.length,
      1
    );
  });

  test("reports a missing THEN", () => {
    const ast = parseSource(
      "IF j ≥ 0\n  j ← j - 1\nEND IF"
    );

    assert.ok(
      ast.diagnostics.some(
        (d) => d.code === "expected-then"
      )
    );
  });

  test("reports an unclosed IF block", () => {
    const ast = parseSource(
      "IF j ≥ 0 THEN\n  j ← j - 1"
    );

    assert.ok(
      ast.diagnostics.some(
        (d) => d.code === "unclosed-block"
      )
    );
  });
});

describe("parser: WHILE", () => {
  test("parses WHILE / DO / END WHILE", () => {
    const ast = parseSource(
      "WHILE j ≥ 0 DO\n  j ← j - 1\nEND WHILE"
    );

    assert.equal(ast.diagnostics.length, 0);
    assert.equal(ast.body[0].type, "While");
  });

  test("reports a missing DO", () => {
    const ast = parseSource(
      "WHILE j ≥ 0\n  j ← j - 1\nEND WHILE"
    );

    assert.ok(
      ast.diagnostics.some(
        (d) => d.code === "expected-do-while"
      )
    );
  });
});

describe("parser: FOR", () => {
  test("parses a counting-up FOR loop", () => {
    const ast = parseSource(
      "FOR i ← 0 TO n - 1 DO\n  table[i] ← -1\nEND FOR"
    );

    assert.equal(ast.diagnostics.length, 0);
    assert.equal(ast.body[0].direction, "TO");
    assert.equal(ast.body[0].variable, "i");
  });

  test("parses a DOWNTO (reverse) FOR loop", () => {
    const ast = parseSource(
      "FOR j ← m - 1 DOWNTO 0 DO\n  j ← j - 1\nEND FOR"
    );

    assert.equal(ast.diagnostics.length, 0);
    assert.equal(
      ast.body[0].direction,
      "DOWNTO"
    );
  });

  test("reports a missing TO/DOWNTO", () => {
    const ast = parseSource(
      "FOR i ← 0 n DO\n  x ← 1\nEND FOR"
    );

    assert.ok(
      ast.diagnostics.some(
        (d) => d.code === "expected-to-or-downto"
      )
    );
  });
});

describe("parser: FUNCTION", () => {
  test("parses a function with parameters and a RETURN", () => {
    const ast = parseSource(
      "FUNCTION buildTable(pattern)\n  RETURN pattern\nEND FUNCTION"
    );

    assert.equal(ast.diagnostics.length, 0);
    assert.equal(
      ast.body[0].type,
      "Function"
    );
    assert.equal(
      ast.body[0].name,
      "buildTable"
    );
    assert.deepEqual(
      ast.body[0].params,
      ["pattern"]
    );
    assert.equal(
      ast.body[0].body[0].type,
      "Return"
    );
  });

  test("parses a function with no parameters", () => {
    const ast = parseSource(
      "FUNCTION run()\n  RETURN 1\nEND FUNCTION"
    );

    assert.equal(ast.diagnostics.length, 0);
    assert.deepEqual(
      ast.body[0].params,
      []
    );
  });

  test("parses multiple parameters", () => {
    const ast = parseSource(
      "FUNCTION f(a, b, c)\n  RETURN a\nEND FUNCTION"
    );

    assert.deepEqual(
      ast.body[0].params,
      ["a", "b", "c"]
    );
  });
});

describe("parser: nesting and block-matching", () => {
  test("parses a WHILE containing an IF, closing in the correct order", () => {
    const ast = parseSource(
      "WHILE cond DO\n" +
        "  IF other THEN\n" +
        "    x ← 1\n" +
        "  END IF\n" +
        "END WHILE"
    );

    assert.equal(ast.diagnostics.length, 0);
    assert.equal(ast.body[0].type, "While");
    assert.equal(
      ast.body[0].body[0].type,
      "If"
    );
  });

  test("reports a mismatched END (closing an IF with END WHILE)", () => {
    const ast = parseSource(
      "IF x = 0 THEN\n  y ← 1\nEND WHILE"
    );

    assert.ok(
      ast.diagnostics.some(
        (d) => d.code === "expected-end-if"
      )
    );
  });

  test("reports ELSE with no matching IF as unexpected", () => {
    const ast = parseSource(
      "ELSE\n  y ← 1\nEND IF"
    );

    assert.ok(
      ast.diagnostics.some(
        (d) => d.code === "unexpected-token"
      )
    );
  });

  test("reports END with nothing open as unexpected", () => {
    const ast = parseSource("END IF");

    assert.ok(
      ast.diagnostics.some(
        (d) => d.code === "unexpected-token"
      )
    );
  });

  test("deeply nested blocks close correctly", () => {
    const src = [
      "FUNCTION f()",
      "  FOR i ← 0 TO n DO",
      "    WHILE i < n DO",
      "      IF i = 0 THEN",
      "        x ← 1",
      "      END IF",
      "    END WHILE",
      "  END FOR",
      "  RETURN x",
      "END FUNCTION",
    ].join("\n");

    const ast = parseSource(src);

    assert.equal(ast.diagnostics.length, 0);
  });
});