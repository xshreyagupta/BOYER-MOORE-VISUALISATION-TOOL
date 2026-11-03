import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { validate } from "../../src/pseudocode/validate.js";

describe("indentation", () => {
  test("correctly indented IF body produces no indentation warnings", () => {
    const result = validate(
      "IF x = 0 THEN\n  y ← 1\nEND IF"
    );

    assert.ok(
      !result.diagnostics.some(
        (d) =>
          d.code === "inconsistent-indentation"
      )
    );
  });

  test("an unindented block body is flagged as a warning, not an error", () => {
    const result = validate(
      "x ← 0\nIF x = 0 THEN\ny ← 1\nEND IF"
    );

    const diag = result.diagnostics.find(
      (d) =>
        d.code ===
        "inconsistent-indentation"
    );

    assert.ok(
      diag,
      "expected an inconsistent-indentation diagnostic"
    );

    assert.equal(diag.severity, "warning");
    assert.equal(diag.line, 3);
  });

  test("indentation warnings alone do not make the pseudocode invalid", () => {
    const result = validate(
      "x ← 0\nIF x = 0 THEN\ny ← 1\nEND IF"
    );

    assert.equal(result.valid, true);
    assert.equal(result.errorCount, 0);
  });

  test("nested blocks require 2 additional spaces per level", () => {
    const result = validate(
      "WHILE x < 10 DO\n" +
        "  IF x = 0 THEN\n" +
        "    x ← 1\n" +
        "  END IF\n" +
        "END WHILE"
    );

    assert.ok(
      !result.diagnostics.some(
        (d) =>
          d.code ===
          "inconsistent-indentation"
      )
    );
  });

  test("wrong nested indentation is flagged at the offending line", () => {
    const result = validate(
      "WHILE x < 10 DO\n" +
        "  IF x = 0 THEN\n" +
        "  x ← 1\n" +
        "  END IF\n" +
        "END WHILE"
    );

    const diag = result.diagnostics.find(
      (d) =>
        d.code ===
        "inconsistent-indentation"
    );

    assert.ok(diag);
    assert.equal(diag.line, 3);
  });

  test("blank lines are ignored", () => {
    const result = validate(
      "x ← 0\nIF x = 0 THEN\n\n  y ← 1\nEND IF"
    );

    assert.ok(
      !result.diagnostics.some(
        (d) =>
          d.code ===
          "inconsistent-indentation"
      )
    );
  });

  test("every indentation diagnostic links to the indentation rulebook section", () => {
    const result = validate(
      "x ← 0\nIF x = 0 THEN\ny ← 1\nEND IF"
    );

    const diag = result.diagnostics.find(
      (d) =>
        d.code ===
        "inconsistent-indentation"
    );

    assert.equal(
      diag.ruleId,
      "indentation"
    );
  });
});