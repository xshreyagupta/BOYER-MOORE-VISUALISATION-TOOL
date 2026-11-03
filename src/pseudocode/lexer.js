// PHASE 10 -- Pseudocode Lexer.
//
// Converts raw pseudocode source text into a flat stream of tokens, each
// carrying its own line/column position so every later stage (parser,
// diagnostics, "click a diagnostic to jump to its line") can point back at
// exactly where in the student's text something came from.

export const TokenType = Object.freeze({
  IDENT: "IDENT",
  NUMBER: "NUMBER",
  KEYWORD: "KEYWORD",
  ARROW: "ARROW",
  PLUS: "PLUS",
  MINUS: "MINUS",
  STAR: "STAR",
  SLASH: "SLASH",
  PERCENT: "PERCENT",
  EQ: "EQ",
  NEQ: "NEQ",
  LT: "LT",
  GT: "GT",
  LTE: "LTE",
  GTE: "GTE",
  LPAREN: "LPAREN",
  RPAREN: "RPAREN",
  LBRACKET: "LBRACKET",
  RBRACKET: "RBRACKET",
  COMMA: "COMMA",
  NEWLINE: "NEWLINE",
  EOF: "EOF",
});

export const KEYWORDS = Object.freeze([
  "IF",
  "THEN",
  "ELSE",
  "END",
  "WHILE",
  "DO",
  "FOR",
  "TO",
  "DOWNTO",
  "FUNCTION",
  "RETURN",
  "AND",
  "OR",
  "NOT",
]);

const KEYWORD_SET = new Set(KEYWORDS);

function isDigit(ch) {
  return ch >= "0" && ch <= "9";
}

function isIdentStart(ch) {
  return /[A-Za-z_]/.test(ch);
}

function isIdentPart(ch) {
  return /[A-Za-z0-9_]/.test(ch);
}

/**
 * Tokenizes `source`.
 *
 * @returns {{
 *   tokens: Array<object>,
 *   errors: Array<object>,
 *   lineCount: number,
 *   rawLines: string[]
 * }}
 */
export function tokenize(source) {
  const rawLines = source.split("\n");
  const tokens = [];
  const errors = [];

  for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex++) {
    const line = rawLines[lineIndex];
    const lineNo = lineIndex + 1;

    scanLine(line, lineNo, tokens, errors);

    tokens.push({
      type: TokenType.NEWLINE,
      value: "\n",
      line: lineNo,
      column: line.length + 1,
      endColumn: line.length + 2,
    });
  }

  tokens.push({
    type: TokenType.EOF,
    value: "",
    line: rawLines.length + 1,
    column: 1,
    endColumn: 1,
  });

  return {
    tokens,
    errors,
    lineCount: rawLines.length,
    rawLines,
  };
}

function scanLine(line, lineNo, tokens, errors) {
  let col = 0;
  const len = line.length;

  function push(type, value, startCol, endCol) {
    tokens.push({
      type,
      value,
      line: lineNo,
      column: startCol + 1,
      endColumn: endCol + 1,
    });
  }

  while (col < len) {
    const ch = line[col];

    if (ch === " " || ch === "\t") {
      col++;
      continue;
    }

    if (ch === "/" && line[col + 1] === "/") {
      break;
    }

    if (isDigit(ch)) {
      let end = col + 1;

      while (end < len && isDigit(line[end])) {
        end++;
      }

      if (line[end] === "." && isDigit(line[end + 1])) {
        end++;

        while (end < len && isDigit(line[end])) {
          end++;
        }
      }

      push(TokenType.NUMBER, line.slice(col, end), col, end);
      col = end;
      continue;
    }

    if (isIdentStart(ch)) {
      let end = col + 1;

      while (end < len && isIdentPart(line[end])) {
        end++;
      }

      const text = line.slice(col, end);
      const upper = text.toUpperCase();

      if (KEYWORD_SET.has(upper)) {
        push(TokenType.KEYWORD, upper, col, end);
      } else {
        push(TokenType.IDENT, text, col, end);
      }

      col = end;
      continue;
    }

    if (ch === "←") {
      push(TokenType.ARROW, "←", col, col + 1);
      col++;
      continue;
    }

    if (ch === "<" && line[col + 1] === "-") {
      push(TokenType.ARROW, "<-", col, col + 2);
      col += 2;
      continue;
    }

    if (ch === "<" && line[col + 1] === "=") {
      push(TokenType.LTE, "<=", col, col + 2);
      col += 2;
      continue;
    }

    if (ch === ">" && line[col + 1] === "=") {
      push(TokenType.GTE, ">=", col, col + 2);
      col += 2;
      continue;
    }

    if (ch === "!" && line[col + 1] === "=") {
      push(TokenType.NEQ, "!=", col, col + 2);
      col += 2;
      continue;
    }

    if (ch === "≠") {
      push(TokenType.NEQ, "≠", col, col + 1);
      col++;
      continue;
    }

    if (ch === "≤") {
      push(TokenType.LTE, "≤", col, col + 1);
      col++;
      continue;
    }

    if (ch === "≥") {
      push(TokenType.GTE, "≥", col, col + 1);
      col++;
      continue;
    }

    switch (ch) {
      case "+":
        push(TokenType.PLUS, ch, col, col + 1);
        col++;
        continue;

      case "-":
        push(TokenType.MINUS, ch, col, col + 1);
        col++;
        continue;

      case "*":
        push(TokenType.STAR, ch, col, col + 1);
        col++;
        continue;

      case "/":
        push(TokenType.SLASH, ch, col, col + 1);
        col++;
        continue;

      case "%":
        push(TokenType.PERCENT, ch, col, col + 1);
        col++;
        continue;

      case "=":
        push(TokenType.EQ, ch, col, col + 1);
        col++;
        continue;

      case "<":
        push(TokenType.LT, ch, col, col + 1);
        col++;
        continue;

      case ">":
        push(TokenType.GT, ch, col, col + 1);
        col++;
        continue;

      case "(":
        push(TokenType.LPAREN, ch, col, col + 1);
        col++;
        continue;

      case ")":
        push(TokenType.RPAREN, ch, col, col + 1);
        col++;
        continue;

      case "[":
        push(TokenType.LBRACKET, ch, col, col + 1);
        col++;
        continue;

      case "]":
        push(TokenType.RBRACKET, ch, col, col + 1);
        col++;
        continue;

      case ",":
        push(TokenType.COMMA, ch, col, col + 1);
        col++;
        continue;

      default:
        errors.push({
          message: `Unrecognized character "${ch}".`,
          line: lineNo,
          column: col + 1,
          endColumn: col + 2,
        });

        col++;
    }
  }
}