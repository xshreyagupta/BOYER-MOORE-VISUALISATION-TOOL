// PHASE 11 -- Expression evaluation.
//
// Evaluates AST expressions directly.

import {
  RuntimeArray,
  isRuntimeArray,
  isNumber,
} from "./runtime.js";

import {
  runtimeError,
  RuntimeErrorType,
} from "./runtimeErrors.js";

import { TokenType } from "./lexer.js";

const BUILTIN_FUNCTIONS = {
  MAX: (a, b) => Math.max(a, b),
  MIN: (a, b) => Math.min(a, b),
};

export function evaluateExpression(
  node,
  interp
) {
  switch (node.type) {
    case "NumberLiteral":
      return node.value;

    case "Identifier":
      return readVariable(node, interp);

    case "Index":
      return readIndex(node, interp);

    case "Unary":
      return evaluateUnary(node, interp);

    case "Binary":
      return evaluateBinary(node, interp);

    case "Logical":
      return evaluateLogical(node, interp);

    case "Call":
      return evaluateCall(node, interp);

    case "ErrorExpr":
      throw runtimeError(
        RuntimeErrorType.INVALID_AST,
        "Attempted to execute an AST node produced from invalid syntax.",
        "This pseudocode has a syntax error and can't run -- validate it again and fix the error shown.",
        node
      );

    default:
      throw runtimeError(
        RuntimeErrorType.INVALID_AST,
        `Unknown expression node type "${node.type}".`,
        "Something in this pseudocode isn't a recognized expression.",
        node
      );
  }
}

function readVariable(node, interp) {
  const scope = interp.currentScope();

  if (!scope.has(node.name)) {
    throw runtimeError(
      RuntimeErrorType.UNDEFINED_VARIABLE,
      `"${node.name}" was read before it was ever assigned a value.`,
      `"${node.name}" doesn't have a value yet at this point in the program -- assign it first.`,
      node
    );
  }

  const value = scope.get(node.name);

  if (isRuntimeArray(value)) {
    throw runtimeError(
      RuntimeErrorType.INVALID_OPERATION,
      `"${node.name}" is an array and can't be used as a plain value here.`,
      `"${node.name}" holds a whole array -- did you mean "${node.name}[...]"?`,
      node
    );
  }

  return value;
}

function resolveArray(
  objectNode,
  interp,
  { createIfMissing }
) {
  if (objectNode.type !== "Identifier") {
    throw runtimeError(
      RuntimeErrorType.INVALID_ARRAY_ACCESS,
      `Only a plain variable name can be indexed with "[...]".`,
      `"[...]" indexing only works directly on a variable name, like table[i].`,
      objectNode
    );
  }

  const scope = interp.currentScope();
  const name = objectNode.name;

  if (!scope.has(name)) {
    if (!createIfMissing) {
      throw runtimeError(
        RuntimeErrorType.UNDEFINED_VARIABLE,
        `"${name}" was read before it was ever assigned a value.`,
        `"${name}[...]" doesn't have a value yet -- assign into it first.`,
        objectNode
      );
    }

    const arr = new RuntimeArray();

    scope.declare(name, arr);

    return arr;
  }

  const value = scope.get(name);

  if (!isRuntimeArray(value)) {
    throw runtimeError(
      RuntimeErrorType.INVALID_ARRAY_ACCESS,
      `"${name}" is not an array, so it can't be indexed with "[...]".`,
      `"${name}" already holds a plain value, not an array -- "${name}[...]" doesn't apply here.`,
      objectNode
    );
  }

  return value;
}

function evaluateIndexValue(
  indexNode,
  interp
) {
  const raw = evaluateExpression(
    indexNode,
    interp
  );

  if (
    !isNumber(raw) ||
    !Number.isInteger(raw)
  ) {
    throw runtimeError(
      RuntimeErrorType.INVALID_ARRAY_ACCESS,
      `Array index must be a whole number, got ${JSON.stringify(raw)}.`,
      "An array index has to be a whole number (0, 1, 2, ...).",
      indexNode
    );
  }

  return raw;
}

export function readIndex(node, interp) {
  const array = resolveArray(
    node.object,
    interp,
    { createIfMissing: false }
  );

  const index = evaluateIndexValue(
    node.index,
    interp
  );

  if (
    index < 0 ||
    (
      array.length !== null &&
      index >= array.length
    )
  ) {
    throw runtimeError(
      RuntimeErrorType.INDEX_OUT_OF_BOUNDS,
      `Index ${index} is out of bounds for "${node.object.name}" (length ${array.length ?? 0}).`,
      `"${node.object.name}[${index}]" is out of range.`,
      node
    );
  }

  if (!array.has(index)) {
    throw runtimeError(
      RuntimeErrorType.UNDEFINED_VARIABLE,
      `"${node.object.name}[${index}]" was read before it was ever assigned a value.`,
      `"${node.object.name}[${index}]" doesn't have a value yet -- assign into it first.`,
      node
    );
  }

  return array.get(index);
}

export function assignIndex(
  node,
  value,
  interp
) {
  const array = resolveArray(
    node.object,
    interp,
    { createIfMissing: true }
  );

  const index = evaluateIndexValue(
    node.index,
    interp
  );

  if (index < 0) {
    throw runtimeError(
      RuntimeErrorType.INDEX_OUT_OF_BOUNDS,
      `Index ${index} is negative -- arrays in this language start at 0.`,
      `"${node.object.name}[${index}]" isn't valid -- arrays start at index 0.`,
      node
    );
  }

  array.set(index, value);
}

function assertNumber(v, node) {
  if (!isNumber(v)) {
    throw runtimeError(
      RuntimeErrorType.INVALID_OPERATION,
      `Expected a number, got ${JSON.stringify(v)}.`,
      "This operation needs a number here.",
      node
    );
  }
}

function evaluateUnary(node, interp) {
  if (node.op === "NOT") {
    return !toBoolean(
      evaluateExpression(
        node.operand,
        interp
      )
    );
  }

  if (node.op === "-") {
    const v = evaluateExpression(
      node.operand,
      interp
    );

    assertNumber(v, node.operand);

    return -v;
  }

  throw runtimeError(
    RuntimeErrorType.INVALID_OPERATION,
    `Unknown unary operator "${node.op}".`,
    "This operator isn't recognized.",
    node
  );
}

function valuesEqual(a, b) {
  return a === b;
}

function compare(a, b, node) {
  if (
    typeof a === "string" &&
    typeof b === "string"
  ) {
    return a < b
      ? -1
      : a > b
        ? 1
        : 0;
  }

  assertNumber(a, node.left);
  assertNumber(b, node.right);

  return a - b;
}

function maybeRecordComparison(
  node,
  leftValue,
  rightValue,
  boolResult,
  interp
) {
  if (
    node.op !== TokenType.EQ &&
    node.op !== TokenType.NEQ
  ) {
    return;
  }

  const isTextPattern = (a, b) =>
    a.type === "Index" &&
    a.object.type === "Identifier" &&
    a.object.name === "text" &&
    b.type === "Index" &&
    b.object.type === "Identifier" &&
    b.object.name === "pattern";

  let textNode;
  let patternNode;
  let textVal;
  let patternVal;

  if (
    isTextPattern(
      node.left,
      node.right
    )
  ) {
    [
      textNode,
      patternNode,
      textVal,
      patternVal,
    ] = [
      node.left,
      node.right,
      leftValue,
      rightValue,
    ];
  } else if (
    isTextPattern(
      node.right,
      node.left
    )
  ) {
    [
      textNode,
      patternNode,
      textVal,
      patternVal,
    ] = [
      node.right,
      node.left,
      rightValue,
      leftValue,
    ];
  } else {
    return;
  }

  let textIndex;
  let patternIndex;

  try {
    textIndex = evaluateExpression(
      textNode.index,
      interp
    );

    patternIndex =
      evaluateExpression(
        patternNode.index,
        interp
      );
  } catch {
    return;
  }

  const isEqual =
    node.op === TokenType.EQ
      ? boolResult
      : !boolResult;

  interp.setPendingComparison({
    textIndex,
    patternIndex,
    textChar: textVal,
    patternChar: patternVal,
    result: isEqual
      ? "match"
      : "mismatch",
  });
}

function evaluateBinary(node, interp) {
  const left = evaluateExpression(
    node.left,
    interp
  );

  const right = evaluateExpression(
    node.right,
    interp
  );

  switch (node.op) {
    case TokenType.PLUS:
      if (
        typeof left === "string" ||
        typeof right === "string"
      ) {
        return String(left) + String(right);
      }

      assertNumber(left, node.left);
      assertNumber(right, node.right);

      return left + right;

    case TokenType.MINUS:
      assertNumber(left, node.left);
      assertNumber(right, node.right);
      return left - right;

    case TokenType.STAR:
      assertNumber(left, node.left);
      assertNumber(right, node.right);
      return left * right;

    case TokenType.SLASH:
      assertNumber(left, node.left);
      assertNumber(right, node.right);

      if (right === 0) {
        throw runtimeError(
          RuntimeErrorType.DIVISION_BY_ZERO,
          "Division by zero.",
          "This divides by zero, which has no defined result.",
          node
        );
      }

      return left / right;

    case TokenType.PERCENT:
      assertNumber(left, node.left);
      assertNumber(right, node.right);

      if (right === 0) {
        throw runtimeError(
          RuntimeErrorType.DIVISION_BY_ZERO,
          "Division by zero (in %).",
          "This uses % with zero on the right, which has no defined result.",
          node
        );
      }

      return left % right;

    case TokenType.EQ: {
      const result =
        valuesEqual(left, right);

      maybeRecordComparison(
        node,
        left,
        right,
        result,
        interp
      );

      return result;
    }

    case TokenType.NEQ: {
      const result =
        !valuesEqual(left, right);

      maybeRecordComparison(
        node,
        left,
        right,
        result,
        interp
      );

      return result;
    }

    case TokenType.LT:
      return (
        compare(left, right, node) < 0
      );

    case TokenType.GT:
      return (
        compare(left, right, node) > 0
      );

    case TokenType.LTE:
      return (
        compare(left, right, node) <= 0
      );

    case TokenType.GTE:
      return (
        compare(left, right, node) >= 0
      );

    default:
      throw runtimeError(
        RuntimeErrorType.INVALID_OPERATION,
        `Unknown binary operator "${node.op}".`,
        "This operator isn't recognized.",
        node
      );
  }
}

function evaluateLogical(node, interp) {
  const left = toBoolean(
    evaluateExpression(
      node.left,
      interp
    )
  );

  if (node.op === "AND") {
    if (!left) return false;

    return toBoolean(
      evaluateExpression(
        node.right,
        interp
      )
    );
  }

  if (node.op === "OR") {
    if (left) return true;

    return toBoolean(
      evaluateExpression(
        node.right,
        interp
      )
    );
  }

  throw runtimeError(
    RuntimeErrorType.INVALID_OPERATION,
    `Unknown logical operator "${node.op}".`,
    "This operator isn't recognized.",
    node
  );
}

export function toBoolean(v) {
  return Boolean(v);
}

function evaluateCall(node, interp) {
  const upper = node.name.toUpperCase();

  if (BUILTIN_FUNCTIONS[upper]) {
    if (node.args.length !== 2) {
      throw runtimeError(
        RuntimeErrorType.ARITY_MISMATCH,
        `${upper} expects exactly 2 arguments, got ${node.args.length}.`,
        `${upper}(a, b) always takes exactly two values.`,
        node
      );
    }

    const a = evaluateExpression(
      node.args[0],
      interp
    );

    const b = evaluateExpression(
      node.args[1],
      interp
    );

    assertNumber(a, node.args[0]);
    assertNumber(b, node.args[1]);

    return BUILTIN_FUNCTIONS[upper](
      a,
      b
    );
  }

  const argValues = node.args.map(
    (arg) =>
      evaluateExpression(arg, interp)
  );

  return interp.callFunction(
    node.name,
    argValues,
    node
  );
}