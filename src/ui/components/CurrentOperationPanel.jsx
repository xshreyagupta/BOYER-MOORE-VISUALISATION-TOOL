import { getStepPhaseLabel } from "../lib/preprocessingSelectors.js";
import VariableTracker from "./VariableTracker.jsx";
import "./CurrentOperationPanel.css";

/**
 * Requirement 7, "Current operation panel": a compact, code-like readout
 * of exactly what the preprocessing algorithm is doing on this step --
 * the raw variables from the step, not prose. TableExplanationPanel
 * carries the prose; this carries the numbers.
 *
 * PHASE 7 -- the variable list itself is now VariableTracker (the same
 * component the Search mode panels use), rather than a second, duplicate
 * variables-`dl` implementation. That's also what brings the change
 * highlight (requirement 6) to Preprocessing mode: VariableTracker
 * already knows how to diff `variables` against `previousVariables`, so
 * this panel only needs to hand it both.
 *
 * @param {object|null} step               current preprocessing trace step
 * @param {object|null} [previousVariables] the previous step's variables
 * @param {number|string} [stepKey]         current step index, for the
 *                                           highlight-replay key
 */
export default function CurrentOperationPanel({ step, previousVariables = null, stepKey = 0 }) {
  if (!step) {
    return (
      <div className="op-panel op-panel--empty">
        <span className="op-panel__eyebrow">Current operation</span>
        <p className="op-panel__idle">Enter a pattern and press Run to begin preprocessing.</p>
      </div>
    );
  }

  const { pseudocodeLine } = step;

  return (
    <div className="op-panel">
      <div className="op-panel__head">
        <span className="op-panel__eyebrow">Current operation</span>
        <span className="op-panel__tag">{getStepPhaseLabel(step)}</span>
        {pseudocodeLine != null && <span className="op-panel__line">line {pseudocodeLine}</span>}
      </div>
      <VariableTracker variables={step.variables} previousVariables={previousVariables} stepKey={stepKey} variant="flat" />
    </div>
  );
}
