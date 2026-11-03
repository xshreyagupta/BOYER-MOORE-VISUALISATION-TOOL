import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  getStarterTemplate,
} from "../../src/practice/starterTemplates.js";

import {
  validate,
} from "../../src/pseudocode/validate.js";

import {
  ALGORITHMS,
} from "../../src/engine/index.js";

describe("getStarterTemplate", () => {
  for (const algorithm of Object.values(ALGORITHMS)) {
    test(
      `returns a non-empty string for "${algorithm}"`,
      () => {
        const template =
          getStarterTemplate(algorithm);

        assert.equal(
          typeof template,
          "string"
        );

        assert.ok(
          template.trim().length > 0
        );
      }
    );

    test(
      `"${algorithm}" template validates with zero errors and zero warnings`,
      () => {
        const result = validate(
          getStarterTemplate(algorithm)
        );

        assert.equal(
          result.errorCount,
          0
        );

        assert.equal(
          result.warningCount,
          0
        );
      }
    );

    test(
      `"${algorithm}" template defines a FUNCTION that RETURNs a value`,
      () => {
        const template =
          getStarterTemplate(algorithm);

        assert.ok(
          /FUNCTION/.test(template)
        );

        assert.ok(
          /RETURN/.test(template)
        );
      }
    );
  }

  test(
    "falls back gracefully for an unknown algorithm id",
    () => {
      const template =
        getStarterTemplate(
          "not-a-real-algorithm"
        );

      assert.equal(
        typeof template,
        "string"
      );

      assert.ok(
        template.length > 0
      );
    }
  );
});