import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  getTestCases,
  getVisibleTestCases,
  getHiddenTestCases,
  getTestCaseById,
  getExpectedOutput,
  CATEGORIES,
  ALGORITHMS,
} from "../../src/practice/testCases.js";

const ALL_ALGORITHMS = [ALGORITHMS.BAD_CHARACTER, ALGORITHMS.GOOD_SUFFIX, ALGORITHMS.FULL];

describe("getTestCases", () => {
  for (const algorithm of ALL_ALGORITHMS) {
    test(`every case has the required fields for ${algorithm}`, () => {
      const cases = getTestCases(algorithm);
      assert.ok(cases.length >= 10, "spec requires at least 10 cases");
      for (const c of cases) {
        assert.equal(typeof c.id, "string");
        assert.equal(typeof c.name, "string");
        assert.equal(typeof c.text, "string");
        assert.equal(typeof c.pattern, "string");
        assert.equal(typeof c.expected, "string");
        assert.equal(typeof c.category, "string");
        assert.equal(typeof c.difficulty, "string");
        assert.equal(typeof c.visible, "boolean");
      }
    });
  }

  test("ids are unique", () => {
    const cases = getTestCases(ALGORITHMS.FULL);
    const ids = new Set(cases.map((c) => c.id));
    assert.equal(ids.size, cases.length);
  });

  test("all required categories are represented", () => {
    const cases = getTestCases(ALGORITHMS.FULL);
    const present = new Set(cases.map((c) => c.category));
    for (const required of [
      CATEGORIES.BASIC,
      CATEGORIES.EDGE_CASE,
      CATEGORIES.MULTIPLE_MATCHES,
      CATEGORIES.OVERLAPPING_MATCHES,
      CATEGORIES.REPEATED_CHARACTERS,
      CATEGORIES.ADVERSARIAL,
      CATEGORIES.PERFORMANCE,
    ]) {
      assert.ok(present.has(required), `missing category: ${required}`);
    }
  });

  test("expected output matches the spec's worked example", () => {
    const cases = getTestCases(ALGORITHMS.FULL);
    const multi = cases.find((c) => c.id === "multiple-matches");
    assert.equal(multi.text, "ABCABCABC");
    assert.equal(multi.pattern, "ABC");
    assert.equal(multi.expected, "0 3 6");
  });

  test("pattern-absent case expects the literal string 'No match'", () => {
    const cases = getTestCases(ALGORITHMS.FULL);
    const absent = cases.find((c) => c.id === "pattern-absent");
    assert.equal(absent.expected, "No match");
  });

  test("all three algorithms agree on expected output for the same case", () => {
    for (const id of ["multiple-matches", "overlapping-matches", "adversarial-shift"]) {
      const expectedPerAlgorithm = ALL_ALGORITHMS.map(
        (algorithm) => getTestCaseById(algorithm, id).expected
      );
      assert.equal(new Set(expectedPerAlgorithm).size, 1, `algorithms disagree on case "${id}"`);
    }
  });
});

describe("visible/hidden split", () => {
  test("visible + hidden accounts for every case, with no overlap", () => {
    const all = getTestCases(ALGORITHMS.FULL);
    const visible = getVisibleTestCases(ALGORITHMS.FULL);
    const hidden = getHiddenTestCases(ALGORITHMS.FULL);
    assert.equal(visible.length + hidden.length, all.length);
    const visibleIds = new Set(visible.map((c) => c.id));
    for (const h of hidden) assert.equal(visibleIds.has(h.id), false);
  });

  test("at least one hidden case exists", () => {
    assert.ok(getHiddenTestCases(ALGORITHMS.FULL).length >= 1);
  });
});

describe("getTestCaseById", () => {
  test("returns the matching case", () => {
    const c = getTestCaseById(ALGORITHMS.FULL, "basic-match");
    assert.equal(c.text, "ABCDE");
  });

  test("throws for an unknown id", () => {
    assert.throws(() => getTestCaseById(ALGORITHMS.FULL, "does-not-exist"));
  });
});

describe("getExpectedOutput", () => {
  test("is derived from the real engine, not a literal", () => {
    const output = getExpectedOutput({ text: "AAAAAAAAAA", pattern: "AAA" }, ALGORITHMS.FULL);
    assert.equal(output, "0 1 2 3 4 5 6 7");
  });
});
