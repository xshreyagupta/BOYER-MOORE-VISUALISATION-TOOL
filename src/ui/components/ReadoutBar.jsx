import "./ReadoutBar.css";

function Digit({ label, value }) {
  return (
    <div className="readout__digit">
      <span className="readout__value">{value ?? "\u2013"}</span>
      <span className="readout__label">{label}</span>
    </div>
  );
}

/**
 * Instrument-style readout of the current execution state's key numbers.
 * @param {object|null} state
 */
export default function ReadoutBar({ state }) {
  if (!state) {
    return (
      <div className="readout readout--empty">
        <span>Run the algorithm to see live values here.</span>
      </div>
    );
  }

  const { alignment, i, j, chosenShift, badCharacterShift, goodSuffixShift, phase } = state;

  return (
    <div className="readout">
      <Digit label="s (alignment)" value={alignment} />
      <Digit label="i (text idx)" value={i} />
      <Digit label="j (pattern idx)" value={j} />
      {badCharacterShift !== null && <Digit label="bad-char shift" value={badCharacterShift} />}
      {goodSuffixShift !== null && <Digit label="good-suffix shift" value={goodSuffixShift} />}
      <Digit label="shift applied" value={chosenShift} />
      <span className={`readout__phase readout__phase--${phase}`}>{phase}</span>
    </div>
  );
}
