import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { validate } from "../../src/pseudocode/validate.js";

describe("semantic: RETURN placement", () => {
  test("RETURN inside a FUNCTION is fine", () => {
    const result = validate(
      "FUNCTION f()\n  RETURN 1\nEND FUNCTION"
    );

    assert.ok(
      !result.diagnostics.some(
        (d) =>
          d.code ===
          "return-outside-function"
      )
    );
  });

  test("RETURN at top level is an error", () => {
    const result = validate("RETURN 1");

    const diag = result.diagnostics.find(
      (d) =>
        d.code ===
        "return-outside-function"
    );

    assert.ok(diag);
    assert.equal(diag.severity, "error");
    assert.equal(result.valid, false);
  });

  test("a FUNCTION with a body but no RETURN gets a warning, not an error", () => {
    const result = validate(
      "FUNCTION f()\n  x ← 1\nEND FUNCTION"
    );

    const diag = result.diagnostics.find(
      (d) =>
        d.code ===
        "function-missing-return"
    );

    assert.ok(diag);
    assert.equal(diag.severity, "warning");
    assert.equal(result.valid, true);
  });

  test("a nested function's RETURN does not satisfy an outer function's requirement", () => {
    const result = validate(
      "FUNCTION outer()\n" +
        "  FUNCTION inner()\n" +
        "    RETURN 1\n" +
        "  END FUNCTION\n" +
        "  x ← 1\n" +
        "END FUNCTION"
    );

    assert.ok(
      result.diagnostics.some(
        (d) =>
          d.code ===
            "function-missing-return" &&
          d.message.includes("outer")
      )
    );
  });
});

describe("semantic: MAX/MIN arity", () => {
  test("MAX with two arguments is fine", () => {
    const result = validate(
      "x ← MAX(1, 2)"
    );

    assert.ok(
      !result.diagnostics.some(
        (d) =>
          d.code ===
          "max-min-arity"
      )
    );
  });

  test("MAX with one argument is an error", () => {
    const result = validate(
      "x ← MAX(1)"
    );

    const diag = result.diagnostics.find(
      (d) =>
        d.code ===
        "max-min-arity"
    );

    assert.ok(diag);
    assert.equal(diag.severity, "error");
  });

  test("MIN with three arguments is an error", () => {
    const result = validate(
      "x ← MIN(1, 2, 3)"
    );

    assert.ok(
      result.diagnostics.some(
        (d) =>
          d.code ===
          "max-min-arity"
      )
    );
  });
});

describe("semantic: unknown function calls", () => {
  test("calling an undefined function is an error", () => {
    const result = validate(
      "x ← doStuff(1)"
    );

    const diag = result.diagnostics.find(
      (d) =>
        d.code ===
        "unknown-function-call"
    );

    assert.ok(diag);
    assert.equal(result.valid, false);
  });

  test("calling a FUNCTION defined earlier in the same program is fine", () => {
    const result = validate(
      "FUNCTION helper()\n" +
        "  RETURN 1\n" +
        "END FUNCTION\n" +
        "x ← helper()"
    );

    assert.ok(
      !result.diagnostics.some(
        (d) =>
          d.code ===
          "unknown-function-call"
      )
    );
  });

  test("calling a FUNCTION defined later in the same program is fine (forward reference)", () => {
    const result = validate(
      "x ← helper()\n" +
        "FUNCTION helper()\n" +
        "  RETURN 1\n" +
        "END FUNCTION"
    );

    assert.ok(
      !result.diagnostics.some(
        (d) =>
          d.code ===
          "unknown-function-call"
      )
    );
  });
});

describe("semantic: empty blocks", () => {
  test("an empty IF body is a warning", () => {
    const result = validate(
      "IF x = 0 THEN\nEND IF"
    );

    const diag = result.diagnostics.find(
      (d) => d.code === "empty-block"
    );

    assert.ok(diag);
    assert.equal(diag.severity, "warning");
  });

  test("a non-empty IF body has no empty-block warning", () => {
    const result = validate(
      "IF x = 0 THEN\n  y ← 1\nEND IF"
    );

    assert.ok(
      !result.diagnostics.some(
        (d) => d.code === "empty-block"
      )
    );
  });
});