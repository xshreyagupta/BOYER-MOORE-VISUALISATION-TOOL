import "./ExplanationPanel.css";

const PHASE_TAGS = {
  start: "SETUP",
  compare: "COMPARING",
  mismatch: "MISMATCH",
  found: "MATCH FOUND",
  done: "COMPLETE",
};

/**
 * @param {object|null} state  current execution-trace state
 * @param {number|null} stepNumber
 * @param {number|null} totalSteps
 */
export default function ExplanationPanel({ state, stepNumber, totalSteps }) {
  return (
    <div className="explanation">
      <div className="explanation__head">
        <span className="explanation__eyebrow">Lab notes</span>
        {state && (
          <span className={`explanation__tag explanation__tag--${state.phase}`}>
            {PHASE_TAGS[state.phase] ?? state.phase}
          </span>
        )}
        {stepNumber !== null && totalSteps !== null && (
          <span className="explanation__step">
            step {stepNumber + 1} / {totalSteps}
          </span>
        )}
      </div>
      <p className="explanation__text">
        {state ? state.explanation : "Enter a text and pattern, then run the algorithm to begin."}
      </p>
    </div>
  );
}
