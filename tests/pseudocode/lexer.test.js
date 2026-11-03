import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { tokenize, TokenType } from "../../src/pseudocode/lexer.js";

function typesOf(source) {
  const { tokens } = tokenize(source);
  return tokens.map((t) => t.type);
}

describe("tokenize", () => {
  test("tokenizes a simple assignment", () => {
    const { tokens } = tokenize("i ← 0");

    const [ident, arrow, num, newline, eof] = tokens;

    assert.equal(ident.type, TokenType.IDENT);
    assert.equal(ident.value, "i");

    assert.equal(arrow.type, TokenType.ARROW);

    assert.equal(num.type, TokenType.NUMBER);
    assert.equal(num.value, "0");

    assert.equal(newline.type, TokenType.NEWLINE);
    assert.equal(eof.type, TokenType.EOF);
  });

  test("accepts ASCII arrow synonym <-", () => {
    const { tokens } = tokenize("i <- 0");

    assert.equal(tokens[1].type, TokenType.ARROW);
  });

  test("recognizes keywords case-insensitively and uppercases them", () => {
    const { tokens } = tokenize("if x then");

    assert.equal(tokens[0].type, TokenType.KEYWORD);
    assert.equal(tokens[0].value, "IF");

    assert.equal(tokens[2].type, TokenType.KEYWORD);
    assert.equal(tokens[2].value, "THEN");
  });

  test("does not treat a keyword-like substring inside a longer identifier as a keyword", () => {
    const { tokens } = tokenize("ifX ← 1");

    assert.equal(tokens[0].type, TokenType.IDENT);
    assert.equal(tokens[0].value, "ifX");
  });

  test("tokenizes comparison operators, both Unicode and ASCII forms", () => {
    assert.deepEqual(
      typesOf("a ≠ b"),
      [
        TokenType.IDENT,
        TokenType.NEQ,
        TokenType.IDENT,
        TokenType.NEWLINE,
        TokenType.EOF,
      ]
    );

    assert.deepEqual(
      typesOf("a != b"),
      [
        TokenType.IDENT,
        TokenType.NEQ,
        TokenType.IDENT,
        TokenType.NEWLINE,
        TokenType.EOF,
      ]
    );

    assert.deepEqual(
      typesOf("a ≤ b"),
      [
        TokenType.IDENT,
        TokenType.LTE,
        TokenType.IDENT,
        TokenType.NEWLINE,
        TokenType.EOF,
      ]
    );

    assert.deepEqual(
      typesOf("a <= b"),
      [
        TokenType.IDENT,
        TokenType.LTE,
        TokenType.IDENT,
        TokenType.NEWLINE,
        TokenType.EOF,
      ]
    );

    assert.deepEqual(
      typesOf("a ≥ b"),
      [
        TokenType.IDENT,
        TokenType.GTE,
        TokenType.IDENT,
        TokenType.NEWLINE,
        TokenType.EOF,
      ]
    );

    assert.deepEqual(
      typesOf("a >= b"),
      [
        TokenType.IDENT,
        TokenType.GTE,
        TokenType.IDENT,
        TokenType.NEWLINE,
        TokenType.EOF,
      ]
    );
  });

  test("does not confuse <= with < followed by =", () => {
    const { tokens } = tokenize("a <= b");

    assert.equal(tokens[1].type, TokenType.LTE);
  });

  test("strips // comments to end of line", () => {
    const { tokens } = tokenize("i ← 0 // start index");

    const types = tokens.map((t) => t.type);

    assert.deepEqual(
      types,
      [
        TokenType.IDENT,
        TokenType.ARROW,
        TokenType.NUMBER,
        TokenType.NEWLINE,
        TokenType.EOF,
      ]
    );
  });

  test("a comment-only line produces just a NEWLINE", () => {
    const { tokens } = tokenize("// just a comment");

    assert.deepEqual(
      tokens.map((t) => t.type),
      [
        TokenType.NEWLINE,
        TokenType.EOF,
      ]
    );
  });

  test("tokenizes decimal numbers", () => {
    const { tokens } = tokenize("x ← 1.5");

    assert.equal(tokens[2].type, TokenType.NUMBER);
    assert.equal(tokens[2].value, "1.5");
  });

  test("tokenizes array brackets and parens/commas", () => {
    const types = typesOf("MAX(a[i], b)");

    assert.deepEqual(
      types,
      [
        TokenType.IDENT,
        TokenType.LPAREN,
        TokenType.IDENT,
        TokenType.LBRACKET,
        TokenType.IDENT,
        TokenType.RBRACKET,
        TokenType.COMMA,
        TokenType.IDENT,
        TokenType.RPAREN,
        TokenType.NEWLINE,
        TokenType.EOF,
      ]
    );
  });

  test("reports an unrecognized character as a lexical error and keeps scanning", () => {
    const { tokens, errors } = tokenize("x ← 1 @ 2");

    assert.equal(errors.length, 1);
    assert.equal(errors[0].line, 1);
    assert.ok(errors[0].message.includes("@"));

    // Scanning continues past the bad character.
    assert.ok(
      tokens.some(
        (t) =>
          t.type === TokenType.NUMBER &&
          t.value === "2"
      )
    );
  });

  test("assigns correct 1-based line numbers across multiple lines", () => {
    const { tokens } = tokenize(
      "i ← 0\nj ← 1"
    );

    const idents = tokens.filter(
      (t) => t.type === TokenType.IDENT
    );

    assert.equal(idents[0].line, 1);
    assert.equal(idents[1].line, 2);
  });

  test("assigns correct 1-based column numbers", () => {
    const { tokens } = tokenize("  i ← 0");

    const ident = tokens.find(
      (t) => t.type === TokenType.IDENT
    );

    assert.equal(ident.column, 3);
  });

  test("every raw source line produces exactly one NEWLINE token", () => {
    const { tokens } = tokenize(
      "a ← 1\n\nb ← 2"
    );

    const newlineCount = tokens.filter(
      (t) => t.type === TokenType.NEWLINE
    ).length;

    assert.equal(newlineCount, 3);
  });
});