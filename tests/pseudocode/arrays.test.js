import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { validate } from "../../src/pseudocode/validate.js";

describe("arrays: negative literal index", () => {
  test("a negative literal index is a warning", () => {
    const result = validate(
      "x ← text[-1]"
    );

    const diag = result.diagnostics.find(
      (d) =>
        d.code ===
        "negative-literal-index"
    );

    assert.ok(diag);
    assert.equal(diag.severity, "warning");
    assert.equal(result.valid, true);
  });

  test("an index computed from a variable is not flagged", () => {
    const result = validate(
      "x ← text[i]"
    );

    assert.ok(
      !result.diagnostics.some(
        (d) =>
          d.code ===
          "negative-literal-index"
      )
    );
  });

  test("a negative literal index on an assignment target is flagged", () => {
    const result = validate(
      "table[-1] ← 0"
    );

    assert.ok(
      result.diagnostics.some(
        (d) =>
          d.code ===
          "negative-literal-index"
      )
    );
  });

  test("subtraction like m - 1 used as an index is not flagged as negative", () => {
    const result = validate(
      "x ← pattern[m - 1]"
    );

    assert.ok(
      !result.diagnostics.some(
        (d) =>
          d.code ===
          "negative-literal-index"
      )
    );
  });
});

describe("arrays: inconsistent usage", () => {
  test("using a name only as an array is fine", () => {
    const result = validate(
      "table[0] ← 1\nx ← table[0]"
    );

    assert.ok(
      !result.diagnostics.some(
        (d) =>
          d.code ===
          "inconsistent-array-usage"
      )
    );
  });

  test("using the same name both as an array and as a plain variable warns", () => {
    const result = validate(
      "table[0] ← 1\nx ← table"
    );

    const diag = result.diagnostics.find(
      (d) =>
        d.code ===
        "inconsistent-array-usage"
    );

    assert.ok(diag);
    assert.equal(diag.severity, "warning");
    assert.equal(result.valid, true);
  });

  test("the index variable itself is not considered inconsistent usage", () => {
    const result = validate(
      "table[0] ← 1\n" +
        "i ← 0\n" +
        "x ← table[i]\n" +
        "y ← i + 1"
    );

    assert.ok(
      !result.diagnostics.some(
        (d) =>
          d.code ===
          "inconsistent-array-usage"
      )
    );
  });
});