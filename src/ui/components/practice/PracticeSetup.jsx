import { ALGORITHMS } from "../../../engine/index.js";
import "./PracticeSetup.css";

// PHASE 8 (redesigned) -- with the Monaco/multi-language code track
// abandoned, the only setup choice left in the Practice Lab is which
// algorithm the student is practicing. Same radiogroup-of-buttons pattern
// (and the same CSS file) as the original language+algorithm setup panel,
// just with the language half removed.
export const ALGORITHM_LABELS = Object.freeze({
  [ALGORITHMS.BAD_CHARACTER]: "Bad Character",
  [ALGORITHMS.GOOD_SUFFIX]: "Good Suffix",
  [ALGORITHMS.FULL]: "Full Boyer-Moore",
});

export default function PracticeSetup({ algorithm, onAlgorithmChange }) {
  return (
    <div className="practice-setup">
      <div className="practice-setup__group">
        <span className="practice-setup__label">Algorithm</span>
        <div className="practice-setup__options" role="radiogroup" aria-label="algorithm">
          {Object.values(ALGORITHMS).map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={algorithm === id}
              className={`practice-setup__option${algorithm === id ? " practice-setup__option--active" : ""}`}
              onClick={() => onAlgorithmChange(id)}
            >
              {ALGORITHM_LABELS[id]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
