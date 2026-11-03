import { ALGORITHMS } from "../../engine/index.js";
import { ALGORITHM_PAIRS } from "../lib/comparisonSelectors.js";
import "./ComparisonSetup.css";

const ALGORITHM_LABELS = {
  [ALGORITHMS.BAD_CHARACTER]: "Bad Character",
  [ALGORITHMS.GOOD_SUFFIX]: "Good Suffix",
  [ALGORITHMS.FULL]: "Full Boyer-Moore",
};

const SCREEN_COUNTS = [1, 2, 3];

/**
 * PHASE 5 -- 1 / 2 / 3 Screen Comparison Mode setup.
 *
 * - 1 screen: pick any single algorithm.
 * - 2 screens: pick one of the three fixed pairs (Bad Character + Good
 *   Suffix, Bad Character + Full, Good Suffix + Full) -- these are the
 *   only 2-screen combinations Phase 5 requires, so this is a single
 *   selector over the three pairs rather than two independent selects
 *   that could otherwise land on an invalid/duplicate combination.
 * - 3 screens: always Bad Character + Good Suffix + Full, nothing to pick.
 *
 * @param {number} numScreens
 * @param {string} singleAlgorithm    used when numScreens === 1
 * @param {string} pairId             used when numScreens === 2
 * @param {(n: number) => void} onNumScreensChange
 * @param {(a: string) => void} onSingleAlgorithmChange
 * @param {(id: string) => void} onPairIdChange
 */
export default function ComparisonSetup({
  numScreens,
  singleAlgorithm,
  pairId,
  onNumScreensChange,
  onSingleAlgorithmChange,
  onPairIdChange,
}) {
  return (
    <div className="comparison-setup">
      <div className="comparison-setup__row">
        <span className="comparison-setup__label">Screens</span>
        <div className="comparison-setup__screens" role="group" aria-label="number of screens">
          {SCREEN_COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              className={`comparison-setup__screen-btn${numScreens === n ? " comparison-setup__screen-btn--active" : ""}`}
              onClick={() => onNumScreensChange(n)}
              aria-pressed={numScreens === n}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {numScreens === 1 && (
        <label className="comparison-setup__field">
          <span>Algorithm</span>
          <select value={singleAlgorithm} onChange={(e) => onSingleAlgorithmChange(e.target.value)}>
            {Object.values(ALGORITHMS).map((a) => (
              <option key={a} value={a}>
                {ALGORITHM_LABELS[a]}
              </option>
            ))}
          </select>
        </label>
      )}

      {numScreens === 2 && (
        <label className="comparison-setup__field">
          <span>Compare</span>
          <select value={pairId} onChange={(e) => onPairIdChange(e.target.value)}>
            {ALGORITHM_PAIRS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {numScreens === 3 && (
        <span className="comparison-setup__fixed">Bad Character + Good Suffix + Full Boyer-Moore</span>
      )}
    </div>
  );
}
