import { getChangedVariableKeys, formatVariableValue, getVariableEntries } from "../lib/pseudocodeSelectors.js";
import "./VariableTracker.css";

function VariableValue({ name, value, changed, stepKey }) {
  return (
    <div className="variable-value" key={name}>
      <dt className="variable-value__name">{name}</dt>
      {/* `key` includes stepKey so React remounts this node whenever the
          step changes -- that's what lets the CSS highlight animation
          replay on every genuine change instead of only firing once. */}
      <dd
        key={`${name}:${stepKey}`}
        className={`variable-value__value${changed ? " variable-value__value--changed" : ""}`}
      >
        {formatVariableValue(value)}
      </dd>
    </div>
  );
}

/**
 * PHASE 7, requirements 5-6 -- "Live Variable Tracker" + change highlight.
 *
 * Renders whatever variables the *current* trace state actually carries in
 * its `variables` object -- nothing here hardcodes which variables belong
 * to which algorithm (requirement: "Only display variables relevant to the
 * current algorithm"). Bad Character states simply never populate
 * `goodSuffixShift`, so it never appears here for that mode; Full
 * Boyer-Moore states populate both, so both appear. This is the same
 * "derive display from real data, don't special-case by algorithm name"
 * approach CurrentOperationPanel already used for preprocessing in Phase 6
 * -- this component generalizes that idea (with added change-highlighting)
 * so both Search and Preprocessing modes share one implementation instead
 * of two.
 *
 * @param {object|null} variables          current state.variables
 * @param {object|null} previousVariables  the previous state's variables,
 *                                          for detecting what just changed
 * @param {number|string} [stepKey]        current step index (or any value
 *                                          that changes once per step) --
 *                                          used only to key the highlight
 *                                          animation, not for display
 * @param {"card"|"flat"} [variant]         "card" (default): its own
 *                                          dark panel with heading, used
 *                                          standalone. "flat": no
 *                                          background/shadow/heading, for
 *                                          embedding inside a panel that
 *                                          already provides those (e.g.
 *                                          CurrentOperationPanel).
 */
export default function VariableTracker({ variables, previousVariables, stepKey = 0, variant = "card" }) {
  const entries = getVariableEntries(variables);
  const changedKeys = new Set(getChangedVariableKeys(previousVariables, variables));
  const flat = variant === "flat";

  if (entries.length === 0) {
    return (
      <div className={flat ? "variable-tracker variable-tracker--flat" : "variable-tracker variable-tracker--empty"}>
        {!flat && <span className="variable-tracker__eyebrow">Live variables</span>}
        <p className="variable-tracker__idle">No local variables at this step.</p>
      </div>
    );
  }

  return (
    <div className={flat ? "variable-tracker variable-tracker--flat" : "variable-tracker"}>
      {!flat && <span className="variable-tracker__eyebrow">Live variables</span>}
      <dl className="variable-tracker__grid">
        {entries.map(([name, value]) => (
          <VariableValue key={name} name={name} value={value} changed={changedKeys.has(name)} stepKey={stepKey} />
        ))}
      </dl>
    </div>
  );
}
