import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  validate,
} from "../../src/pseudocode/validate.js";

import {
  execute,
} from "../../src/pseudocode/interpreter.js";

import {
  getStarterTemplate,
} from "../../src/practice/starterTemplates.js";

import {
  ALGORITHMS,
} from "../../src/engine/index.js";

function run(source, input) {
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
    input
  );
}

describe(
  "Boyer-Moore execution: character comparison",
  () => {
    test(
      "a text[...] = pattern[...] comparison is captured on the execution state",
      () => {
        const r = run(
          "j ← 0\n" +
            "s ← 0\n" +
            "result ← text[s + j] = pattern[j]",
          {
            text: "ABC",
            pattern: "A",
          }
        );

        assert.equal(
          r.status,
          "completed"
        );

        const withComparison =
          r.trace.find(
            (state) =>
              state.currentComparison
          );

        assert.ok(
          withComparison,
          "expected a state carrying a currentComparison"
        );

        assert.equal(
          withComparison.currentComparison.textIndex,
          0
        );

        assert.equal(
          withComparison.currentComparison.patternIndex,
          0
        );

        assert.equal(
          withComparison.currentComparison.textChar,
          "A"
        );

        assert.equal(
          withComparison.currentComparison.patternChar,
          "A"
        );
      }
    );

    test(
      "a matching comparison is represented as result: match",
      () => {
        const r = run(
          "outcome ← text[0] = pattern[0]",
          {
            text: "AXY",
            pattern: "A",
          }
        );

        const state = r.trace.find(
          (s) =>
            s.currentComparison
        );

        assert.equal(
          state.currentComparison.result,
          "match"
        );

        assert.equal(
          state.mismatch,
          false
        );
      }
    );

    test(
      "a mismatching comparison is represented as result: mismatch",
      () => {
        const r = run(
          "outcome ← text[0] = pattern[0]",
          {
            text: "XYZ",
            pattern: "A",
          }
        );

        const state = r.trace.find(
          (s) =>
            s.currentComparison
        );

        assert.equal(
          state.currentComparison.result,
          "mismatch"
        );

        assert.equal(
          state.mismatch,
          true
        );
      }
    );
  }
);

describe(
  "Boyer-Moore execution: bad character / good suffix shifts",
  () => {
    test(
      "badCharacterShift is present in the normalized state when the student uses that name",
      () => {
        const r = run(
          "j ← 2\n" +
            "lastOccurrence[2] ← -1\n" +
            "badCharacterShift ← MAX(1, j - lastOccurrence[j])",
          {
            text: "ABABABA",
            pattern: "ABA",
          }
        );

        assert.equal(
          r.status,
          "completed"
        );

        assert.equal(
          r.finalVariables.badCharacterShift,
          3
        );

        const state = r.trace.find(
          (s) =>
            s.badCharacterShift !==
            undefined
        );

        assert.ok(state);

        assert.equal(
          state.badCharacterShift,
          3
        );
      }
    );

    test(
      "goodSuffixShift is present in the normalized state when the student uses that name",
      () => {
        const r = run(
          "goodSuffixShift ← 5",
          {}
        );

        const state = r.trace.find(
          (s) =>
            s.goodSuffixShift !==
            undefined
        );

        assert.ok(state);

        assert.equal(
          state.goodSuffixShift,
          5
        );
      }
    );

    test(
      "an alternate alignment variable name (s) is still normalized to alignment",
      () => {
        const r = run(
          "s ← 3",
          {}
        );

        const state = r.trace.find(
          (st) =>
            st.alignment !== undefined
        );

        assert.ok(state);

        assert.equal(
          state.alignment,
          3
        );
      }
    );

    test(
      "no normalized field is invented when the student's program never uses a recognized name",
      () => {
        const r = run(
          "banana ← 10",
          {}
        );

        for (const state of r.trace) {
          assert.equal(
            state.alignment,
            undefined
          );

          assert.equal(
            state.badCharacterShift,
            undefined
          );

          assert.equal(
            state.goodSuffixShift,
            undefined
          );

          assert.equal(
            state.chosenShift,
            undefined
          );

          assert.equal(
            state.match,
            undefined
          );
        }
      }
    );
  }
);

describe(
  "Boyer-Moore execution: combined Full Boyer-Moore shift",
  () => {
    test(
      "shift ← MAX(badShift, goodShift) records the chosen shift, derived (not hardcoded)",
      () => {
        const r = run(
          `badCharacterShift ← 2
goodSuffixShift ← 5
shift ← MAX(badCharacterShift, goodSuffixShift)`,
          {}
        );

        assert.equal(
          r.finalVariables.shift,
          5
        );

        const state = r.trace.find(
          (s) =>
            s.chosenShift !==
            undefined
        );

        assert.ok(state);

        assert.equal(
          state.chosenShift,
          5
        );
      }
    );

    test(
      "the chosen shift changes when the underlying values change (not a fixed trace)",
      () => {
        const r1 = run(
          "badCharacterShift ← 1\n" +
            "goodSuffixShift ← 9\n" +
            "shift ← MAX(badCharacterShift, goodSuffixShift)",
          {}
        );

        const r2 = run(
          "badCharacterShift ← 9\n" +
            "goodSuffixShift ← 1\n" +
            "shift ← MAX(badCharacterShift, goodSuffixShift)",
          {}
        );

        assert.equal(
          r1.finalVariables.shift,
          9
        );

        assert.equal(
          r2.finalVariables.shift,
          9
        );

        assert.notDeepEqual(
          r1.trace,
          r2.trace
        );
      }
    );
  }
);

describe(
  "Boyer-Moore execution: real starter templates run end-to-end",
  () => {
    const cases = [
      {
        algorithm:
          ALGORITHMS.BAD_CHARACTER,
        text: "ABABABA",
        pattern: "ABA",
      },
      {
        algorithm:
          ALGORITHMS.GOOD_SUFFIX,
        text: "ABABABA",
        pattern: "ABA",
      },
      {
        algorithm:
          ALGORITHMS.FULL,
        text: "ABABABA",
        pattern: "ABA",
      },
    ];

    for (const {
      algorithm,
      text,
      pattern,
    } of cases) {
      test(
        `${algorithm} starter template executes and returns a real (non-hardcoded) match position`,
        () => {
          const source =
            getStarterTemplate(
              algorithm
            );

          const validation =
            validate(source);

          assert.equal(
            validation.valid,
            true
          );

          const r = execute(
            validation.ast,
            {
              text,
              pattern,
            }
          );

          assert.equal(
            r.status,
            "completed"
          );

          assert.equal(
            typeof r.result,
            "number"
          );

          assert.equal(
            text.slice(
              r.result,
              r.result +
                pattern.length
            ),
            pattern
          );

          assert.ok(
            r.trace.length > 0
          );

          assert.ok(
            r.steps > 0
          );
        }
      );
    }

    test(
      "bad-character template on a text with no match hits the undefined-return runtime error, not a fake result",
      () => {
        const source =
          getStarterTemplate(
            ALGORITHMS.BAD_CHARACTER
          );

        const validation =
          validate(source);

        const r = execute(
          validation.ast,
          {
            text: "XXXXXXX",
            pattern: "ABA",
          }
        );

        assert.equal(
          r.status,
          "runtime-error"
        );

        assert.equal(
          r.error.type,
          "undefined-runtime-value"
        );
      }
    );

    test(
      "different (text, pattern) inputs to the same template produce different traces",
      () => {
        const source =
          getStarterTemplate(
            ALGORITHMS.FULL
          );

        const validation =
          validate(source);

        const r1 = execute(
          validation.ast,
          {
            text: "ABABABA",
            pattern: "ABA",
          }
        );

        const r2 = execute(
          validation.ast,
          {
            text: "AAAAAAAA",
            pattern: "AA",
          }
        );

        assert.notEqual(
          r1.steps,
          r2.steps
        );

        assert.notDeepEqual(
          r1.trace,
          r2.trace
        );
      }
    );
  }
);