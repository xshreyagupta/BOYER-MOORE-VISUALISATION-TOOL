import { getPatternCharRole } from "../lib/preprocessingSelectors.js";
import "./PatternStrip.css";

/**
 * Renders the pattern being preprocessed, one cell per character, colored
 * by that character's role in the current preprocessing step (see
 * preprocessingSelectors.getPatternCharRole). This is requirement 6,
 * "Pattern character highlighting", for the Preprocessing Lab.
 *
 * @param {string} pattern
 * @param {object|null} step  current preprocessing trace step
 */
export default function PatternStrip({ pattern, step }) {
  const chars = pattern.split("");

  return (
    <div className="pattern-strip" aria-label="pattern">
      {chars.length === 0 ? (
        <span className="pattern-strip__empty">(empty pattern)</span>
      ) : (
        chars.map((char, index) => {
          const role = getPatternCharRole(step, index);
          return (
            <div key={index} className={`ps-cell ps-cell--${role}`} data-index={index}>
              <span className="ps-cell__index">{index}</span>
              <span className="ps-cell__char">{char}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
