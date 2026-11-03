import { useMemo, useState } from "react";
import { traceBadCharacter, traceGoodSuffix } from "../../algorithms/preprocessingTrace.js";
import { useTablePlayback } from "../hooks/useTablePlayback.js";
import { getCurrentStep, isTraceComplete } from "../lib/preprocessingSelectors.js";
import PatternStrip from "./PatternStrip.jsx";
import CurrentOperationPanel from "./CurrentOperationPanel.jsx";
import TableExplanationPanel from "./TableExplanationPanel.jsx";
import TableView from "./TableView.jsx";
import FinalTableSummary from "./FinalTableSummary.jsx";
import PlaybackControls from "./PlaybackControls.jsx";
import PseudocodePanel from "./PseudocodePanel.jsx";
import { getPreprocessingPseudocode } from "../data/pseudocode.js";
import { usePseudocodeSound } from "../hooks/usePseudocodeSound.js";
import "./PreprocessingLab.css";

const TABLE_KINDS = Object.freeze({
  BAD_CHARACTER: "bad-character",
  GOOD_SUFFIX: "good-suffix",
});

const DEFAULT_PATTERN = "GCAGAGAG";

/**
 * Requirements 1-11 all live in this one screen:
 *  1. Step-by-step Bad Character table construction
 *  2. Step-by-step Good Suffix table construction
 *  3. Preprocessing execution traces           (traceBadCharacter/traceGoodSuffix)
 *  4. First/Previous/Play/Pause/Next/Last/Restart  (PlaybackControls, reused as-is)
 *  5. Playback speed                           (PlaybackControls, reused as-is)
 *  6. Pattern character highlighting           (PatternStrip)
 *  7. Current operation panel                  (CurrentOperationPanel)
 *  8. Dynamic explanations                     (TableExplanationPanel)
 *  9. Progressive table updates                (TableView)
 * 10. Final completed tables                   (FinalTableSummary)
 * 11. Connection to actual Boyer-Moore search   (FinalTableSummary's "how the
 *     search uses this" + the onRunSearch handoff into Search mode)
 *
 * The trace itself is never faked, hardcoded, or reimplemented here --
 * traceBadCharacter/traceGoodSuffix (src/algorithms/preprocessingTrace.js)
 * call the exact same buildLastOccurrenceTable/buildGoodSuffixTable
 * functions the search algorithms use (src/algorithms/preprocessing.js).
 *
 * @param {(pattern: string, algorithm: string) => void} [onRunSearch]
 *        optional: switch the app into Search mode with this pattern and
 *        the matching algorithm preselected.
 */
export default function PreprocessingLab({ onRunSearch }) {
  const [patternInput, setPatternInput] = useState(DEFAULT_PATTERN);
  const [committedPattern, setCommittedPattern] = useState(DEFAULT_PATTERN);
  const [tableKind, setTableKind] = useState(TABLE_KINDS.BAD_CHARACTER);
  const [showPseudocode, setShowPseudocode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [runVersion, setRunVersion] = useState(0);

  function handleBuild() {
    setCommittedPattern(patternInput);
    setRunVersion((v) => v + 1);
  }

  const trace = useMemo(() => {
    return tableKind === TABLE_KINDS.BAD_CHARACTER
      ? traceBadCharacter(committedPattern)
      : traceGoodSuffix(committedPattern);
  }, [tableKind, committedPattern]);

  const resetKey = `${runVersion}:${tableKind}`;
  const { stepIndex, isPlaying, speed, setSpeed, atStart, atEnd, totalSteps, actions } = useTablePlayback({
    steps: trace.steps,
    resetKey,
  });

  const currentStep = getCurrentStep(trace, stepIndex);
  const complete = isTraceComplete(trace, stepIndex);

  usePseudocodeSound({
    soundEnabled,
    activeLineKey: currentStep?.pseudocodeLine ?? "-",
    resetKey,
    stepIndex,
  });

  // PHASE 7 -- the step immediately before the current one, so
  // CurrentOperationPanel's embedded VariableTracker can highlight what
  // just changed. Clamped the same way getCurrentStep already clamps.
  const previousStep = stepIndex > 0 ? trace.steps[Math.min(stepIndex - 1, trace.steps.length - 1)] ?? null : null;

  return (
    <div className="preprocessing-lab">
      <div className="preprocessing-lab__controls">
        <div className="preprocessing-lab__inputs">
          <label className="preprocessing-lab__field">
            <span>Pattern</span>
            <input
              type="text"
              value={patternInput}
              onChange={(e) => setPatternInput(e.target.value)}
              spellCheck={false}
              placeholder="e.g. GCAGAGAG"
            />
          </label>

          <div className="preprocessing-lab__kind" role="group" aria-label="table to build">
            {Object.values(TABLE_KINDS).map((kind) => (
              <button
                key={kind}
                type="button"
                className={`preprocessing-lab__kind-btn${tableKind === kind ? " preprocessing-lab__kind-btn--active" : ""}`}
                onClick={() => setTableKind(kind)}
                aria-pressed={tableKind === kind}
              >
                {kind === TABLE_KINDS.BAD_CHARACTER ? "Bad Character" : "Good Suffix"}
              </button>
            ))}
          </div>

          <button type="button" className="preprocessing-lab__build" onClick={handleBuild}>
            Build Table
          </button>
        </div>
      </div>

      <PlaybackControls
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        isPlaying={isPlaying}
        atStart={atStart}
        atEnd={atEnd}
        awaitingContinue={false}
        speed={speed}
        onSpeedChange={setSpeed}
        actions={actions}
        showPseudocode={showPseudocode}
        onTogglePseudocode={() => setShowPseudocode((v) => !v)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((v) => !v)}
      />

      <PatternStrip pattern={committedPattern} step={currentStep} />

      <CurrentOperationPanel step={currentStep} previousVariables={previousStep?.variables ?? null} stepKey={stepIndex} />

      <div style={{ display: showPseudocode ? undefined : "none" }} aria-hidden={!showPseudocode}>
        <PseudocodePanel
          algorithm={tableKind}
          pseudocode={getPreprocessingPseudocode(tableKind)}
          activeLine={currentStep?.pseudocodeLine ?? null}
        />
      </div>

      <TableView trace={trace} step={currentStep} />

      <TableExplanationPanel step={currentStep} stepNumber={stepIndex} totalSteps={totalSteps} />

      {complete && (
        <FinalTableSummary
          trace={trace}
          onRunSearch={onRunSearch ? () => onRunSearch(committedPattern, tableKind) : undefined}
        />
      )}
    </div>
  );
}
