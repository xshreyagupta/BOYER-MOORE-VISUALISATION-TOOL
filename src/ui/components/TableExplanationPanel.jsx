import { getStepPhaseLabel } from "../lib/preprocessingSelectors.js";
import "./TableExplanationPanel.css";

/**
 * Requirement 8, "Dynamic explanations": a plain-English sentence for
 * whatever the preprocessing algorithm just did, sourced directly from
 * `step.explanation` (built in preprocessingTrace.js from the real
 * algorithm's own execution -- never invented here).
 *
 * @param {object|null} step
 * @param {number|null} stepNumber
 * @param {number|null} totalSteps
 */
export default function TableExplanationPanel({ step, stepNumber, totalSteps }) {
  return (
    <div className="table-explanation">
      <div className="table-explanation__head">
        <span className="table-explanation__eyebrow">Preprocessing notes</span>
        {step && <span className={`table-explanation__tag`}>{getStepPhaseLabel(step)}</span>}
        {stepNumber !== null && totalSteps !== null && (
          <span className="table-explanation__step">
            step {stepNumber + 1} / {totalSteps}
          </span>
        )}
      </div>
      <p className="table-explanation__text">
        {step ? step.explanation : "Enter a pattern, then run preprocessing to see the table built step by step."}
      </p>
    </div>
  );
}
