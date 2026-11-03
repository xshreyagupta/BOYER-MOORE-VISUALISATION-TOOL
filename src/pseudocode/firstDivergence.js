// PHASE 13 -- First-divergence detector.
//
// Pure, framework-agnostic comparison between:
//
//   - the STUDENT's own pseudocode execution trace
//     (src/pseudocode/executionTrace.js / src/pseudocode/interpreter.js)
//
//   - the trusted REFERENCE algorithm's execution trace
//     (src/engine/executionTrace.js, produced by src/engine/index.js's
//     run(algorithm, text, pattern))
//
// This module never re-implements Boyer-Moore, never recomputes a shift,
// and never runs anything -- it only reads two already-computed traces and
// reports the first point where the student's observable ALGORITHMIC
// BEHAVIOR disagrees with the reference. "Behavior" here means: which text
// index and pattern index got compared, what that comparison's result was,
// what alignment it happened at, and -- once a mismatch or a full match is
// decided -- what shift/match value came out of it. It deliberately does
// NOT compare step-for-step, variable names, or raw source text, so a
// correct student program using different bookkeeping (different temp
// variable names, an extra harmless assignment, a different number of
// internal steps) is never flagged.
//
// COMPARISON STRATEGY
// --------------------
// Both traces are first reduced to an ordered list of "checkpoints" --
// only the moments that actually carry comparable algorithmic meaning:
//
//   { kind: "comparison", alignment, textIndex, patternIndex, result, ... }
//   { kind: "episode-end", fields: { badCharacterShift?, goodSuffixShift?,
//                                     chosenShift?, match? }, ... }
//
// A "comparison" checkpoint is one TEXT[i] vs PATTERN[j] check. An
// "episode-end" checkpoint is the outcome of handling a mismatch or a full
// match at one alignment (whichever of Bad-Character-shift / Good-Suffix-
// shift / chosen-shift / match-index the student's code actually produced
// for it -- see buildStudentCheckpoints below for how "actually produced"
// is decided). The two checkpoint lists are then walked in lockstep and
// compared pairwise; the first pair that disagrees is the first divergence.
//
// Because both lists only contain *meaningful* moments (never raw
// interpreter steps, loop-internal bookkeeping states, or steps for
// variables the detector doesn't recognize), differing trace lengths and
// differing internal step counts never by themselves produce a false
// divergence -- see buildStudentCheckpoints's window-based episode-end
// construction for how that's kept true even when a student's mismatch
// handling doesn't use a recognized variable name at all.

import {
  BAD_SHIFT_NAMES,
  GOOD_SHIFT_NAMES,
  CHOSEN_SHIFT_NAMES,
  MATCH_NAMES,
} from "./executionTrace.js";

/**
 * Human-readable labels shared between the message text this module
 * builds and any UI that wants to show the same category name (e.g. the
 * Phase 13 "FIRST ERROR" panel) without inventing a second copy.
 */
export const CATEGORY_LABELS = Object.freeze({
  alignment: "Alignment (s)",
  "pattern-movement": "Pattern index (j)",
  comparison: "Text index (i)",
  mismatch: "Comparison result",
  "bad-character-shift": "Bad Character Shift",
  "good-suffix-shift": "Good Suffix Shift",
  "chosen-shift": "Chosen Shift",
  match: "Match position",
  "control-flow": "Execution",
});

function present(value) {
  return value !== null && value !== undefined;
}

/* ========================================================================
 * REFERENCE CHECKPOINTS
 * ====================================================================== */

/**
 * Reduces a reference execution-trace (src/engine/executionTrace.js
 * states) into the ordered checkpoint list described above.
 *
 * @param {Array} states
 * @returns {Array}
 */
function buildReferenceCheckpoints(states) {
  const checkpoints = [];

  for (const state of states) {
    if (state.phase === "compare" && present(state.comparisonResult)) {
      checkpoints.push({
        kind: "comparison",
        alignment: state.alignment,
        textIndex: state.i,
        patternIndex: state.j,
        result: state.comparisonResult,
        step: state.step,
        line: state.pseudocodeLine,
      });
      continue;
    }

    if (state.phase === "mismatch") {
      checkpoints.push({
        kind: "episode-end",
        step: state.step,
        line: state.pseudocodeLine,
        fields: {
          badCharacterShift: present(state.badCharacterShift)
            ? { value: state.badCharacterShift, step: state.step, line: state.pseudocodeLine }
            : undefined,
          goodSuffixShift: present(state.goodSuffixShift)
            ? { value: state.goodSuffixShift, step: state.step, line: state.pseudocodeLine }
            : undefined,
          chosenShift: present(state.chosenShift)
            ? { value: state.chosenShift, step: state.step, line: state.pseudocodeLine }
            : undefined,
        },
      });
      continue;
    }

    if (state.phase === "found") {
      checkpoints.push({
        kind: "episode-end",
        step: state.step,
        line: state.pseudocodeLine,
        fields: {
          chosenShift: present(state.chosenShift)
            ? { value: state.chosenShift, step: state.step, line: state.pseudocodeLine }
            : undefined,
          match: present(state.matchIndex)
            ? { value: state.matchIndex, step: state.step, line: state.pseudocodeLine }
            : undefined,
        },
      });
    }

    // "start"/"done" states carry no per-alignment behavior to compare.
  }

  return checkpoints;
}

/* ========================================================================
 * STUDENT CHECKPOINTS
 * ====================================================================== */

const EPISODE_FIELD_ALIASES = [
  ["badCharacterShift", BAD_SHIFT_NAMES, "badCharacterShift"],
  ["goodSuffixShift", GOOD_SHIFT_NAMES, "goodSuffixShift"],
  ["chosenShift", CHOSEN_SHIFT_NAMES, "chosenShift"],
  ["match", MATCH_NAMES, "match"],
];

/**
 * Reduces a student execution-trace (src/pseudocode/executionTrace.js
 * states, as produced by the Phase 11 interpreter) into the same ordered
 * checkpoint shape as buildReferenceCheckpoints.
 *
 * "comparison" checkpoints come from `state.currentComparison`, which the
 * interpreter only ever populates from a real TEXT[...] = PATTERN[...]
 * (or /=) comparison the student's own code evaluated (see
 * expressionEvaluator.js) -- never invented here. Only the ones on the
 * PRIMARY comparison line are used, though (see findPrimaryComparisonLine
 * below): a student's mismatch-handling code legitimately does its OWN
 * TEXT-vs-PATTERN comparisons too (e.g. re-deriving a last-occurrence
 * position with a small search loop, the way
 * src/practice/starterTemplates.js's examples do), and those aren't the
 * "compare pattern right-to-left at this alignment" moments the reference
 * trace records -- they're bookkeeping that only runs *after* a mismatch
 * has already been decided, on a different source line. The main matching
 * loop, by contrast, always runs -- and so always produces its first
 * comparison -- before any mismatch has been found for the very first
 * time, in every algorithm structure this language can express; that
 * ordering, not how often either loop happens to fire, is what
 * findPrimaryComparisonLine relies on, so it works regardless of how
 * comparison-heavy a student's own mismatch-handling code is.
 *
 * "episode-end" checkpoints are built from a sliding window: everything
 * between one comparison checkpoint and the next is scanned for
 * assignments (`state.changedVariables`) to any of the recognized
 * Bad-Character-shift / Good-Suffix-shift / chosen-shift / match variable
 * names (the same alias lists src/pseudocode/executionTrace.js's own
 * normalizeBoyerMooreState uses). The LAST such assignment for a given
 * field within the window wins, so re-assigning a variable while computing
 * it doesn't produce multiple conflicting checkpoints. If a window
 * contains no recognized assignment at all (e.g. the student is still
 * mid-comparison-loop, or used entirely different variable names), no
 * episode-end checkpoint is emitted for it -- an absent checkpoint is
 * never treated as a divergence, it just means there is nothing there to
 * compare (see findFirstDivergence's kind-mismatch resync step).
 *
 * @param {Array} states
 * @returns {Array}
 */
/**
 * The source line where the student's PRIMARY character-comparison loop
 * lives -- the line of the very FIRST `currentComparison`-bearing state
 * in the whole trace. That first comparison can only belong to the main
 * matching loop: any mismatch-handling / shift-computation code (which is
 * where an auxiliary TEXT-vs-PATTERN search loop would live) only runs
 * *after* a mismatch has already been found for the first time, so it can
 * never produce the trace's first comparison. Deterministic by
 * construction -- the same trace always has the same first comparison.
 *
 * @param {Array} states
 * @returns {number|null}
 */
function findPrimaryComparisonLine(states) {
  for (const state of states) {
    if (state.currentComparison && present(state.line)) {
      return state.line;
    }
  }
  return null;
}

function buildStudentCheckpoints(states) {
  const primaryLine = findPrimaryComparisonLine(states);
  const checkpoints = [];

  let windowFields = {};
  let windowStep = null;
  let windowLine = null;

  function flushWindow() {
    if (Object.keys(windowFields).length > 0) {
      checkpoints.push({
        kind: "episode-end",
        step: windowStep,
        line: windowLine,
        fields: windowFields,
      });
    }
    windowFields = {};
    windowStep = null;
    windowLine = null;
  }

  for (const state of states) {
    if (Array.isArray(state.changedVariables)) {
      for (const changedName of state.changedVariables) {
        for (const [fieldName, aliases, stateField] of EPISODE_FIELD_ALIASES) {
          if (aliases.includes(changedName) && present(state[stateField])) {
            windowFields[fieldName] = {
              value: state[stateField],
              step: state.step,
              line: state.line,
            };
          }
        }
      }
    }

    if (Object.keys(windowFields).length > 0) {
      windowStep = state.step;
      windowLine = state.line ?? windowLine;
    }

    if (state.currentComparison && state.line === primaryLine) {
      // A new comparison begins a new episode -- whatever the window
      // accumulated since the previous comparison belongs to the episode
      // that just ended.
      flushWindow();

      checkpoints.push({
        kind: "comparison",
        alignment: state.alignment,
        textIndex: state.currentComparison.textIndex,
        patternIndex: state.currentComparison.patternIndex,
        result: state.currentComparison.result,
        step: state.step,
        line: state.line,
      });
    }
  }

  // Whatever the trace's final episode accumulated after its last
  // comparison (mismatch/match handling with no further comparison to
  // follow -- either because the algorithm finished, or execution
  // stopped).
  flushWindow();

  return checkpoints;
}

/* ========================================================================
 * PAIRWISE COMPARISON
 * ====================================================================== */

function comparisonDivergence(category, ref, stu, studentValue, expectedValue, describe) {
  return {
    diverged: true,
    referenceStep: ref.step,
    studentStep: stu.step,
    line: stu.line ?? null,
    category,
    studentValue,
    expectedValue,
    message: describe(expectedValue, studentValue, true),
    studentMessage: describe(expectedValue, studentValue, false),
  };
}

/**
 * Compares one pair of "comparison" checkpoints. Only the first field
 * that actually differs is reported (alignment, then which pattern index,
 * then which text index, then the match/mismatch result), since an
 * earlier field being wrong is normally the root cause of any later ones
 * also looking wrong.
 */
function compareComparisonCheckpoints(ref, stu) {
  if (present(ref.alignment) && present(stu.alignment) && ref.alignment !== stu.alignment) {
    return comparisonDivergence(
      "alignment",
      ref,
      stu,
      stu.alignment,
      ref.alignment,
      (expected, actual, forReference) =>
        forReference
          ? `Expected this comparison to happen at alignment s = ${expected}, but your pseudocode compared at alignment s = ${actual}.`
          : `Your alignment was s = ${actual} at this comparison, but it should have been s = ${expected}.`
    );
  }

  if (present(ref.patternIndex) && present(stu.patternIndex) && ref.patternIndex !== stu.patternIndex) {
    return comparisonDivergence(
      "pattern-movement",
      ref,
      stu,
      stu.patternIndex,
      ref.patternIndex,
      (expected, actual, forReference) =>
        forReference
          ? `Expected to compare PATTERN[${expected}], but your pseudocode compared PATTERN[${actual}].`
          : `This step compared PATTERN[${actual}], but the reference algorithm would have compared PATTERN[${expected}] here.`
    );
  }

  if (present(ref.textIndex) && present(stu.textIndex) && ref.textIndex !== stu.textIndex) {
    return comparisonDivergence(
      "comparison",
      ref,
      stu,
      stu.textIndex,
      ref.textIndex,
      (expected, actual, forReference) =>
        forReference
          ? `Expected to compare TEXT[${expected}], but your pseudocode compared TEXT[${actual}].`
          : `This step compared TEXT[${actual}], but the reference algorithm would have compared TEXT[${expected}] here.`
    );
  }

  if (present(ref.result) && present(stu.result) && ref.result !== stu.result) {
    return comparisonDivergence(
      "mismatch",
      ref,
      stu,
      stu.result,
      ref.result,
      (expected, actual, forReference) =>
        forReference
          ? `Expected this comparison to be a ${expected}, but your pseudocode found a ${actual}.`
          : `Your pseudocode treated this comparison as a ${actual}, but it should have been a ${expected}.`
    );
  }

  return null;
}

const EPISODE_FIELD_ORDER = ["badCharacterShift", "goodSuffixShift", "chosenShift", "match"];

const EPISODE_CATEGORY = Object.freeze({
  badCharacterShift: "bad-character-shift",
  goodSuffixShift: "good-suffix-shift",
  chosenShift: "chosen-shift",
  match: "match",
});

/**
 * Compares one pair of "episode-end" checkpoints. Only fields present on
 * BOTH sides are ever compared -- a field either side didn't produce stays
 * unknown, never assumed to be 0/false/wrong (see module doc).
 */
function compareEpisodeEndCheckpoints(ref, stu) {
  for (const fieldName of EPISODE_FIELD_ORDER) {
    const refField = ref.fields?.[fieldName];
    const stuField = stu.fields?.[fieldName];

    if (!refField || !stuField) continue;
    if (refField.value === stuField.value) continue;

    const category = EPISODE_CATEGORY[fieldName];
    const label = CATEGORY_LABELS[category];

    return {
      diverged: true,
      referenceStep: refField.step,
      studentStep: stuField.step,
      line: stuField.line ?? null,
      category,
      studentValue: stuField.value,
      expectedValue: refField.value,
      message: `Expected ${label} = ${refField.value}, but your pseudocode produced ${label} = ${stuField.value}.`,
      studentMessage: `Your ${label} was ${stuField.value}, but it should have been ${refField.value}.`,
    };
  }

  return null;
}

function controlFlowDivergence({ step, line }, message, studentMessage) {
  return {
    diverged: true,
    studentStep: step ?? undefined,
    line: line ?? null,
    category: "control-flow",
    message,
    studentMessage: studentMessage ?? message,
  };
}

/* ========================================================================
 * PUBLIC ENTRY POINT
 * ====================================================================== */

const NO_DIVERGENCE = Object.freeze({
  diverged: false,
  message: "No behavioral divergence detected.",
});

/**
 * Finds the first behavioral divergence between a student's pseudocode
 * execution result (as returned by executeSource()/execute() -- see
 * src/pseudocode/interpreter.js) and the trusted reference algorithm's
 * run result for the SAME algorithm mode, text, and pattern (as returned
 * by run() -- see src/engine/index.js).
 *
 * Deterministic and side-effect free: the same two results always produce
 * the same return value, and neither trace is ever mutated.
 *
 * @param {object} studentResult    result of executeSource()/execute()
 * @param {object} referenceResult  result of engine run(algorithm, text, pattern)
 * @returns {{
 *   diverged: boolean,
 *   studentStep?: number,
 *   referenceStep?: number,
 *   line?: number|null,
 *   category?: string,
 *   studentValue?: *,
 *   expectedValue?: *,
 *   message: string,
 *   studentMessage?: string,
 *   haltedByRuntimeError?: boolean,
 * }}
 */
export function findFirstDivergence(studentResult, referenceResult) {
  if (!studentResult || !referenceResult) return NO_DIVERGENCE;

  // Invalid pseudocode never reaches comparison -- Phase 10 validation (and
  // WritePseudocode's own guard) already keeps it out of execution, but
  // this function stays defensive rather than ever guessing at a trace
  // that doesn't exist.
  if (studentResult.status === "invalid") return NO_DIVERGENCE;

  const referenceStates = Array.isArray(referenceResult.states) ? referenceResult.states : [];
  const studentStates = Array.isArray(studentResult.trace) ? studentResult.trace : [];

  if (referenceResult.error || referenceStates.length === 0) return NO_DIVERGENCE;

  // NOTE: studentStates.length === 0 (empty/whitespace/comment-only
  // pseudocode, or a runtime error on the very first statement) is
  // deliberately NOT special-cased here. buildStudentCheckpoints([]) just
  // returns an empty checkpoint list, and the general comparison loop
  // below already handles an empty list correctly: the while loop simply
  // never executes, refIdx stays 0, and the post-loop "reference still had
  // meaningful behavior the student trace never reached" branch fires --
  // reporting either haltedByRuntimeError (if execution actually failed)
  // or a real control-flow divergence (if the student's program just
  // finished, or never did anything, while the reference kept going). A
  // separate early return here previously short-circuited straight to
  // NO_DIVERGENCE for any *non*-failed empty trace -- which meant empty,
  // whitespace-only, or otherwise no-op "pseudocode" was reported as
  // having no error at all. Letting it fall through fixes that.

  const refCheckpoints = buildReferenceCheckpoints(referenceStates);
  const stuCheckpoints = buildStudentCheckpoints(studentStates);

  let refIdx = 0;
  let stuIdx = 0;

  while (refIdx < refCheckpoints.length && stuIdx < stuCheckpoints.length) {
    const ref = refCheckpoints[refIdx];
    const stu = stuCheckpoints[stuIdx];

    if (ref.kind !== stu.kind) {
      // A checkpoint kind mismatch is only ever produced by an
      // episode-end checkpoint that has nothing recognizable to compare
      // on one side -- see buildStudentCheckpoints. That's "unknown",
      // never a divergence: skip the side with nothing comparable and
      // retry, so the two comparison streams stay meaningfully aligned.
      if (ref.kind === "episode-end") {
        refIdx++;
        continue;
      }
      if (stu.kind === "episode-end") {
        stuIdx++;
        continue;
      }
    }

    if (ref.kind === "comparison" && stu.kind === "comparison") {
      const divergence = compareComparisonCheckpoints(ref, stu);
      if (divergence) return divergence;
    } else if (ref.kind === "episode-end" && stu.kind === "episode-end") {
      const divergence = compareEpisodeEndCheckpoints(ref, stu);
      if (divergence) return divergence;
    }

    refIdx++;
    stuIdx++;
  }

  // The reference algorithm still had meaningful behavior the student
  // trace never reached.
  if (refIdx < refCheckpoints.length) {
    const failed = studentResult.status === "runtime-error" || studentResult.status === "step-limit";

    if (failed) {
      // Execution stopped for a real, already-surfaced reason -- never
      // invent a divergence past the point execution actually stopped.
      return {
        diverged: false,
        haltedByRuntimeError: true,
        message: "No behavioral divergence detected before execution stopped.",
      };
    }

    const lastState = studentStates[studentStates.length - 1];
    return controlFlowDivergence(
      { step: lastState?.step, line: lastState?.line },
      "The reference algorithm kept running after your pseudocode stopped.",
      "Your pseudocode finished before the reference algorithm would have. Check your loop's stopping condition."
    );
  }

  // The student trace still had meaningful behavior after the reference
  // algorithm had already concluded.
  if (stuIdx < stuCheckpoints.length) {
    const next = stuCheckpoints[stuIdx];
    return controlFlowDivergence(
      next,
      "Your pseudocode kept running after the reference algorithm would have already finished.",
      "Your pseudocode kept running after the reference algorithm would have already finished. Check your loop's stopping condition."
    );
  }

  return NO_DIVERGENCE;
}