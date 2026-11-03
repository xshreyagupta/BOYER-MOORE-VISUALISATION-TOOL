import { useEffect, useMemo } from "react";

import PlaybackControls from "../PlaybackControls.jsx";
import PseudocodePanel from "../PseudocodePanel.jsx";
import VariableTracker from "../VariableTracker.jsx";
import IndexRuler from "../IndexRuler.jsx";
import CharacterCell from "../CharacterCell.jsx";
import ShiftRace from "../ShiftRace.jsx";

import { usePlayback } from "../../hooks/usePlayback.js";
import { usePseudocodeSound } from "../../hooks/usePseudocodeSound.js";
import { getPreviousState } from "../../lib/traceSelectors.js";
import { CELL_STRIDE } from "../../lib/layoutMetrics.js";

import {
  buildPseudocodeFromSource,
  getActiveLine,
  getStudentTextCellStatus,
  getStudentPatternCellStatus,
  hasAlignment,
  getShiftAvailability,
  getShiftWinnerLabel,
  explainStudentState,
} from "../../lib/studentTraceSelectors.js";

import "./StudentExecutionLab.css";

// PHASE 12 -- Student Execution Visualization.
//
// The visualization is completely trace-driven:
//
// executeSource()
//      ↓
// result.trace
//      ↓
// usePlayback()
//      ↓
// current trace state
//      ↓
// visualization
//
// This component NEVER runs Boyer-Moore itself and never invents
// alignment, comparison, mismatch, or shift values.

export default function StudentExecutionLab({
  code,
  text,
  pattern,
  result,
  runVersion,
  // PHASE 13 -- { step, token } from WritePseudocode's "GO TO ERROR"
  // handler. `token` increments on every press so the effect below fires
  // even if the student asks to go to the same step twice in a row.
  goToStep,
}) {
  // ------------------------------------------------------------
  // IMPORTANT:
  // Invalid pseudocode must never reach the execution visualization.
  // Phase 10 validation has already rejected it.
  // ------------------------------------------------------------

  if (!result || result.status === "invalid") {
    return null;
  }

  const states = Array.isArray(result.trace)
    ? result.trace
    : [];

  // There is nothing to visualize when execution produced no states.
  if (states.length === 0) {
    return null;
  }

  return (
    <StudentExecutionTraceView
      code={code}
      text={text}
      pattern={pattern}
      result={result}
      runVersion={runVersion}
      states={states}
      goToStep={goToStep}
    />
  );
}

function StudentExecutionTraceView({
  code,
  text,
  pattern,
  result,
  runVersion,
  states,
  goToStep,
}) {
  const [showPseudocode, setShowPseudocode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const playback = usePlayback({
    states,
    resetKey: runVersion,
  });

  const {
    stepIndex,
    actions,
    isPlaying,
    speed,
    setSpeed,
    atStart,
    atEnd,
    totalSteps,
    awaitingContinue,
  } = playback;

  // PHASE 13 -- GO TO ERROR. Jumps playback straight to the student's
  // trace step for the current first-divergence result. Keyed on
  // goToStep?.token (not just goToStep?.step) so pressing the button again
  // for the same step re-jumps even after the student has scrubbed
  // playback elsewhere in between.
  useEffect(() => {
    if (!goToStep || goToStep.step == null) return;
    actions.goTo(goToStep.step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goToStep?.token]);

  const currentState =
    states[stepIndex] ?? null;

  const previousState =
    getPreviousState(
      states,
      stepIndex
    );

  const pseudocode = useMemo(
    () => buildPseudocodeFromSource(code),
    [code]
  );

  const activeLine = getActiveLine(
    currentState,
    result,
    atEnd
  );

  usePseudocodeSound({
    soundEnabled,
    activeLineKey: activeLine ?? "-",
    resetKey: runVersion,
    stepIndex,
  });

  const failed =
    result.status === "runtime-error" ||
    result.status === "step-limit";

  const showFailureNotice =
    failed && atEnd;

  return (
    <div className="student-lab">
      {/* -------------------------------------------------- */}
      {/* PLAYBACK */}
      {/* -------------------------------------------------- */}

      <PlaybackControls
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        isPlaying={isPlaying}
        atStart={atStart}
        atEnd={atEnd}
        awaitingContinue={awaitingContinue}
        speed={speed}
        onSpeedChange={setSpeed}
        actions={actions}
        showPseudocode={showPseudocode}
        onTogglePseudocode={() => setShowPseudocode((v) => !v)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((v) => !v)}
      />

      {/* -------------------------------------------------- */}
      {/* MAIN GRID */}
      {/* -------------------------------------------------- */}

      <div className={`student-lab__grid${!showPseudocode ? " student-lab__grid--no-code" : ""}`}>
        {/* ----------------------------------------------- */}
        {/* PSEUDOCODE */}
        {/* ----------------------------------------------- */}

        <div
          className="student-lab__code"
          style={{ display: showPseudocode ? undefined : "none" }}
          aria-hidden={!showPseudocode}
        >
          <PseudocodePanel
            algorithm="student"
            pseudocode={pseudocode}
            activeLine={activeLine}
          />
        </div>

        {/* ----------------------------------------------- */}
        {/* VISUALIZATION */}
        {/* ----------------------------------------------- */}

        <div className="student-lab__visual">
          <StudentTextTrack
            text={text ?? ""}
            state={currentState}
          />

          <StudentPatternTrack
            pattern={pattern ?? ""}
            state={currentState}
          />

          <StudentComparisonReadout
            state={currentState}
          />

          <StudentShiftReadout
            state={currentState}
          />
        </div>

        {/* ----------------------------------------------- */}
        {/* VARIABLES / CONTROL FLOW */}
        {/* ----------------------------------------------- */}

        <div className="student-lab__side">
          <VariableTracker
            variables={
              currentState?.variables
            }
            previousVariables={
              previousState?.variables
            }
            stepKey={stepIndex}
          />

          <StudentControlFlowReadout
            state={currentState}
          />

          <StudentExecutionExplanation
            state={currentState}
          />
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* RUNTIME FAILURE */}
      {/* -------------------------------------------------- */}

      {showFailureNotice && (
        <div
          className="student-lab__failure"
          role="alert"
        >
          <span className="student-lab__failure-title">
            {result.status ===
            "step-limit"
              ? "STEP LIMIT REACHED"
              : "RUNTIME ERROR"}
          </span>

          <p className="student-lab__failure-message">
            {result.error?.studentMessage ??
              result.error?.message ??
              "Execution stopped because of a runtime error."}
          </p>

          {result.error?.line != null && (
            <span className="student-lab__failure-location">
              Line {result.error.line}
              {result.error.column != null
                ? `, Column ${result.error.column}`
                : ""}
            </span>
          )}

          <p className="student-lab__failure-note">
            Execution stopped here. Every
            step above happened for real —
            nothing past this point was run.
          </p>
        </div>
      )}
    </div>
  );
}

/* ========================================================= */
/* TEXT TRACK                                                */
/* ========================================================= */

function StudentTextTrack({
  text,
  state,
}) {
  return (
    <div className="student-track">
      <span className="student-track__label">
        TEXT
      </span>

      <IndexRuler
        length={text.length}
      />

      <div
        className="student-track__row"
        aria-label="search text"
      >
        {text.length === 0 ? (
          <div className="student-track__empty">
            (empty text)
          </div>
        ) : (
          Array.from(text).map(
            (char, i) => (
              <CharacterCell
                key={i}
                char={char}
                index={i}
                status={getStudentTextCellStatus(
                  state,
                  i
                )}
              />
            )
          )
        )}
      </div>
    </div>
  );
}

/* ========================================================= */
/* PATTERN TRACK                                             */
/* ========================================================= */

function StudentPatternTrack({
  pattern,
  state,
}) {
  const known = hasAlignment(state);

  return (
    <div className="student-track student-track--pattern">
      <span className="student-track__label">
        PATTERN
      </span>

      <div className="student-track__rail">
        <div
          className="student-track__row"
          style={
            known
              ? {
                  transform: `translateX(${
                    state.alignment *
                    CELL_STRIDE
                  }px)`,
                }
              : undefined
          }
          aria-label="pattern"
        >
          {pattern.length === 0 ? (
            <div className="student-track__empty">
              (empty pattern)
            </div>
          ) : (
            Array.from(pattern).map(
              (char, j) => (
                <CharacterCell
                  key={j}
                  char={char}
                  index={j}
                  showIndex
                  status={getStudentPatternCellStatus(
                    state,
                    j
                  )}
                />
              )
            )
          )}
        </div>
      </div>

      <p className="student-track__caption">
        {known ? (
          <>
            pattern, aligned at{" "}
            <strong>
              s&nbsp;=&nbsp;
              {state.alignment}
            </strong>
          </>
        ) : (
          "Alignment unavailable at this step."
        )}
      </p>
    </div>
  );
}

/* ========================================================= */
/* COMPARISON                                                */
/* ========================================================= */

function StudentComparisonReadout({
  state,
}) {
  const comparison =
    state?.currentComparison;

  if (!comparison) {
    return (
      <div className="student-readout student-readout--idle">
        No character comparison at this
        step.
      </div>
    );
  }

  const result =
    comparison.result === "match"
      ? "match"
      : "mismatch";

  return (
    <div
      className={`student-readout student-readout--${result}`}
    >
      <code>
        TEXT[{comparison.textIndex}] = '
        {comparison.textChar}'
      </code>

      <code>
        PATTERN[{comparison.patternIndex}] = '
        {comparison.patternChar}'
      </code>

      <span className="student-readout__verdict">
        {result === "match"
          ? "MATCH"
          : "MISMATCH"}
      </span>
    </div>
  );
}

/* ========================================================= */
/* SHIFT INFORMATION                                         */
/* ========================================================= */

function StudentShiftReadout({
  state,
}) {
  const {
    hasBad,
    hasGood,
    hasChosen,
    hasBoth,
  } = getShiftAvailability(state);

  if (
    !hasBad &&
    !hasGood &&
    !hasChosen
  ) {
    return (
      <div className="student-readout student-readout--idle">
        No shift produced at this step.
      </div>
    );
  }

  /*
   * IMPORTANT:
   * We use ShiftRace only when BOTH heuristic values
   * actually exist.
   *
   * We never calculate a missing chosenShift.
   */
  if (hasBoth) {
    const winner =
      hasChosen
        ? getShiftWinnerLabel(
            state.badCharacterShift,
            state.goodSuffixShift
          )
        : null;

    return (
      <ShiftRace
        badCharacterShift={
          state.badCharacterShift
        }
        goodSuffixShift={
          state.goodSuffixShift
        }
        chosenShift={
          hasChosen
            ? state.chosenShift
            : undefined
        }
        winner={winner}
      />
    );
  }

  return (
    <dl className="student-shift-fields">
      <ShiftField
        label="Bad Character Shift"
        present={hasBad}
        value={
          state?.badCharacterShift
        }
      />

      <ShiftField
        label="Good Suffix Shift"
        present={hasGood}
        value={
          state?.goodSuffixShift
        }
      />

      <ShiftField
        label="Chosen Shift"
        present={hasChosen}
        value={state?.chosenShift}
      />
    </dl>
  );
}

function ShiftField({
  label,
  present,
  value,
}) {
  return (
    <div className="student-shift-fields__row">
      <dt>{label}</dt>

      <dd>
        {present
          ? value
          : "Not produced at this step"}
      </dd>
    </div>
  );
}

/* ========================================================= */
/* CONTROL FLOW                                             */
/* ========================================================= */

function StudentControlFlowReadout({
  state,
}) {
  if (!state) {
    return null;
  }

  const rows = [];

  if (
    Array.isArray(state.callStack) &&
    state.callStack.length > 0
  ) {
    rows.push([
      "Call stack",
      state.callStack.join(" › "),
    ]);
  }

  if (state.branch != null) {
    rows.push([
      "Branch taken",
      state.branch === "then"
        ? "THEN"
        : "ELSE",
    ]);
  }

  if (
    state.conditionMet != null
  ) {
    rows.push([
      "Condition",
      state.conditionMet
        ? "TRUE"
        : "FALSE",
    ]);
  }

  if (state.loopVar != null) {
    rows.push([
      state.loopVar,
      String(
        state.variables?.[
          state.loopVar
        ]
      ),
    ]);
  }

  if (
    state.iteration != null
  ) {
    rows.push([
      "Iteration",
      String(state.iteration),
    ]);
  }

  if (
    state.nodeType ===
    "Return"
  ) {
    rows.push([
      "Returned",
      state.returnValue ===
        null ||
      state.returnValue ===
        undefined
        ? "null"
        : String(
            state.returnValue
          ),
    ]);
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <dl className="student-control-flow">
      {rows.map(
        ([label, value]) => (
          <div
            className="student-control-flow__row"
            key={label}
          >
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        )
      )}
    </dl>
  );
}

/* ========================================================= */
/* EXECUTION EXPLANATION                                     */
/* ========================================================= */

function StudentExecutionExplanation({
  state,
}) {
  return (
    <div className="student-explanation">
      <span className="student-explanation__eyebrow">
        What just happened
      </span>

      <p className="student-explanation__text">
        {explainStudentState(state)}
      </p>
    </div>
  );
}