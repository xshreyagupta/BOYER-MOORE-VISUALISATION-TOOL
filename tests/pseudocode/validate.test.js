import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { validate } from "../../src/pseudocode/validate.js";
import { getStarterTemplate } from "../../src/practice/starterTemplates.js";
import { ALGORITHMS } from "../../src/engine/index.js";

describe("validate: overall shape", () => {
  test("returns valid: true and no diagnostics for clean pseudocode", () => {
    const result = validate(
      "i ← 0\nj ← i + 1"
    );

    assert.equal(result.valid, true);
    assert.equal(result.diagnostics.length, 0);
    assert.equal(result.errorCount, 0);
    assert.equal(result.warningCount, 0);
  });

  test("valid is false whenever there is at least one error diagnostic", () => {
    const result = validate("0 ← i");

    assert.equal(result.valid, false);
    assert.ok(result.errorCount >= 1);
  });

  test("valid is true when there are only warnings", () => {
    const result = validate(
      "x ← text[-1]"
    );

    assert.equal(result.valid, true);
    assert.ok(result.warningCount >= 1);
    assert.equal(result.errorCount, 0);
  });

  test("empty input is valid", () => {
    const result = validate("");

    assert.equal(result.valid, true);
    assert.equal(result.diagnostics.length, 0);
  });

  test("diagnostics are sorted by line number", () => {
    const result = validate(
      "x ← doStuff()\ny ← text[-1]"
    );

    for (
      let i = 1;
      i < result.diagnostics.length;
      i++
    ) {
      assert.ok(
        result.diagnostics[i].line >=
          result.diagnostics[i - 1].line
      );
    }
  });

  test("every diagnostic has a severity, message, studentMessage, and line", () => {
    const result = validate(
      "0 ← i\nx ← text[-1]"
    );

    for (const d of result.diagnostics) {
      assert.ok(
        d.severity === "error" ||
          d.severity === "warning"
      );

      assert.equal(
        typeof d.message,
        "string"
      );

      assert.equal(
        typeof d.studentMessage,
        "string"
      );

      assert.ok(d.line >= 1);
    }
  });

  test("known diagnostic codes resolve to a rulebook section id", () => {
    const result = validate("0 ← i");

    const diag = result.diagnostics[0];

    assert.ok(
      diag.ruleId,
      "expected a ruleId to be resolved"
    );
  });

  test("does not run semantic/structural passes on top of a broken parse", () => {
    const result = validate("i 0");

    assert.ok(
      !result.diagnostics.some(
        (d) =>
          d.source === "variables" ||
          d.source === "semantic" ||
          d.source === "arrays" ||
          d.source === "indentation"
      )
    );
  });
});

describe("validate: rulebook valid/invalid examples", () => {
  test("rulebook variables valid example passes", () => {
    assert.equal(
      validate("i ← 0").valid,
      true
    );
  });

  test("rulebook variables invalid example fails", () => {
    assert.equal(
      validate("0 ← i").valid,
      false
    );
  });

  test("rulebook IF valid example passes", () => {
    assert.equal(
      validate(
        "IF j ≥ 0 THEN\n  j ← j - 1\nEND IF"
      ).valid,
      true
    );
  });

  test("rulebook IF invalid example fails", () => {
    assert.equal(
      validate(
        "IF j ≥ 0\n  j ← j - 1\nEND IF"
      ).valid,
      false
    );
  });

  test("rulebook WHILE valid example passes", () => {
    assert.equal(
      validate(
        "WHILE j ≥ 0 DO\n  j ← j - 1\nEND WHILE"
      ).valid,
      true
    );
  });

  test("rulebook WHILE invalid example fails", () => {
    assert.equal(
      validate(
        "WHILE j ≥ 0\n  j ← j - 1"
      ).valid,
      false
    );
  });
});

describe("validate: starter templates", () => {
  for (const algorithm of Object.values(ALGORITHMS)) {
    test(
      `${algorithm} starter template validates cleanly`,
      () => {
        const result = validate(
          getStarterTemplate(algorithm)
        );

        assert.deepEqual(
          result.diagnostics.map(
            (d) =>
              `${d.severity} ${d.code} @${d.line}: ${d.message}`
          ),
          []
        );

        assert.equal(
          result.valid,
          true
        );
      }
    );
  }
});