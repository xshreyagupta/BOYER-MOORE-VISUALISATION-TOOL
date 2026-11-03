import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  getChangedVariableKeys,
  formatVariableValue,
  getVariableEntries,
  getPseudocodeFor,
  getLineNote,
} from "../src/ui/lib/pseudocodeSelectors.js";

describe("getChangedVariableKeys", () => {
  test("returns every key when there is no previous snapshot", () => {
    assert.deepEqual(getChangedVariableKeys(null, { s: 0, j: 3 }), ["s", "j"]);
  });

  test("returns every key when previous snapshot is undefined", () => {
    assert.deepEqual(getChangedVariableKeys(undefined, { s: 0 }), ["s"]);
  });

  test("returns only the keys whose value differs", () => {
    const prev = { s: 0, j: 3, textChar: "A" };
    const curr = { s: 0, j: 2, textChar: "A" };
    assert.deepEqual(getChangedVariableKeys(prev, curr), ["j"]);
  });

  test("a key new in current (absent from previous) counts as changed", () => {
    const prev = { s: 0 };
    const curr = { s: 0, j: 3 };
    assert.deepEqual(getChangedVariableKeys(prev, curr), ["j"]);
  });

  test("returns empty array when nothing changed", () => {
    const snapshot = { s: 4, j: 1 };
    assert.deepEqual(getChangedVariableKeys(snapshot, { ...snapshot }), []);
  });

  test("handles a missing/undefined current variables object", () => {
    assert.deepEqual(getChangedVariableKeys({ s: 0 }, undefined), []);
  });

  test("preserves current's own key order", () => {
    const curr = { z: 1, a: 2 };
    assert.deepEqual(getChangedVariableKeys(null, curr), ["z", "a"]);
  });
});

describe("formatVariableValue", () => {
  test("formats null and undefined as the string 'null'", () => {
    assert.equal(formatVariableValue(null), "null");
    assert.equal(formatVariableValue(undefined), "null");
  });

  test("formats arrays as bracketed, comma-joined lists", () => {
    assert.equal(formatVariableValue([1, 2, 3]), "[1, 2, 3]");
    assert.equal(formatVariableValue([]), "[]");
  });

  test("formats strings in single quotes", () => {
    assert.equal(formatVariableValue("X"), "'X'");
  });

  test("formats numbers and other primitives via String()", () => {
    assert.equal(formatVariableValue(42), "42");
    assert.equal(formatVariableValue(0), "0");
    assert.equal(formatVariableValue(true), "true");
  });
});

describe("getVariableEntries", () => {
  test("filters out undefined-valued entries", () => {
    assert.deepEqual(getVariableEntries({ a: 1, b: undefined, c: null }), [
      ["a", 1],
      ["c", null],
    ]);
  });

  test("returns [] for null/undefined input", () => {
    assert.deepEqual(getVariableEntries(null), []);
    assert.deepEqual(getVariableEntries(undefined), []);
  });
});

describe("getPseudocodeFor", () => {
  test("kind 'search' resolves a search algorithm block", () => {
    const block = getPseudocodeFor("search", "full");
    assert.ok(block);
    assert.equal(block.title, "Full Boyer-Moore");
  });

  test("kind 'preprocessing' resolves a preprocessing algorithm block", () => {
    const block = getPseudocodeFor("preprocessing", "bad-character");
    assert.ok(block);
    assert.match(block.title, /Preprocessing/);
  });

  test("unknown algorithm returns null for either kind", () => {
    assert.equal(getPseudocodeFor("search", "nonexistent"), null);
    assert.equal(getPseudocodeFor("preprocessing", "nonexistent"), null);
  });
});

describe("getLineNote", () => {
  test("returns the note text for a valid line", () => {
    const block = getPseudocodeFor("search", "full");
    const note = getLineNote(block, 14);
    assert.equal(typeof note, "string");
    assert.ok(note.length > 0);
  });

  test("returns null when pseudocode block is null", () => {
    assert.equal(getLineNote(null, 1), null);
  });

  test("returns null when lineNumber is null or undefined", () => {
    const block = getPseudocodeFor("search", "full");
    assert.equal(getLineNote(block, null), null);
    assert.equal(getLineNote(block, undefined), null);
  });

  test("returns null for a line number with no note", () => {
    const block = getPseudocodeFor("search", "full");
    assert.equal(getLineNote(block, 9999), null);
  });
});
