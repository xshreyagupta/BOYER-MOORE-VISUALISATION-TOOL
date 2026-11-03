// PHASE 11 -- Pseudocode Execution Engine.
//
// Validated AST -> Execution Context -> Runtime State -> Execution Trace.

import { validate } from "./validate.js";

import {
  Scope,
  RuntimeArray,
} from "./runtime.js";

import {
  runtimeError,
  RuntimeErrorType,
  PseudocodeRuntimeError,
} from "./runtimeErrors.js";

import {
  executeStatements,
  ReturnSignal,
} from "./statementExecutor.js";

import {
  createTraceBuilder,
  normalizeBoyerMooreState,
} from "./executionTrace.js";

const DEFAULT_MAX_STEPS = 20000;
const DEFAULT_MAX_CALL_DEPTH = 200;
const DEFAULT_MAX_LOOP_ITERATIONS = 20000;

function hoistFunctions(
  statements,
  table
) {
  for (const stmt of statements) {
    if (
      stmt.type === "Function" &&
      stmt.name &&
      !table.has(stmt.name)
    ) {
      table.set(
        stmt.name,
        stmt
      );
    }

    for (const key of [
      "thenBody",
      "elseBody",
      "body",
    ]) {
      if (Array.isArray(stmt[key])) {
        hoistFunctions(
          stmt[key],
          table
        );
      }
    }
  }
}

function findImplicitEntryPoint(
  programBody
) {
  const nonFunctionStatements =
    programBody.filter(
      (s) => s.type !== "Function"
    );

  const topFunctions =
    programBody.filter(
      (s) => s.type === "Function"
    );

  if (
    nonFunctionStatements.length === 0 &&
    topFunctions.length === 1
  ) {
    const fn = topFunctions[0];

    if (
      !fn.params ||
      fn.params.length === 0
    ) {
      return fn;
    }
  }

  return null;
}

class Interpreter {
  constructor(
    ast,
    runtimeInput,
    options
  ) {
    this.ast = ast;

    this.options = {
      maxSteps:
        options.maxSteps ??
        DEFAULT_MAX_STEPS,

      maxCallDepth:
        options.maxCallDepth ??
        DEFAULT_MAX_CALL_DEPTH,

      maxLoopIterations:
        options.maxLoopIterations ??
        DEFAULT_MAX_LOOP_ITERATIONS,

      autoInvokeEntry:
        options.autoInvokeEntry ??
        true,
    };

    this.functionTable = new Map();

    hoistFunctions(
      ast.body,
      this.functionTable
    );

    this.globalScope =
      new Scope(null, "global");

    this.scopeStack = [
      this.globalScope,
    ];

    this.callStack = [];

    this.trace =
      createTraceBuilder();

    this.stepCount = 0;
    this.pendingComparison = null;
    this.runtimeWarnings = [];

    this.initializeGlobals(
      runtimeInput
    );
  }

  initializeGlobals(
    runtimeInput
  ) {
    const text =
      runtimeInput?.text ?? "";

    const pattern =
      runtimeInput?.pattern ?? "";

    this.globalScope.declare(
      "text",
      RuntimeArray.fromString(text)
    );

    this.globalScope.declare(
      "pattern",
      RuntimeArray.fromString(pattern)
    );

    this.globalScope.declare(
      "n",
      text.length
    );

    this.globalScope.declare(
      "m",
      pattern.length
    );
  }

  currentScope() {
    return this.scopeStack[
      this.scopeStack.length - 1
    ];
  }

  setPendingComparison(
    comparison
  ) {
    this.pendingComparison =
      comparison;
  }

  checkStepLimit(node) {
    this.stepCount++;

    if (
      this.stepCount >
      this.options.maxSteps
    ) {
      throw runtimeError(
        RuntimeErrorType.STEP_LIMIT,
        `Execution stopped after exceeding the maximum allowed number of steps (${this.options.maxSteps}).`,
        "Execution stopped because the program exceeded the maximum allowed number of steps. This may indicate an infinite loop.",
        node
      );
    }
  }

  checkLoopIterationLimit(
    node,
    iterations
  ) {
    if (
      iterations >=
      this.options.maxLoopIterations
    ) {
      throw runtimeError(
        RuntimeErrorType.STEP_LIMIT,
        `A single loop exceeded the maximum allowed number of iterations (${this.options.maxLoopIterations}).`,
        "Execution stopped because a loop ran too many times without finishing. This may indicate an infinite loop.",
        node
      );
    }
  }

  recordState({
    node,
    changed = [],
    extra = {},
  }) {
    const variables =
      this.currentScope().snapshot();

    const comparison =
      this.pendingComparison;

    this.pendingComparison =
      null;

    const normalized =
      normalizeBoyerMooreState(
        variables,
        comparison
      );

    return this.trace.push({
      line: node.line ?? null,
      nodeType: node.type,
      variables,
      changedVariables: changed,
      callStack:
        this.callStack.map(
          (frame) => frame.name
        ),
      comparison,
      ...normalized,
      ...extra,
    });
  }

  callFunction(
    name,
    argValues,
    callNode
  ) {
    const fnNode =
      this.functionTable.get(name);

    if (!fnNode) {
      throw runtimeError(
        RuntimeErrorType.UNDEFINED_FUNCTION,
        `"${name}(...)" was called, but no FUNCTION named "${name}" is defined.`,
        `There's no FUNCTION ${name}(...) defined anywhere -- define it, or use MAX/MIN.`,
        callNode
      );
    }

    const params =
      fnNode.params ?? [];

    if (
      params.length !==
      argValues.length
    ) {
      throw runtimeError(
        RuntimeErrorType.ARITY_MISMATCH,
        `"${name}" expects ${params.length} argument(s), got ${argValues.length}.`,
        `"${name}(...)" needs ${params.length} argument(s), but this call passed ${argValues.length}.`,
        callNode
      );
    }

    if (
      this.callStack.length >=
      this.options.maxCallDepth
    ) {
      throw runtimeError(
        RuntimeErrorType.EXCESSIVE_RECURSION,
        `Call depth exceeded ${this.options.maxCallDepth} -- likely unbounded recursion.`,
        `"${name}" is calling itself (directly or indirectly) too many times -- check for a missing base case or RETURN.`,
        callNode
      );
    }

    const fnScope =
      new Scope(
        this.globalScope,
        `function:${name}`
      );

    params.forEach(
      (p, i) =>
        fnScope.declare(
          p,
          argValues[i]
        )
    );

    this.callStack.push({
      name,
      line:
        callNode.line ?? null,
    });

    this.scopeStack.push(
      fnScope
    );

    let result = null;

    try {
      executeStatements(
        fnNode.body,
        this
      );
    } catch (signal) {
      if (
        signal instanceof
        ReturnSignal
      ) {
        result = signal.value;
      } else {
        throw signal;
      }
    } finally {
      this.scopeStack.pop();
      this.callStack.pop();
    }

    return result;
  }

  run() {
    try {
      executeStatements(
        this.ast.body,
        this
      );

      const entry =
        this.options.autoInvokeEntry
          ? findImplicitEntryPoint(
              this.ast.body
            )
          : null;

      const result = entry
        ? this.callFunction(
            entry.name,
            [],
            entry
          )
        : null;

      return this.finish(
        "completed",
        result
      );
    } catch (err) {
      if (
        err instanceof
        PseudocodeRuntimeError
      ) {
        const status =
          err.type ===
          RuntimeErrorType.STEP_LIMIT
            ? "step-limit"
            : "runtime-error";

        return this.finish(
          status,
          null,
          err
        );
      }

      throw err;
    }
  }

  finish(
    status,
    result,
    err = null
  ) {
    return {
      status,
      result,
      trace:
        this.trace.getStates(),
      finalVariables:
        this.globalScope.snapshot(),
      steps: this.stepCount,
      runtimeWarnings:
        this.runtimeWarnings,
      error:
        err
          ? err.toDiagnostic()
          : null,
    };
  }
}

export function execute(
  ast,
  runtimeInput = {},
  options = {}
) {
  if (
    !ast ||
    ast.type !== "Program" ||
    !Array.isArray(ast.body)
  ) {
    return {
      status: "invalid",
      result: null,
      trace: [],
      finalVariables: {},
      steps: 0,
      runtimeWarnings: [],
      error: {
        type: "invalid-ast",
        message:
          "No valid Program AST was provided to the interpreter.",
        studentMessage:
          "This program has to pass validation before it can run.",
        line: null,
        column: null,
      },
    };
  }

  const interpreter =
    new Interpreter(
      ast,
      runtimeInput,
      options
    );

  return interpreter.run();
}

export function executeSource(
  source,
  runtimeInput = {},
  options = {}
) {
  const validation =
    validate(source);

  if (!validation.valid) {
    const firstError =
      validation.diagnostics.find(
        (d) =>
          d.severity === "error"
      );

    return {
      status: "invalid",
      result: null,
      trace: [],
      finalVariables: {},
      steps: 0,
      runtimeWarnings: [],
      error: {
        type: "validation-failed",
        message:
          "Pseudocode did not pass validation.",
        studentMessage:
          "Fix the validation errors shown below before running this pseudocode.",
        line:
          firstError?.line ?? null,
        column:
          firstError?.column ?? null,
      },
      diagnostics:
        validation.diagnostics,
    };
  }

  return execute(
    validation.ast,
    runtimeInput,
    options
  );
}

export { RuntimeErrorType };