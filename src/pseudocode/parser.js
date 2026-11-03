// PHASE 10 -- Pseudocode Parser.
//
// A real recursive-descent parser. The result is a proper AST so Phase 11
// can later execute the student's validated pseudocode.

import { TokenType } from "./lexer.js";
import { createDiagnostic } from "./diagnostics.js";

const COMPARISON_TYPES = new Set([
  TokenType.EQ,
  TokenType.NEQ,
  TokenType.LT,
  TokenType.GT,
  TokenType.LTE,
  TokenType.GTE,
]);

const ADDITIVE_TYPES = new Set([
  TokenType.PLUS,
  TokenType.MINUS,
]);

const MULTIPLICATIVE_TYPES = new Set([
  TokenType.STAR,
  TokenType.SLASH,
  TokenType.PERCENT,
]);

class Cursor {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek(offset = 0) {
    return this.tokens[
      Math.min(
        this.pos + offset,
        this.tokens.length - 1
      )
    ];
  }

  advance() {
    const t = this.tokens[this.pos];

    if (this.pos < this.tokens.length - 1) {
      this.pos++;
    }

    return t;
  }

  atEOF() {
    return this.peek().type === TokenType.EOF;
  }

  isKeyword(word) {
    const t = this.peek();

    return (
      t.type === TokenType.KEYWORD &&
      t.value === word
    );
  }
}

export function parse(tokens) {
  const cursor = new Cursor(tokens);
  const diagnostics = [];

  const body = parseStatementList(
    cursor,
    diagnostics,
    new Set()
  );

  if (!cursor.atEOF()) {
    const t = cursor.peek();

    diagnostics.push(
      syntaxError(
        "unexpected-token",
        `Unexpected "${t.value || t.type}" here.`,
        `This doesn't fit here -- check the line above for a missing END.`,
        t
      )
    );
  }

  return {
    type: "Program",
    body,
    diagnostics,
  };
}

function syntaxError(
  code,
  message,
  studentMessage,
  token,
  ruleId
) {
  return createDiagnostic({
    severity: "error",
    code,
    message,
    studentMessage,
    line: token.line,
    column: token.column,
    endColumn: token.endColumn,
    ruleId,
    source: "parser",
  });
}

function recoverToNewline(cursor) {
  while (
    cursor.peek().type !== TokenType.NEWLINE &&
    cursor.peek().type !== TokenType.EOF
  ) {
    cursor.advance();
  }
}

function consumeStatementEnd(cursor) {
  if (cursor.peek().type === TokenType.NEWLINE) {
    cursor.advance();
  }
}

function skipBlankLines(cursor) {
  while (cursor.peek().type === TokenType.NEWLINE) {
    cursor.advance();
  }
}

function parseStatementList(
  cursor,
  diagnostics,
  stopWords
) {
  const body = [];

  while (true) {
    skipBlankLines(cursor);

    if (cursor.atEOF()) break;

    if (
      cursor.peek().type === TokenType.KEYWORD &&
      stopWords.has(cursor.peek().value)
    ) {
      break;
    }

    const before = cursor.pos;

    const stmt = parseStatement(
      cursor,
      diagnostics
    );

    if (stmt) {
      body.push(stmt);
    }

    if (cursor.pos === before) {
      cursor.advance();
    }

    consumeStatementEnd(cursor);
  }

  return body;
}

function parseStatement(cursor, diagnostics) {
  const t = cursor.peek();

  if (t.type === TokenType.KEYWORD) {
    switch (t.value) {
      case "IF":
        return parseIf(cursor, diagnostics);

      case "WHILE":
        return parseWhile(cursor, diagnostics);

      case "FOR":
        return parseFor(cursor, diagnostics);

      case "FUNCTION":
        return parseFunction(cursor, diagnostics);

      case "RETURN":
        return parseReturn(cursor, diagnostics);

      case "ELSE":
      case "END":
        diagnostics.push(
          syntaxError(
            "unexpected-token",
            `Unexpected "${t.value}" -- there is no matching block open here.`,
            `This ${t.value} doesn't close anything -- check for an extra END/ELSE, or a missing IF/WHILE/FOR/FUNCTION above.`,
            t,
            "block-structure"
          )
        );

        cursor.advance();
        recoverToNewline(cursor);
        return null;

      default:
        diagnostics.push(
          syntaxError(
            "unexpected-token",
            `"${t.value}" cannot start a statement here.`,
            `A line has to start a new statement -- an assignment (x ← ...) or a keyword like IF, WHILE, FOR, FUNCTION, RETURN.`,
            t
          )
        );

        cursor.advance();
        recoverToNewline(cursor);
        return null;
    }
  }

  if (t.type === TokenType.IDENT) {
    return parseAssignment(cursor, diagnostics);
  }

  if (
    t.type === TokenType.NEWLINE ||
    t.type === TokenType.EOF
  ) {
    return null;
  }

  diagnostics.push(
    syntaxError(
      "unexpected-token",
      `A statement can't start with "${t.value}".`,
      `Every line of pseudocode is either a variable assignment (x ← ...) or starts with a keyword like IF, WHILE, FOR, FUNCTION, RETURN.`,
      t,
      "assignment"
    )
  );

  cursor.advance();
  recoverToNewline(cursor);

  return null;
}

function parseAssignment(cursor, diagnostics) {
  const nameToken = cursor.advance();

  let target = {
    type: "Identifier",
    name: nameToken.value,
    line: nameToken.line,
    column: nameToken.column,
  };

  if (cursor.peek().type === TokenType.LBRACKET) {
    cursor.advance();

    const index = parseExpression(
      cursor,
      diagnostics
    );

    if (
      cursor.peek().type ===
      TokenType.RBRACKET
    ) {
      cursor.advance();
    } else {
      diagnostics.push(
        syntaxError(
          "expected-rbracket",
          `Expected "]" to close the array index.`,
          `Every "[" needs a matching "]" right after the index expression.`,
          cursor.peek(),
          "arrays"
        )
      );
    }

    target = {
      type: "Index",
      object: target,
      index,
      line: nameToken.line,
      column: nameToken.column,
    };
  }

  if (cursor.peek().type !== TokenType.ARROW) {
    const t = cursor.peek();

    diagnostics.push(
      syntaxError(
        "expected-arrow",
        `Expected "←" (assignment) after "${nameToken.value}".`,
        `To assign a value to "${nameToken.value}", use ← (or "<-"): ${nameToken.value} ← ...`,
        t,
        "variables"
      )
    );

    recoverToNewline(cursor);

    return null;
  }

  cursor.advance();

  const value = parseExpression(
    cursor,
    diagnostics
  );

  if (!value) {
    recoverToNewline(cursor);
    return null;
  }

  return {
    type: "Assignment",
    target,
    value,
    line: nameToken.line,
    column: nameToken.column,
  };
}

function parseIf(cursor, diagnostics) {
  const ifToken = cursor.advance();

  const condition = parseExpression(
    cursor,
    diagnostics
  );

  if (!cursor.isKeyword("THEN")) {
    diagnostics.push(
      syntaxError(
        "expected-then",
        `Expected THEN after the IF condition.`,
        `An IF needs THEN right after its condition: IF condition THEN`,
        cursor.peek(),
        "if"
      )
    );
  } else {
    cursor.advance();
  }

  consumeStatementEnd(cursor);

  const thenBody = parseStatementList(
    cursor,
    diagnostics,
    new Set(["ELSE", "END"])
  );

  let elseBody = null;
  let elseLine = null;

  if (cursor.isKeyword("ELSE")) {
    elseLine = cursor.peek().line;

    cursor.advance();
    consumeStatementEnd(cursor);

    elseBody = parseStatementList(
      cursor,
      diagnostics,
      new Set(["END"])
    );
  }

  let endLine = ifToken.line;

  if (cursor.isKeyword("END")) {
    cursor.advance();

    endLine = expectBlockClose(
      cursor,
      diagnostics,
      "IF",
      "expected-end-if",
      "if"
    );
  } else {
    diagnostics.push(
      unclosedBlock(ifToken, "IF", "if")
    );
  }

  return {
    type: "If",
    condition,
    thenBody,
    elseBody,
    elseLine,
    line: ifToken.line,
    endLine,
  };
}

function parseWhile(cursor, diagnostics) {
  const whileToken = cursor.advance();

  const condition = parseExpression(
    cursor,
    diagnostics
  );

  if (!cursor.isKeyword("DO")) {
    diagnostics.push(
      syntaxError(
        "expected-do-while",
        `Expected DO after the WHILE condition.`,
        `A WHILE needs DO right after its condition: WHILE condition DO`,
        cursor.peek(),
        "while"
      )
    );
  } else {
    cursor.advance();
  }

  consumeStatementEnd(cursor);

  const body = parseStatementList(
    cursor,
    diagnostics,
    new Set(["END"])
  );

  let endLine = whileToken.line;

  if (cursor.isKeyword("END")) {
    cursor.advance();

    endLine = expectBlockClose(
      cursor,
      diagnostics,
      "WHILE",
      "expected-end-while",
      "while"
    );
  } else {
    diagnostics.push(
      unclosedBlock(
        whileToken,
        "WHILE",
        "while"
      )
    );
  }

  return {
    type: "While",
    condition,
    body,
    line: whileToken.line,
    endLine,
  };
}

function parseFor(cursor, diagnostics) {
  const forToken = cursor.advance();

  let variable = null;

  if (cursor.peek().type === TokenType.IDENT) {
    variable = cursor.advance().value;
  } else {
    diagnostics.push(
      syntaxError(
        "expected-identifier",
        `Expected a loop variable after FOR.`,
        `A FOR loop needs a variable name: FOR i ← 0 TO n DO`,
        cursor.peek(),
        "for"
      )
    );
  }

  if (cursor.peek().type === TokenType.ARROW) {
    cursor.advance();
  } else {
    diagnostics.push(
      syntaxError(
        "expected-arrow",
        `Expected "←" after the FOR loop variable.`,
        `Give the loop variable a starting value: FOR i ← 0 TO n DO`,
        cursor.peek(),
        "for"
      )
    );
  }

  const start = parseExpression(
    cursor,
    diagnostics
  );

  let direction = "TO";

  if (cursor.isKeyword("TO")) {
    direction = "TO";
    cursor.advance();
  } else if (cursor.isKeyword("DOWNTO")) {
    direction = "DOWNTO";
    cursor.advance();
  } else {
    diagnostics.push(
      syntaxError(
        "expected-to-or-downto",
        `Expected TO or DOWNTO in the FOR loop.`,
        `Count up with TO, or count down with DOWNTO: FOR i ← 0 TO n DO / FOR i ← n DOWNTO 0 DO`,
        cursor.peek(),
        "for"
      )
    );
  }

  const end = parseExpression(
    cursor,
    diagnostics
  );

  if (!cursor.isKeyword("DO")) {
    diagnostics.push(
      syntaxError(
        "expected-do-for",
        `Expected DO to start the FOR loop body.`,
        `A FOR header ends with DO: FOR i ← 0 TO n DO`,
        cursor.peek(),
        "for"
      )
    );
  } else {
    cursor.advance();
  }

  consumeStatementEnd(cursor);

  const body = parseStatementList(
    cursor,
    diagnostics,
    new Set(["END"])
  );

  let endLine = forToken.line;

  if (cursor.isKeyword("END")) {
    cursor.advance();

    endLine = expectBlockClose(
      cursor,
      diagnostics,
      "FOR",
      "expected-end-for",
      "for"
    );
  } else {
    diagnostics.push(
      unclosedBlock(
        forToken,
        "FOR",
        "for"
      )
    );
  }

  return {
    type: "For",
    variable,
    start,
    end,
    direction,
    body,
    line: forToken.line,
    endLine,
  };
}

function parseFunction(cursor, diagnostics) {
  const fnToken = cursor.advance();

  let name = null;

  if (cursor.peek().type === TokenType.IDENT) {
    name = cursor.advance().value;
  } else {
    diagnostics.push(
      syntaxError(
        "expected-function-name",
        `Expected a function name after FUNCTION.`,
        `Give the function a name: FUNCTION buildTable(pattern)`,
        cursor.peek(),
        "functions"
      )
    );
  }

  const params = [];

  if (cursor.peek().type === TokenType.LPAREN) {
    cursor.advance();

    if (
      cursor.peek().type !==
      TokenType.RPAREN
    ) {
      while (true) {
        if (
          cursor.peek().type ===
          TokenType.IDENT
        ) {
          params.push(
            cursor.advance().value
          );
        } else {
          diagnostics.push(
            syntaxError(
              "expected-identifier",
              `Expected a parameter name.`,
              `Function parameters are plain names, separated by commas: FUNCTION f(a, b)`,
              cursor.peek(),
              "functions"
            )
          );

          break;
        }

        if (
          cursor.peek().type ===
          TokenType.COMMA
        ) {
          cursor.advance();
          continue;
        }

        break;
      }
    }

    if (
      cursor.peek().type ===
      TokenType.RPAREN
    ) {
      cursor.advance();
    } else {
      diagnostics.push(
        syntaxError(
          "expected-rparen",
          `Expected ")" to close the parameter list.`,
          `Every "(" needs a matching ")".`,
          cursor.peek(),
          "functions"
        )
      );
    }
  } else {
    diagnostics.push(
      syntaxError(
        "expected-params",
        `Expected "(" to start the parameter list.`,
        `Even with no parameters, write empty parentheses: FUNCTION f()`,
        cursor.peek(),
        "functions"
      )
    );
  }

  consumeStatementEnd(cursor);

  const body = parseStatementList(
    cursor,
    diagnostics,
    new Set(["END"])
  );

  let endLine = fnToken.line;

  if (cursor.isKeyword("END")) {
    cursor.advance();

    endLine = expectBlockClose(
      cursor,
      diagnostics,
      "FUNCTION",
      "expected-end-function",
      "functions"
    );
  } else {
    diagnostics.push(
      unclosedBlock(
        fnToken,
        "FUNCTION",
        "functions"
      )
    );
  }

  return {
    type: "Function",
    name,
    params,
    body,
    line: fnToken.line,
    endLine,
  };
}

function parseReturn(cursor, diagnostics) {
  const returnToken = cursor.advance();

  let value = null;

  if (
    cursor.peek().type !== TokenType.NEWLINE &&
    cursor.peek().type !== TokenType.EOF
  ) {
    value = parseExpression(
      cursor,
      diagnostics
    );
  }

  return {
    type: "Return",
    value,
    line: returnToken.line,
    column: returnToken.column,
  };
}

function expectBlockClose(
  cursor,
  diagnostics,
  expectedWord,
  mismatchCode,
  ruleId
) {
  const t = cursor.peek();

  if (
    t.type === TokenType.KEYWORD &&
    t.value === expectedWord
  ) {
    cursor.advance();
    return t.line;
  }

  diagnostics.push(
    syntaxError(
      mismatchCode,
      `Expected "END ${expectedWord}".`,
      t.type === TokenType.KEYWORD
        ? `This closes with "END ${t.value}", but it should close with "END ${expectedWord}" -- blocks must close with the same keyword they opened with.`
        : `This block should close with "END ${expectedWord}".`,
      t,
      ruleId
    )
  );

  if (
    t.type === TokenType.KEYWORD &&
    ["IF", "WHILE", "FOR", "FUNCTION"].includes(
      t.value
    )
  ) {
    cursor.advance();
  }

  return t.line;
}

function unclosedBlock(
  openToken,
  keyword,
  ruleId
) {
  return createDiagnostic({
    severity: "error",
    code: "unclosed-block",
    message: `"${keyword}" opened on line ${openToken.line} is never closed.`,
    studentMessage: `This ${keyword} block never reaches "END ${keyword}" -- check for a missing END ${keyword} below.`,
    line: openToken.line,
    column: openToken.column,
    ruleId,
    source: "parser",
  });
}

function parseExpression(cursor, diagnostics) {
  return parseOr(cursor, diagnostics);
}

function parseOr(cursor, diagnostics) {
  let left = parseAnd(cursor, diagnostics);

  while (cursor.isKeyword("OR")) {
    const op = cursor.advance();
    const right = parseAnd(cursor, diagnostics);

    left = {
      type: "Logical",
      op: "OR",
      left,
      right,
      line: op.line,
      column: op.column,
    };
  }

  return left;
}

function parseAnd(cursor, diagnostics) {
  let left = parseNot(cursor, diagnostics);

  while (cursor.isKeyword("AND")) {
    const op = cursor.advance();
    const right = parseNot(cursor, diagnostics);

    left = {
      type: "Logical",
      op: "AND",
      left,
      right,
      line: op.line,
      column: op.column,
    };
  }

  return left;
}

function parseNot(cursor, diagnostics) {
  if (cursor.isKeyword("NOT")) {
    const op = cursor.advance();
    const operand = parseNot(
      cursor,
      diagnostics
    );

    return {
      type: "Unary",
      op: "NOT",
      operand,
      line: op.line,
      column: op.column,
    };
  }

  return parseComparison(cursor, diagnostics);
}

function parseComparison(cursor, diagnostics) {
  let left = parseAdditive(
    cursor,
    diagnostics
  );

  while (
    COMPARISON_TYPES.has(
      cursor.peek().type
    )
  ) {
    const op = cursor.advance();
    const right = parseAdditive(
      cursor,
      diagnostics
    );

    left = {
      type: "Binary",
      op: op.type,
      left,
      right,
      line: op.line,
      column: op.column,
    };
  }

  return left;
}

function parseAdditive(cursor, diagnostics) {
  let left = parseMultiplicative(
    cursor,
    diagnostics
  );

  while (
    ADDITIVE_TYPES.has(
      cursor.peek().type
    )
  ) {
    const op = cursor.advance();
    const right = parseMultiplicative(
      cursor,
      diagnostics
    );

    left = {
      type: "Binary",
      op: op.type,
      left,
      right,
      line: op.line,
      column: op.column,
    };
  }

  return left;
}

function parseMultiplicative(
  cursor,
  diagnostics
) {
  let left = parseUnary(
    cursor,
    diagnostics
  );

  while (
    MULTIPLICATIVE_TYPES.has(
      cursor.peek().type
    )
  ) {
    const op = cursor.advance();
    const right = parseUnary(
      cursor,
      diagnostics
    );

    left = {
      type: "Binary",
      op: op.type,
      left,
      right,
      line: op.line,
      column: op.column,
    };
  }

  return left;
}

function parseUnary(cursor, diagnostics) {
  if (
    cursor.peek().type ===
    TokenType.MINUS
  ) {
    const op = cursor.advance();
    const operand = parseUnary(
      cursor,
      diagnostics
    );

    return {
      type: "Unary",
      op: "-",
      operand,
      line: op.line,
      column: op.column,
    };
  }

  return parsePrimary(cursor, diagnostics);
}

function parsePrimary(cursor, diagnostics) {
  const t = cursor.peek();

  if (t.type === TokenType.NUMBER) {
    cursor.advance();

    return {
      type: "NumberLiteral",
      value: Number(t.value),
      line: t.line,
      column: t.column,
    };
  }

  if (t.type === TokenType.LPAREN) {
    cursor.advance();

    const inner = parseExpression(
      cursor,
      diagnostics
    );

    if (
      cursor.peek().type ===
      TokenType.RPAREN
    ) {
      cursor.advance();
    } else {
      diagnostics.push(
        syntaxError(
          "expected-rparen",
          `Expected ")" to close the expression.`,
          `Every "(" needs a matching ")".`,
          cursor.peek()
        )
      );
    }

    return inner;
  }

  if (t.type === TokenType.IDENT) {
    cursor.advance();

    if (
      cursor.peek().type ===
      TokenType.LBRACKET
    ) {
      cursor.advance();

      const index = parseExpression(
        cursor,
        diagnostics
      );

      if (
        cursor.peek().type ===
        TokenType.RBRACKET
      ) {
        cursor.advance();
      } else {
        diagnostics.push(
          syntaxError(
            "expected-rbracket",
            `Expected "]" to close the array index.`,
            `Every "[" needs a matching "]" right after the index expression.`,
            cursor.peek(),
            "arrays"
          )
        );
      }

      return {
        type: "Index",
        object: {
          type: "Identifier",
          name: t.value,
          line: t.line,
          column: t.column,
        },
        index,
        line: t.line,
        column: t.column,
      };
    }

    if (
      cursor.peek().type ===
      TokenType.LPAREN
    ) {
      cursor.advance();

      const args = [];

      if (
        cursor.peek().type !==
        TokenType.RPAREN
      ) {
        while (true) {
          args.push(
            parseExpression(
              cursor,
              diagnostics
            )
          );

          if (
            cursor.peek().type ===
            TokenType.COMMA
          ) {
            cursor.advance();
            continue;
          }

          break;
        }
      }

      if (
        cursor.peek().type ===
        TokenType.RPAREN
      ) {
        cursor.advance();
      } else {
        diagnostics.push(
          syntaxError(
            "expected-rparen",
            `Expected ")" to close the argument list.`,
            `Every "(" needs a matching ")".`,
            cursor.peek(),
            "max-min"
          )
        );
      }

      return {
        type: "Call",
        name: t.value,
        args,
        line: t.line,
        column: t.column,
      };
    }

    return {
      type: "Identifier",
      name: t.value,
      line: t.line,
      column: t.column,
    };
  }

  diagnostics.push(
    syntaxError(
      "expected-expression",
      `Expected a value or expression here, found "${t.value || t.type}".`,
      `Something's missing -- this should be a number, a variable, an array like text[i], or a parenthesized expression.`,
      t,
      "assignment"
    )
  );

  if (
    t.type !== TokenType.NEWLINE &&
    t.type !== TokenType.EOF
  ) {
    cursor.advance();
  }

  return {
    type: "ErrorExpr",
    line: t.line,
    column: t.column,
  };
}