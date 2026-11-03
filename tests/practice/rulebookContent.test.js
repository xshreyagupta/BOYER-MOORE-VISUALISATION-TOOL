import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  RULEBOOK_SECTIONS,
  CHEAT_SHEET,
  LEVELS,
  LEVEL_LABELS,
  getRulebookSection,
  getSectionsByLevel,
} from "../../src/practice/rulebookContent.js";
import { ALGORITHMS } from "../../src/engine/index.js";

const REQUIRED_SECTION_IDS = [
  "variables",
  "assignment",
  "arithmetic",
  "comparisons",
  "logical-operators",
  "if",
  "if-else",
  "while",
  "for",
  "reverse-for",
  "functions",
  "return",
  "arrays",
  "max-min",
  "comments",
  "indentation",
  "block-structure",
  "bm-direction",
  "bm-alignment",
  "bm-mismatch",
  "bm-bad-character",
  "bm-good-suffix",
  "bm-full",
];

describe("RULEBOOK_SECTIONS", () => {
  test("every required section id is present, with no duplicates", () => {
    const ids = RULEBOOK_SECTIONS.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length, "duplicate section ids found");
    for (const required of REQUIRED_SECTION_IDS) {
      assert.ok(ids.includes(required), `missing required section: "${required}"`);
    }
  });

  test("every section has a title, a level, and a non-empty explanation", () => {
    for (const section of RULEBOOK_SECTIONS) {
      assert.equal(typeof section.title, "string");
      assert.ok(section.title.length > 0, `section "${section.id}" has no title`);
      assert.ok(Object.values(LEVELS).includes(section.level), `section "${section.id}" has an invalid level`);
      assert.equal(typeof section.explanation, "string");
      assert.ok(section.explanation.length > 0, `section "${section.id}" has no explanation`);
    }
  });

  test("every section has an examples array (possibly empty)", () => {
    for (const section of RULEBOOK_SECTIONS) {
      assert.ok(Array.isArray(section.examples), `section "${section.id}" is missing examples[]`);
      for (const ex of section.examples) {
        assert.equal(typeof ex.code, "string");
        assert.ok(ex.code.length > 0);
      }
    }
  });

  test("every level in LEVELS has at least one section", () => {
    for (const level of Object.values(LEVELS)) {
      assert.ok(getSectionsByLevel(level).length > 0, `no sections for level "${level}"`);
    }
  });

  test("LEVEL_LABELS covers every level with a non-empty label", () => {
    for (const level of Object.values(LEVELS)) {
      assert.equal(typeof LEVEL_LABELS[level], "string");
      assert.ok(LEVEL_LABELS[level].length > 0);
    }
  });

  test("sections that declare a valid/invalid pair have both code and a note", () => {
    for (const section of RULEBOOK_SECTIONS) {
      for (const key of ["valid", "invalid"]) {
        if (section[key]) {
          assert.equal(typeof section[key].code, "string");
          assert.ok(section[key].code.length > 0, `section "${section.id}".${key} has empty code`);
          assert.equal(typeof section[key].note, "string");
          assert.ok(section[key].note.length > 0, `section "${section.id}".${key} has empty note`);
        }
      }
    }
  });

  test("sections that declare a predict interaction have code, question, and answer", () => {
    for (const section of RULEBOOK_SECTIONS) {
      if (section.predict) {
        assert.equal(typeof section.predict.code, "string");
        assert.ok(section.predict.code.length > 0);
        assert.equal(typeof section.predict.question, "string");
        assert.ok(section.predict.question.length > 0);
        assert.equal(typeof section.predict.answer, "string");
        assert.ok(section.predict.answer.length > 0);
      }
    }
  });

  test("sections that declare a practiceLink have a label, and algorithm is null or a real algorithm id", () => {
    const validAlgorithms = new Set(Object.values(ALGORITHMS));
    let sawAtLeastOne = false;
    for (const section of RULEBOOK_SECTIONS) {
      if (section.practiceLink) {
        sawAtLeastOne = true;
        assert.equal(typeof section.practiceLink.label, "string");
        assert.ok(section.practiceLink.label.length > 0);
        const { algorithm } = section.practiceLink;
        assert.ok(algorithm === null || validAlgorithms.has(algorithm), `section "${section.id}" has an invalid practiceLink.algorithm`);
      }
    }
    assert.ok(sawAtLeastOne, "expected at least one section with a practiceLink");
  });

  test("the Reverse FOR and Full Boyer-Moore sections are marked as highlighted concepts", () => {
    assert.equal(getRulebookSection("reverse-for").highlight, true);
    assert.equal(getRulebookSection("bm-full").highlight, true);
  });

  test("progressive order: beginner sections precede control-flow, which precede structure, which precede boyer-moore", () => {
    const order = [LEVELS.BEGINNER, LEVELS.CONTROL_FLOW, LEVELS.STRUCTURE, LEVELS.BOYER_MOORE];
    const seenLevels = RULEBOOK_SECTIONS.map((s) => order.indexOf(s.level));
    const sorted = [...seenLevels].sort((a, b) => a - b);
    assert.deepEqual(seenLevels, sorted, "sections are not in progressive-learning order");
  });
});

describe("getRulebookSection", () => {
  test("returns the matching section", () => {
    assert.equal(getRulebookSection("for").title, "FOR");
  });

  test("returns null for an unknown id", () => {
    assert.equal(getRulebookSection("does-not-exist"), null);
  });
});

describe("CHEAT_SHEET", () => {
  test("every entry has a non-empty label and code", () => {
    assert.ok(CHEAT_SHEET.length > 0);
    for (const entry of CHEAT_SHEET) {
      assert.equal(typeof entry.label, "string");
      assert.ok(entry.label.length > 0);
      assert.equal(typeof entry.code, "string");
      assert.ok(entry.code.length > 0);
    }
  });

  test("labels are unique", () => {
    const labels = CHEAT_SHEET.map((e) => e.label);
    assert.equal(new Set(labels).size, labels.length);
  });

  test("covers the core control-flow constructs", () => {
    const labels = new Set(CHEAT_SHEET.map((e) => e.label));
    for (const required of ["IF", "WHILE", "FOR", "Reverse FOR", "FUNCTION", "RETURN"]) {
      assert.ok(labels.has(required), `cheat sheet missing "${required}"`);
    }
  });
});
