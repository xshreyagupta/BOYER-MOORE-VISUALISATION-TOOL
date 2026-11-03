import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  validate,
} from "../../src/pseudocode/validate.js";

import {
  execute,
  executeSource,
  RuntimeErrorType,
} from "../../src/pseudocode/interpreter.js";

function run(source, input = {}, options = {}) {
  const validation = validate(source);

  assert.equal(
    validation.valid,
    true,
    `expected valid pseudocode, got diagnostics: ${JSON.stringify(
      validation.diagnostics
    )}`
  );

  return execute(
    validation.ast,
    input,
    options
  );
}

describe("interpreter: expressions", () => {
  test("number literal", () => {
    const r = run("x ← 42");

    assert.equal(
      r.finalVariables.x,
      42
    );
  });

  test("variable reference", () => {
    const r = run(
      "x ← 5\ny ← x"
    );

    assert.equal(
      r.finalVariables.y,
      5
    );
  });

  test("arithmetic: + - * / %", () => {
    const r = run(
      "a ← 2 + 3\n" +
        "b ← 10 - 4\n" +
        "c ← 3 * 4\n" +
        "d ← 10 / 4\n" +
        "e ← 10 % 3"
    );

    assert.equal(
      r.finalVariables.a,
      5
    );

    assert.equal(
      r.finalVariables.b,
      6
    );

    assert.equal(
      r.finalVariables.c,
      12
    );

    assert.equal(
      r.finalVariables.d,
      2.5
    );

    assert.equal(
      r.finalVariables.e,
      1
    );
  });

  test("operator precedence: * before +, parens override", () => {
    const r = run(
      "a ← 2 + 3 * 4\n" +
        "b ← (2 + 3) * 4"
    );

    assert.equal(
      r.finalVariables.a,
      14
    );

    assert.equal(
      r.finalVariables.b,
      20
    );
  });

  test("comparisons", () => {
    const r = run(
      "a ← 1 = 1\n" +
        "b ← 1 ≠ 2\n" +
        "c ← 1 < 2\n" +
        "d ← 2 > 1\n" +
        "e ← 2 ≤ 2\n" +
        "f ← 2 ≥ 3"
    );

    assert.equal(
      r.finalVariables.a,
      true
    );

    assert.equal(
      r.finalVariables.b,
      true
    );

    assert.equal(
      r.finalVariables.c,
      true
    );

    assert.equal(
      r.finalVariables.d,
      true
    );

    assert.equal(
      r.finalVariables.e,
      true
    );

    assert.equal(
      r.finalVariables.f,
      false
    );
  });

  test("logical AND / OR / NOT with short-circuit", () => {
    const r = run(
      "a ← 1 < 2 AND 2 < 3\n" +
        "b ← 1 > 2 OR 2 < 3\n" +
        "c ← NOT (1 > 2)"
    );

    assert.equal(
      r.finalVariables.a,
      true
    );

    assert.equal(
      r.finalVariables.b,
      true
    );

    assert.equal(
      r.finalVariables.c,
      true
    );
  });

  test("unary minus", () => {
    const r = run(
      "x ← 5\ny ← -x"
    );

    assert.equal(
      r.finalVariables.y,
      -5
    );
  });

  test("MAX and MIN", () => {
    const r = run(
      "a ← MAX(3, 7)\n" +
        "b ← MIN(3, 7)"
    );

    assert.equal(
      r.finalVariables.a,
      7
    );

    assert.equal(
      r.finalVariables.b,
      3
    );
  });

  test("array access on text/pattern built-ins", () => {
    const r = run(
      "x ← text[0]\n" +
        "y ← pattern[1]",
      {
        text: "HELLO",
        pattern: "AB",
      }
    );

    assert.equal(
      r.finalVariables.x,
      "H"
    );

    assert.equal(
      r.finalVariables.y,
      "B"
    );
  });
});

describe("interpreter: assignments", () => {
  test("scalar assignment", () => {
    const r = run(
      "x ← 10"
    );

    assert.equal(
      r.finalVariables.x,
      10
    );
  });

  test("reassignment overwrites", () => {
    const r = run(
      "x ← 1\nx ← 2\nx ← x + 1"
    );

    assert.equal(
      r.finalVariables.x,
      3
    );
  });

  test("array assignment (index write/read)", () => {
    const r = run(
      "table[0] ← 100\n" +
        "table[1] ← 200\n" +
        "x ← table[0] + table[1]"
    );

    assert.equal(
      r.finalVariables.x,
      300
    );
  });
});

describe("interpreter: IF", () => {
  test("true branch executes", () => {
    const r = run(
      "x ← 0\n" +
        "IF 1 < 2 THEN\n" +
        "  x ← 1\n" +
        "END IF"
    );

    assert.equal(
      r.finalVariables.x,
      1
    );
  });

  test("false branch (no else) does not execute THEN", () => {
    const r = run(
      "x ← 0\n" +
        "IF 1 > 2 THEN\n" +
        "  x ← 1\n" +
        "END IF"
    );

    assert.equal(
      r.finalVariables.x,
      0
    );
  });

  test("ELSE runs when condition is false", () => {
    const r = run(
      "IF 1 > 2 THEN\n" +
        "  x ← 1\n" +
        "ELSE\n" +
        "  x ← 2\n" +
        "END IF"
    );

    assert.equal(
      r.finalVariables.x,
      2
    );
  });
});

describe("interpreter: WHILE", () => {
  test("zero iterations", () => {
    const r = run(
      "x ← 0\n" +
        "WHILE x > 0 DO\n" +
        "  x ← x + 1\n" +
        "END WHILE"
    );

    assert.equal(
      r.finalVariables.x,
      0
    );
  });

  test("one iteration", () => {
    const r = run(
      "x ← 0\n" +
        "WHILE x < 1 DO\n" +
        "  x ← x + 1\n" +
        "END WHILE"
    );

    assert.equal(
      r.finalVariables.x,
      1
    );
  });

  test("multiple iterations", () => {
    const r = run(
      "x ← 0\n" +
        "WHILE x < 5 DO\n" +
        "  x ← x + 1\n" +
        "END WHILE"
    );

    assert.equal(
      r.finalVariables.x,
      5
    );
  });

  test("re-evaluates condition every iteration (not unrolled)", () => {
    const r = run(
      "x ← 0\n" +
        "count ← 0\n" +
        "WHILE x < 3 DO\n" +
        "  x ← x + 1\n" +
        "  count ← count + 1\n" +
        "END WHILE"
    );

    assert.equal(
      r.finalVariables.count,
      3
    );
  });
});

describe("interpreter: FOR", () => {
  test("TO counts up and includes the end bound", () => {
    const r = run(
      "total ← 0\n" +
        "FOR i ← 1 TO 3 DO\n" +
        "  total ← total + i\n" +
        "END FOR"
    );

    assert.equal(
      r.finalVariables.total,
      6
    );
  });

  test("DOWNTO counts down and includes the end bound", () => {
    const r = run(
      "total ← 0\n" +
        "FOR i ← 3 DOWNTO 1 DO\n" +
        "  total ← total + i\n" +
        "END FOR"
    );

    assert.equal(
      r.finalVariables.total,
      6
    );
  });

  test("zero iterations when start is already past end (TO)", () => {
    const r = run(
      "total ← 0\n" +
        "FOR i ← 5 TO 1 DO\n" +
        "  total ← total + 1\n" +
        "END FOR"
    );

    assert.equal(
      r.finalVariables.total,
      0
    );
  });

  test("multiple iterations populate an array", () => {
    const r = run(
      "FOR i ← 0 TO 4 DO\n" +
        "  table[i] ← i * i\n" +
        "END FOR"
    );

    assert.deepEqual(
      r.finalVariables.table,
      {
        0: 0,
        1: 1,
        2: 4,
        3: 9,
        4: 16,
      }
    );
  });
});

describe("interpreter: functions", () => {
  test("parameters and return value", () => {
    const r = run(
      "FUNCTION square(x)\n" +
        "  RETURN x * x\n" +
        "END FUNCTION\n" +
        "\n" +
        "result ← square(6)"
    );

    assert.equal(
      r.finalVariables.result,
      36
    );
  });

  test("local variables do not leak into the caller", () => {
    const r = run(
      "FUNCTION setLocal()\n" +
        "  local ← 99\n" +
        "  RETURN local\n" +
        "END FUNCTION\n" +
        "\n" +
        "result ← setLocal()"
    );

    assert.equal(
      r.finalVariables.result,
      99
    );

    assert.equal(
      "local" in r.finalVariables,
      false
    );
  });

  test("nested calls", () => {
    const r = run(
      `FUNCTION add(a, b)
  RETURN a + b
END FUNCTION

FUNCTION double(x)
  RETURN add(x, x)
END FUNCTION

result ← double(21)`
    );

    assert.equal(
      r.finalVariables.result,
      42
    );
  });

  test("forward calls (calling a function defined later)", () => {
    const r = run(
      `result ← later(5)

FUNCTION later(x)
  RETURN x * 2
END FUNCTION`
    );

    assert.equal(
      r.finalVariables.result,
      10
    );
  });

  test("recursion works and returns correctly", () => {
    const r = run(
      `FUNCTION factorial(n)
  IF n ≤ 1 THEN
    RETURN 1
  ELSE
    RETURN n * factorial(n - 1)
  END IF
END FUNCTION

result ← factorial(5)`
    );

    assert.equal(
      r.finalVariables.result,
      120
    );
  });

  test("a single zero-argument top-level FUNCTION is auto-invoked as the entry point", () => {
    const r = run(
      `FUNCTION main()
  RETURN 7
END FUNCTION`
    );

    assert.equal(
      r.status,
      "completed"
    );

    assert.equal(
      r.result,
      7
    );
  });

  test("a program with real top-level statements is run exactly as written (no implicit call added)", () => {
    const r = run(
      `x ← 1

FUNCTION unused()
  RETURN 999
END FUNCTION`
    );

    assert.equal(
      r.finalVariables.x,
      1
    );

    assert.equal(
      r.result,
      null
    );
  });
});

describe("interpreter: arrays", () => {
  test("read after write", () => {
    const r = run(
      "a[2] ← 42\nx ← a[2]"
    );

    assert.equal(
      r.finalVariables.x,
      42
    );
  });

  test("write grows the array's known length", () => {
    const r = run(
      "a[0] ← 1\na[5] ← 2"
    );

    assert.equal(
      r.finalVariables.a[5],
      2
    );
  });

  test("bounds checking: negative index is a runtime error", () => {
    const r = run(
      "a[-1] ← 1"
    );

    assert.equal(
      r.status,
      "runtime-error"
    );

    assert.equal(
      r.error.type,
      RuntimeErrorType.INDEX_OUT_OF_BOUNDS
    );
  });

  test("bounds checking: reading past a known array length is a runtime error", () => {
    const r = run(
      "a[0] ← 1\nx ← a[5]"
    );

    assert.equal(
      r.status,
      "runtime-error"
    );

    assert.equal(
      r.error.type,
      RuntimeErrorType.INDEX_OUT_OF_BOUNDS
    );
  });

  test("reading text/pattern out of bounds is a runtime error", () => {
    const r = run(
      "x ← text[10]",
      {
        text: "AB",
        pattern: "A",
      }
    );

    assert.equal(
      r.status,
      "runtime-error"
    );

    assert.equal(
      r.error.type,
      RuntimeErrorType.INDEX_OUT_OF_BOUNDS
    );
  });
});

describe("interpreter: runtime errors", () => {
  test("division by zero", () => {
    const r = run(
      "x ← 1 / 0"
    );

    assert.equal(
      r.status,
      "runtime-error"
    );

    assert.equal(
      r.error.type,
      RuntimeErrorType.DIVISION_BY_ZERO
    );
  });

  test("modulo by zero", () => {
    const r = run(
      "x ← 1 % 0"
    );

    assert.equal(
      r.status,
      "runtime-error"
    );

    assert.equal(
      r.error.type,
      RuntimeErrorType.DIVISION_BY_ZERO
    );
  });

  test("invalid index (non-integer)", () => {
    const r = run(
      "a[0] ← 1\nx ← a[0.5]"
    );

    assert.equal(
      r.status,
      "runtime-error"
    );

    assert.equal(
      r.error.type,
      RuntimeErrorType.INVALID_ARRAY_ACCESS
    );
  });

  test("missing runtime value: RETURNing a variable whose only assignment never ran", () => {
    const r = run(
      `FUNCTION f()
  IF 1 > 2 THEN
    found ← 1
  END IF
  RETURN found
END FUNCTION

x ← f()`
    );

    assert.equal(
      r.status,
      "runtime-error"
    );

    assert.equal(
      r.error.type,
      RuntimeErrorType.UNDEFINED_VARIABLE
    );
  });

  test("invalid function call: unknown function surfaces as a runtime error if it slips past validation", () => {
    const ast = {
      type: "Program",
      body: [
        {
          type: "Assignment",
          target: {
            type: "Identifier",
            name: "x",
            line: 1,
            column: 1,
          },
          value: {
            type: "Call",
            name: "doesNotExist",
            args: [],
            line: 1,
            column: 5,
          },
          line: 1,
          column: 1,
        },
      ],
    };

    const r = execute(ast, {});

    assert.equal(
      r.status,
      "runtime-error"
    );

    assert.equal(
      r.error.type,
      RuntimeErrorType.UNDEFINED_FUNCTION
    );
  });

  test("step limit stops a genuinely infinite loop without hanging", () => {
    const r = run(
      "x ← 0\n" +
        "WHILE 1 = 1 DO\n" +
        "  x ← x + 1\n" +
        "END WHILE",
      {},
      {
        maxSteps: 1000,
      }
    );

    assert.equal(
      r.status,
      "step-limit"
    );

    assert.equal(
      r.error.type,
      RuntimeErrorType.STEP_LIMIT
    );
  });

  test("excessive recursion is caught by the call-depth limit", () => {
    const r = run(
      `FUNCTION loop(n)
  RETURN loop(n + 1)
END FUNCTION

x ← loop(0)`,
      {},
      {
        maxCallDepth: 100,
      }
    );

    assert.equal(
      r.status,
      "runtime-error"
    );

    assert.equal(
      r.error.type,
      RuntimeErrorType.EXCESSIVE_RECURSION
    );
  });
});

describe("interpreter: execution trace", () => {
  test("every state has a line number and node type", () => {
    const r = run(
      "x ← 1\ny ← 2"
    );

    assert.ok(
      r.trace.length >= 2
    );

    for (const state of r.trace) {
      assert.equal(
        typeof state.line,
        "number"
      );

      assert.equal(
        typeof state.nodeType,
        "string"
      );
    }
  });

  test("changedVariables records the variable an assignment just wrote", () => {
    const r = run(
      "x ← 1\nx ← 2"
    );

    const assignments =
      r.trace.filter(
        (s) =>
          s.nodeType ===
          "Assignment"
      );

    assert.equal(
      assignments.length,
      2
    );

    assert.deepEqual(
      assignments[1].changedVariables,
      ["x"]
    );
  });

  test("variable state is a snapshot as of that step", () => {
    const r = run(
      "x ← 1\nx ← 2\nx ← 3"
    );

    const assignments =
      r.trace.filter(
        (s) =>
          s.nodeType ===
          "Assignment"
      );

    assert.equal(
      assignments[0].variables.x,
      1
    );

    assert.equal(
      assignments[1].variables.x,
      2
    );

    assert.equal(
      assignments[2].variables.x,
      3
    );
  });

  test("call stack is recorded during a function call", () => {
    const r = run(
      `FUNCTION f()
  x ← 1
  RETURN x
END FUNCTION

y ← f()`
    );

    const inner = r.trace.find(
      (s) =>
        s.callStack.includes("f")
    );

    assert.ok(
      inner,
      "expected at least one state recorded inside the function call"
    );
  });

  test("trace is deterministic across repeated runs of the same program", () => {
    const source = `FUNCTION f(n)
  IF n ≤ 1 THEN
    RETURN 1
  ELSE
    RETURN n * f(n - 1)
  END IF
END FUNCTION

result ← f(4)`;

    const r1 = run(source);
    const r2 = run(source);

    assert.deepEqual(
      r1.trace,
      r2.trace
    );

    assert.equal(
      r1.result,
      r2.result
    );
  });
});

describe("interpreter: executeSource", () => {
  test("refuses to run pseudocode that fails validation", () => {
    const r = executeSource(
      "0 ← i"
    );

    assert.equal(
      r.status,
      "invalid"
    );

    assert.ok(
      Array.isArray(r.diagnostics)
    );

    assert.ok(
      r.diagnostics.length > 0
    );
  });

  test("runs pseudocode that passes validation", () => {
    const r = executeSource(
      "x ← 1 + 2"
    );

    assert.equal(
      r.status,
      "completed"
    );

    assert.equal(
      r.finalVariables.x,
      3
    );
  });
});

describe("interpreter: invalid AST guard", () => {
  test("execute() rejects a non-Program AST instead of running it", () => {
    const r = execute(null);

    assert.equal(
      r.status,
      "invalid"
    );
  });
});