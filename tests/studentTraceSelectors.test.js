import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { executeSource } from "../src/pseudocode/interpreter.js";
import {
  buildPseudocodeFromSource,
  getActiveLine,
  getStudentTextCellStatus,
  getStudentPatternCellStatus,
  hasAlignment,
  hasShiftField,
  getShiftAvailability,
  getShiftWinnerLabel,
  explainStudentState,
} from "../src/ui/lib/studentTraceSelectors.js";

describe("buildPseudocodeFromSource", () => {
  test("splits source into 1-based lines matching lexer/trace line numbers", () => {
    const source = "j \u2190 0\ns \u2190 0";
    const pseudocode = buildPseudocodeFromSource(source);

    assert.equal(pseudocode.lines.length, 2);
    assert.equal(pseudocode.lines[0].line, 1);
    assert.equal(pseudocode.lines[0].text, "j \u2190 0");
    assert.equal(pseudocode.lines[1].line, 2);
  });

  test("never mutates or reformats the student's code, only trims display indent", () => {
    const source = "  j \u2190 0\n    s \u2190 0";
    const pseudocode = buildPseudocodeFromSource(source);

    assert.equal(pseudocode.lines[0].text, "j \u2190 0");
    assert.equal(pseudocode.lines[0].indent, 1);
    assert.equal(pseudocode.lines[1].indent, 2);
  });

  test("handles empty source without throwing", () => {
    const pseudocode = buildPseudocodeFromSource("");
    assert.equal(pseudocode.lines.length, 1);
  });
});

describe("getActiveLine", () => {
  test("uses the current state's line ordinarily", () => {
    const line = getActiveLine({ line: 7 }, { status: "completed" }, false);
    assert.equal(line, 7);
  });

  test("returns null when there is no current state and no error", () => {
    assert.equal(getActiveLine(null, { status: "completed" }, false), null);
  });

  test("prefers the error's line once stopped at the end on a runtime error", () => {
    const line = getActiveLine(
      { line: 3 },
      { status: "runtime-error", error: { line: 9 } },
      true
    );
    assert.equal(line, 9);
  });

  test("does not use the error's line while stepping through earlier steps", () => {
    const line = getActiveLine(
      { line: 3 },
      { status: "runtime-error", error: { line: 9 } },
      false
    );
    assert.equal(line, 3);
  });

  test("does not use the error's line for a normally completed run", () => {
    const line = getActiveLine(
      { line: 3 },
      { status: "completed", error: null },
      true
    );
    assert.equal(line, 3);
  });
});

describe("getStudentTextCellStatus / getStudentPatternCellStatus", () => {
  test("idle when there is no state", () => {
    assert.equal(getStudentTextCellStatus(null, 0), "idle");
    assert.equal(getStudentPatternCellStatus(null, 0), "idle");
  });

  test("idle when there is no currentComparison on the state", () => {
    const state = { line: 1 };
    assert.equal(getStudentTextCellStatus(state, 0), "idle");
    assert.equal(getStudentPatternCellStatus(state, 0), "idle");
  });

  test("reports match at the compared indices, idle elsewhere", () => {
    const state = {
      currentComparison: { textIndex: 2, patternIndex: 0, textChar: "A", patternChar: "A", result: "match" },
    };
    assert.equal(getStudentTextCellStatus(state, 2), "match");
    assert.equal(getStudentTextCellStatus(state, 3), "idle");
    assert.equal(getStudentPatternCellStatus(state, 0), "match");
    assert.equal(getStudentPatternCellStatus(state, 1), "idle");
  });

  test("reports mismatch at the compared indices", () => {
    const state = {
      currentComparison: { textIndex: 5, patternIndex: 1, textChar: "X", patternChar: "B", result: "mismatch" },
    };
    assert.equal(getStudentTextCellStatus(state, 5), "mismatch");
    assert.equal(getStudentPatternCellStatus(state, 1), "mismatch");
  });

  test("derives real comparison highlighting from an actual executed trace", () => {
    const result = executeSource(
      "outcome \u2190 text[0] = pattern[0]",
      { text: "AXY", pattern: "A" }
    );
    const withComparison = result.trace.find((s) => s.currentComparison);
    assert.ok(withComparison);
    assert.equal(getStudentTextCellStatus(withComparison, 0), "match");
    assert.equal(getStudentPatternCellStatus(withComparison, 0), "match");
  });
});

describe("hasAlignment", () => {
  test("true only for a real number, including 0", () => {
    assert.equal(hasAlignment({ alignment: 0 }), true);
    assert.equal(hasAlignment({ alignment: 4 }), true);
  });

  test("false when alignment is absent", () => {
    assert.equal(hasAlignment({}), false);
    assert.equal(hasAlignment(null), false);
    assert.equal(hasAlignment({ alignment: undefined }), false);
    assert.equal(hasAlignment({ alignment: null }), false);
  });
});

describe("hasShiftField / getShiftAvailability", () => {
  test("distinguishes a real 0 shift from an absent one", () => {
    assert.equal(hasShiftField({ badCharacterShift: 0 }, "badCharacterShift"), true);
    assert.equal(hasShiftField({}, "badCharacterShift"), false);
    assert.equal(hasShiftField({ badCharacterShift: null }, "badCharacterShift"), false);
    assert.equal(hasShiftField({ badCharacterShift: undefined }, "badCharacterShift"), false);
  });

  test("reports availability per field and combined", () => {
    assert.deepEqual(getShiftAvailability({ badCharacterShift: 3 }), {
      hasBad: true,
      hasGood: false,
      hasChosen: false,
      hasBoth: false,
    });

    assert.deepEqual(getShiftAvailability({ badCharacterShift: 3, goodSuffixShift: 5, chosenShift: 5 }), {
      hasBad: true,
      hasGood: true,
      hasChosen: true,
      hasBoth: true,
    });

    assert.deepEqual(getShiftAvailability(null), {
      hasBad: false,
      hasGood: false,
      hasChosen: false,
      hasBoth: false,
    });
  });
});

describe("getShiftWinnerLabel", () => {
  test("picks the larger value's label", () => {
    assert.equal(getShiftWinnerLabel(5, 2), "bad-character");
    assert.equal(getShiftWinnerLabel(2, 5), "good-suffix");
  });

  test("reports equal shifts", () => {
    assert.equal(getShiftWinnerLabel(3, 3), "equal");
  });
});

describe("explainStudentState", () => {
  test("prompts to run when there is no state yet", () => {
    assert.match(explainStudentState(null), /run the pseudocode/i);
  });

  test("describes a character comparison using real trace fields", () => {
    const state = {
      line: 4,
      currentComparison: { textIndex: 6, patternIndex: 2, textChar: "X", patternChar: "A", result: "mismatch" },
    };
    const text = explainStudentState(state);
    assert.match(text, /Line 4/);
    assert.match(text, /TEXT\[6\]/);
    assert.match(text, /PATTERN\[2\]/);
    assert.match(text, /mismatch/);
  });

  test("describes an assignment using the changed variable's real value", () => {
    const state = {
      line: 12,
      nodeType: "Assignment",
      changedVariables: ["shift"],
      variables: { shift: 3 },
    };
    assert.equal(explainStudentState(state), "Line 12 assigned shift = 3.");
  });

  test("describes a WHILE condition outcome", () => {
    const state = { line: 5, nodeType: "While", conditionMet: true };
    assert.match(explainStudentState(state), /WHILE condition evaluated to TRUE/);
  });

  test("describes an IF branch", () => {
    const state = { line: 8, nodeType: "If", branch: "then" };
    assert.match(explainStudentState(state), /THEN branch/);
  });

  test("describes a RETURN", () => {
    const state = { line: 20, nodeType: "Return", returnValue: 7 };
    assert.equal(explainStudentState(state), "Line 20 returned 7.");
  });

  test("falls back to a generic 'executed' sentence for other node types", () => {
    const state = { line: 1, nodeType: "Function" };
    assert.match(explainStudentState(state), /executed/);
  });
});
