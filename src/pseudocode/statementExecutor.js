// PHASE 11 -- Statement execution.

import {
  evaluateExpression,
  assignIndex,
  toBoolean,
} from "./expressionEvaluator.js";

import {
  runtimeError,
  RuntimeErrorType,
} from "./runtimeErrors.js";

export class ReturnSignal {
  constructor(value) {
    this.value = value;
  }
}

export function executeStatements(
  statements,
  interp
) {
  for (const stmt of statements) {
    executeStatement(stmt, interp);
  }
}

export function executeStatement(
  stmt,
  interp
) {
  interp.checkStepLimit(stmt);

  switch (stmt.type) {
    case "Assignment":
      return executeAssignment(
        stmt,
        interp
      );

    case "If":
      return executeIf(stmt, interp);

    case "While":
      return executeWhile(
        stmt,
        interp
      );

    case "For":
      return executeFor(stmt, interp);

    case "Function":
      return;

    case "Return":
      return executeReturn(
        stmt,
        interp
      );

    default:
      throw runtimeError(
        RuntimeErrorType.INVALID_AST,
        `Unknown statement node type "${stmt.type}".`,
        "This pseudocode contains something the interpreter doesn't recognize.",
        stmt
      );
  }
}

function executeAssignment(
  stmt,
  interp
) {
  const value = evaluateExpression(
    stmt.value,
    interp
  );

  if (stmt.target.type === "Identifier") {
    interp.currentScope().assign(
      stmt.target.name,
      value
    );

    interp.recordState({
      node: stmt,
      changed: [stmt.target.name],
    });

    return;
  }

  if (stmt.target.type === "Index") {
    assignIndex(
      stmt.target,
      value,
      interp
    );

    interp.recordState({
      node: stmt,
      changed: [
        stmt.target.object.name,
      ],
    });

    return;
  }

  throw runtimeError(
    RuntimeErrorType.INVALID_AST,
    `Unsupported assignment target "${stmt.target.type}".`,
    "This assignment target isn't supported.",
    stmt
  );
}

function executeIf(stmt, interp) {
  const cond = toBoolean(
    evaluateExpression(
      stmt.condition,
      interp
    )
  );

  interp.recordState({
    node: stmt,
    extra: {
      branch: cond
        ? "then"
        : "else",
    },
  });

  if (cond) {
    executeStatements(
      stmt.thenBody,
      interp
    );
  } else if (stmt.elseBody) {
    executeStatements(
      stmt.elseBody,
      interp
    );
  }
}

function executeWhile(
  stmt,
  interp
) {
  let iterations = 0;

  while (true) {
    interp.checkStepLimit(stmt);

    const cond = toBoolean(
      evaluateExpression(
        stmt.condition,
        interp
      )
    );

    interp.recordState({
      node: stmt,
      extra: {
        conditionMet: cond,
        iteration: iterations,
      },
    });

    if (!cond) break;

    interp.checkLoopIterationLimit(
      stmt,
      iterations
    );

    executeStatements(
      stmt.body,
      interp
    );

    iterations++;
  }
}

function executeFor(
  stmt,
  interp
) {
  const scope =
    interp.currentScope();

  const start =
    evaluateExpression(
      stmt.start,
      interp
    );

  const end =
    evaluateExpression(
      stmt.end,
      interp
    );

  if (
    typeof start !== "number" ||
    typeof end !== "number"
  ) {
    throw runtimeError(
      RuntimeErrorType.INVALID_OPERATION,
      "FOR loop bounds must be numbers.",
      "The start and end of a FOR loop must both be numbers.",
      stmt
    );
  }

  scope.declare(
    stmt.variable,
    start
  );

  const stepDir =
    stmt.direction === "DOWNTO"
      ? -1
      : 1;

  let iterations = 0;

  while (true) {
    interp.checkStepLimit(stmt);

    const current = scope.get(
      stmt.variable
    );

    const continueLoop =
      stepDir === 1
        ? current <= end
        : current >= end;

    interp.recordState({
      node: stmt,
      extra: {
        loopVar: stmt.variable,
        conditionMet: continueLoop,
        iteration: iterations,
      },
    });

    if (!continueLoop) break;

    interp.checkLoopIterationLimit(
      stmt,
      iterations
    );

    executeStatements(
      stmt.body,
      interp
    );

    iterations++;

    scope.assign(
      stmt.variable,
      scope.get(stmt.variable) +
        stepDir
    );
  }
}

function executeReturn(
  stmt,
  interp
) {
  const value =
    stmt.value !== null &&
    stmt.value !== undefined
      ? evaluateExpression(
          stmt.value,
          interp
        )
      : null;

  interp.recordState({
    node: stmt,
    extra: {
      returnValue: value,
    },
  });

  throw new ReturnSignal(value);
}