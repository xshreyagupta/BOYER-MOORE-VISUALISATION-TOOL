import { useEffect, useMemo, useState } from "react";
 
import CodeEditor from "./CodeEditor.jsx";
import ExecutionResultPanel from "./ExecutionResultPanel.jsx";
import StudentExecutionLab from "./StudentExecutionLab.jsx";
import FirstErrorPanel from "./FirstErrorPanel.jsx";
import { ALGORITHM_LABELS } from "./PracticeSetup.jsx";
 
import { validate } from "../../../pseudocode/validate.js";
import { executeSource } from "../../../pseudocode/interpreter.js";
import { findFirstDivergence } from "../../../pseudocode/firstDivergence.js";
import { getStarterTemplate } from "../../../practice/starterTemplates.js";
import { run as runReference } from "../../../engine/index.js";
 
import "./WritePseudocode.css";
 
// PHASE 8 -- "Write Pseudocode" foundation.
//
// PHASE 9 -- Rulebook integration.
//
// PHASE 10 -- Real pseudocode validation:
//
//   source
//      ↓
//   validate()
//      ↓
//   diagnostics
//
// PHASE 11 -- Real pseudocode execution:
//
//   validated source
//      ↓
//   executeSource()
//      ↓
//   execution result / trace
//
// PHASE 12 -- Student execution visualization:
//
//   execution trace
//      ↓
//   StudentExecutionLab
//      ↓
//   step-by-step visualization
//
// PHASE 13 -- First error detection:
//
//   studentResult (from executeSource above)
//      ↓
//   referenceResult = engine run(algorithm, text, pattern)
//      ↓
//   findFirstDivergence(studentResult, referenceResult)
//      ↓
//   firstError
//      ↓
//   FirstErrorPanel  (+ "GO TO ERROR" jumps StudentExecutionLab's own
//                      playback to firstError.studentStep)
//
// The reference algorithm is never run except to diff against -- it is
// never shown to the student as its own visualization, and this file
// never re-implements Boyer-Moore itself.
//
// IMPORTANT:
// - Invalid pseudocode must never execute.
// - A runtime result must be distinguished from validation failure.
// - A stale execution result must never remain visible after the student
//   changes the code/text/pattern.
// - StudentExecutionLab must only receive an actual execution trace.
// - The reference Boyer-Moore implementation is never called here.
 
export default function WritePseudocode({
  algorithm,
  code,
  onChange,
  onReset,
  text,
  pattern,
  onTextChange,
  onPatternChange,
}) {
  const [result, setResult] = useState(null);
  const [runVersion, setRunVersion] = useState(0);
  // PHASE 13 -- the first-divergence result for the current `result`, and
  // a "go to error" request StudentExecutionLab's playback consumes.
  const [divergence, setDivergence] = useState(null);
  const [goToStep, setGoToStep] = useState(null);
 
  // ------------------------------------------------------------
  // Algorithm switch
  // ------------------------------------------------------------
  //
  // A result belonging to another algorithm must never remain visible.
 
  useEffect(() => {
    setResult(null);
    setDivergence(null);
    setGoToStep(null);
  }, [algorithm]);
 
  // ------------------------------------------------------------
  // Input/code changes
  // ------------------------------------------------------------
  //
  // Any modification invalidates the previous execution result because
  // that result was generated from different source/input.
 
  useEffect(() => {
    setResult(null);
    setDivergence(null);
    setGoToStep(null);
 
    // These values are intentionally dependencies:
    // changing code/text/pattern invalidates the previous trace.
  }, [code, text, pattern]);
 
  // ------------------------------------------------------------
  // Phase 10 validation
  // ------------------------------------------------------------
 
  const validation = useMemo(
    () => validate(code ?? ""),
    [code]
  );
 
  const errorCount =
    validation.errorCount ?? 0;
 
  const warningCount =
    validation.warningCount ?? 0;
 
  // ------------------------------------------------------------
  // Load Example
  // ------------------------------------------------------------
 
  function handleLoadExample() {
    const template =
      getStarterTemplate(algorithm);
 
    onChange(template);
 
    // Any existing execution (and any first-error result derived from it)
    // belongs to the previous code.
    setResult(null);
    setDivergence(null);
    setGoToStep(null);
  }
 
  // ------------------------------------------------------------
  // Reset
  // ------------------------------------------------------------
 
  function handleReset() {
    onReset();
 
    // Reset invalidates any previous execution.
    setResult(null);
    setDivergence(null);
    setGoToStep(null);
  }
 
  // ------------------------------------------------------------
  // Run
  // ------------------------------------------------------------
  //
  // CRITICAL:
  // Always validate before executing.
  //
  // The button is disabled when invalid, but this guard is still required
  // so execution can NEVER occur merely because a UI state was incorrect.
 
  function handleRun() {
    const source = code ?? "";
 
    const currentValidation =
      validate(source);
 
    // Never execute invalid pseudocode.
    if (!currentValidation.valid) {
      setResult({
        status: "invalid",
        result: null,
        trace: [],
        finalVariables: {},
        steps: 0,
        runtimeWarnings: [],
        error: {
          type: "validation-failed",
          message:
            "Pseudocode did not pass validation.",
          studentMessage:
            "Fix the validation errors shown above before running this pseudocode.",
          line:
            currentValidation.diagnostics.find(
              (d) => d.severity === "error"
            )?.line ?? null,
          column:
            currentValidation.diagnostics.find(
              (d) => d.severity === "error"
            )?.column ?? null,
        },
        diagnostics:
          currentValidation.diagnostics,
      });
 
      // No divergence result belongs to invalid pseudocode -- it never ran.
      setDivergence(null);
      setGoToStep(null);
 
      // Do not create a new playback run.
      return;
    }
 
    // executeSource() performs validation again and returns the real
    // interpreter result. Reusing executeSource keeps Phase 10 and Phase 11
    // behavior centralized.
    const execution =
      executeSource(source, {
        text: text ?? "",
        pattern: pattern ?? "",
      });
 
    setResult(execution);
 
    // PHASE 13 -- diff the student's own execution against the trusted
    // reference algorithm for the SAME algorithm/text/pattern. The
    // reference engine is only ever called here, to compare against --
    // never as a second visualization the student sees.
    const referenceResult = runReference(
      algorithm,
      text ?? "",
      pattern ?? ""
    );
 
    setDivergence(
      findFirstDivergence(
        execution,
        referenceResult
      )
    );
    setGoToStep(null);
 
    // A genuinely new execution gets a new playback reset key.
    setRunVersion(
      (version) => version + 1
    );
  }
 
  // ------------------------------------------------------------
  // PHASE 13 -- GO TO ERROR
  // ------------------------------------------------------------
  //
  // Bumps `token` so StudentExecutionLab's effect fires even if the
  // student presses this again for the same step after moving playback
  // elsewhere in between.
 
  function handleGoToError(studentStep) {
    setGoToStep((previous) => ({
      step: studentStep,
      token: (previous?.token ?? 0) + 1,
    }));
  }
 
  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
 
  const algorithmLabel =
    ALGORITHM_LABELS[algorithm] ??
    algorithm;
 
  return (
    <div className="write-pseudocode">
      {/* ------------------------------------------------------ */}
      {/* INTRO                                                   */}
      {/* ------------------------------------------------------ */}
 
      <p className="write-pseudocode__intro">
        Write{" "}
        <strong>
          {algorithmLabel}
        </strong>{" "}
        pseudocode below. Check the
        Pseudocode Rulebook tab for the
        accepted syntax.
      </p>
 
      {/* ------------------------------------------------------ */}
      {/* RUNTIME INPUTS                                         */}
      {/* ------------------------------------------------------ */}
 
      <div className="write-pseudocode__inputs">
        <label className="write-pseudocode__field">
          <span>Text</span>
 
          <input
            type="text"
            value={text ?? ""}
            onChange={(event) =>
              onTextChange(
                event.target.value
              )
            }
            spellCheck={false}
            placeholder="e.g. ABABABA"
          />
        </label>
 
        <label className="write-pseudocode__field">
          <span>Pattern</span>
 
          <input
            type="text"
            value={pattern ?? ""}
            onChange={(event) =>
              onPatternChange(
                event.target.value
              )
            }
            spellCheck={false}
            placeholder="e.g. ABA"
          />
        </label>
      </div>
 
      {/* ------------------------------------------------------ */}
      {/* PSEUDOCODE EDITOR                                      */}
      {/* ------------------------------------------------------ */}
 
      <CodeEditor
        value={code ?? ""}
        onChange={onChange}
        language="Pseudocode"
        hint={
          errorCount > 0
            ? `${errorCount} error${
                errorCount === 1
                  ? ""
                  : "s"
              }`
            : warningCount > 0
              ? `${warningCount} warning${
                  warningCount === 1
                    ? ""
                    : "s"
                }`
              : "Valid"
        }
      />
 
      {/* ------------------------------------------------------ */}
      {/* VALIDATION DIAGNOSTICS                                */}
      {/* ------------------------------------------------------ */}
 
      {validation.diagnostics.length >
        0 && (
        <ul className="write-pseudocode__diagnostics">
          {validation.diagnostics.map(
            (diagnostic, index) => (
              <li
                key={`${diagnostic.code}-${diagnostic.line}-${diagnostic.column}-${index}`}
                className={`write-pseudocode__diagnostic write-pseudocode__diagnostic--${diagnostic.severity}`}
              >
                Line{" "}
                {diagnostic.line}:{" "}
                {diagnostic.studentMessage ??
                  diagnostic.message}
              </li>
            )
          )}
        </ul>
      )}
 
      {/* ------------------------------------------------------ */}
      {/* TOOLBAR                                                 */}
      {/* ------------------------------------------------------ */}
 
      <div className="write-pseudocode__toolbar">
        <button
          type="button"
          className="write-pseudocode__btn"
          onClick={handleReset}
        >
          RESET
        </button>
 
        <button
          type="button"
          className="write-pseudocode__btn"
          onClick={handleLoadExample}
        >
          LOAD EXAMPLE
        </button>
 
        <button
          type="button"
          className="write-pseudocode__btn write-pseudocode__btn--primary"
          onClick={handleRun}
          disabled={!validation.valid}
          title={
            validation.valid
              ? undefined
              : "Fix the validation errors above before running this pseudocode."
          }
        >
          RUN MY PSEUDOCODE
        </button>
      </div>
 
      {/* ------------------------------------------------------ */}
      {/* EXECUTION RESULT                                      */}
      {/* ------------------------------------------------------ */}
      {/*
        ExecutionResultPanel is responsible for displaying:

        completed
        runtime-error
        step-limit
        invalid

        It receives the actual result returned by executeSource().
      */}

      <ExecutionResultPanel
        result={result}
      />
 
      {/* ------------------------------------------------------ */}
      {/* STUDENT TRACE VISUALIZATION                            */}
      {/* ------------------------------------------------------ */}
      {/*
        IMPORTANT:
        Invalid pseudocode must never enter StudentExecutionLab.

        A real execution trace is required.

        Runtime-error and step-limit traces ARE allowed because Phase 12
        should visualize the real steps that occurred before failure.
      */}

      {result?.status !==
        "invalid" &&
        Array.isArray(
          result?.trace
        ) &&
        result.trace.length > 0 && (
          <StudentExecutionLab
            code={code ?? ""}
            text={text ?? ""}
            pattern={pattern ?? ""}
            result={result}
            runVersion={
              runVersion
            }
            goToStep={goToStep}
          />
        )}
 
      {/* ------------------------------------------------------ */}
      {/* PHASE 13 -- FIRST ERROR                                */}
      {/* ------------------------------------------------------ */}
      {/*
        "Tell me where my pseudocode first goes wrong." Renders only what
        findFirstDivergence() itself produced: the first error (or a "no
        divergence" confirmation), the student's own source line, actual/
        expected values where available, a concise explanation, and a
        GO TO ERROR action that jumps StudentExecutionLab's playback to
        the exact student trace step above.
      */}

      {result?.status !==
        "invalid" && (
        <FirstErrorPanel
          divergence={divergence}
          onGoToError={handleGoToError}
        />
      )}
    </div>
  );
}