
import { useState } from "react";
import "./FinalTableSummary.css";

/**
 * Shows the completed preprocessing table and a formula explorer.
 * The explorer demonstrates how table values are used in shift formulas.
 */
export default function FinalTableSummary({ trace, onRunSearch }) {
  if (!trace) return null;

  return trace.algorithm === "bad-character" ? (
    <BadCharacterSummary trace={trace} onRunSearch={onRunSearch} />
  ) : (
    <GoodSuffixSummary trace={trace} onRunSearch={onRunSearch} />
  );
}

function ShiftCalculator({ pattern, lastOccurrenceTable, shiftTable }) {
  const m = pattern.length;

  const characters = Object.keys(lastOccurrenceTable ?? {});
  const [j, setJ] = useState(Math.max(0, m - 1));
  const [selectedChar, setSelectedChar] = useState(
    characters[0] ?? ""
  );

  if (m === 0) {
    return (
      <section className="shift-calculator">
        <h4>Shift Formula Explorer</h4>
        <p>Enter a non-empty pattern to explore shifts.</p>
      </section>
    );
  }

  const lastIndex =
    selectedChar !== "" &&
    Object.prototype.hasOwnProperty.call(lastOccurrenceTable, selectedChar)
      ? lastOccurrenceTable[selectedChar]
      : -1;

  const badShift = Math.max(1, j - lastIndex);

  const goodShift =
    Array.isArray(shiftTable) && shiftTable.length > j + 1
      ? shiftTable[j + 1]
      : null;

  return (
    <section className="shift-calculator">
      <div className="shift-calculator__header">
        <span className="final-summary__badge">EXPLORE THE FORMULA</span>
        <h4>Shift Formula Explorer</h4>
        <p>
          Select a pattern index and explore how the preprocessing table
          values are used in the shift formulas. You do not need to enter
          a text string or manually enter a mismatched character.
        </p>
      </div>

      <label className="shift-calculator__field">
        <span>Pattern index (j)</span>
        <select
          value={j}
          onChange={(event) => setJ(Number(event.target.value))}
        >
          {Array.from({ length: m }, (_, index) => (
            <option key={index} value={index}>
              {index}
            </option>
          ))}
        </select>
      </label>

      <div className="shift-calculator__step">
        <h5>1. Bad Character Shift</h5>
        <p>
          The table stores the last occurrence index of each character
          in the pattern.
        </p>

        <label className="shift-calculator__field">
          <span>Choose a character from the table</span>
          <select
            value={selectedChar}
            onChange={(event) => setSelectedChar(event.target.value)}
          >
            {characters.map((char) => (
              <option key={char} value={char}>
                {char}
              </option>
            ))}
            <option value="">Character absent from pattern</option>
          </select>
        </label>

        <p>
          Last occurrence index: <strong>{lastIndex}</strong>
        </p>

        <code>
          max(1, {j} - ({lastIndex})) = {badShift}
        </code>

        <p className="shift-calculator__result">
          Bad Character shift: <strong>{badShift}</strong>
        </p>
      </div>

      <div className="shift-calculator__step">
        <h5>2. Good Suffix Shift</h5>
        <p>
          For a mismatch at pattern index <code>j</code>, the algorithm
          uses <code>shift[j + 1]</code>.
        </p>

        {goodShift === null ? (
          <p>
            The Good Suffix table is not available in this view.
            Select the Good Suffix table tab to explore its shift values.
          </p>
        ) : (
          <>
            <code>
              shift[{j + 1}] = {goodShift}
            </code>
            <p className="shift-calculator__result">
              Good Suffix shift: <strong>{goodShift}</strong>
            </p>
          </>
        )}

        <p>
          If the entire pattern matches, the algorithm uses{" "}
          <code>shift[0]</code>.
          {Array.isArray(shiftTable) && (
            <>
              {" "}Here, <code>shift[0] = {shiftTable[0]}</code>.
            </>
          )}
        </p>
      </div>

      <p className="shift-calculator__note">
        This explorer demonstrates the formulas using preprocessing
        values. The actual Bad Character shift depends on the text character
        that caused a mismatch. This is not a simulation of a complete search.
      </p>
    </section>
  );
}

function BadCharacterSummary({ trace, onRunSearch }) {
  const entries = Object.entries(trace.table).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <div className="final-summary">
      <div className="final-summary__head">
        <span className="final-summary__badge">TABLE COMPLETE</span>
        <h3>Last-Occurrence Table for &quot;{trace.pattern}&quot;</h3>
      </div>

      {entries.length === 0 ? (
        <p className="final-summary__empty">
          Empty pattern — no entries.
        </p>
      ) : (
        <table className="final-summary__table">
          <thead>
            <tr>
              <th>Character</th>
              {entries.map(([char]) => (
                <th key={char}>{char}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Last index</th>
              {entries.map(([char, value]) => (
                <td key={char}>{value}</td>
              ))}
            </tr>
          </tbody>
        </table>
      )}

      <div className="final-summary__connection">
        <h4>How the search uses this table</h4>
        <p>
          At a mismatch at pattern index <code>j</code>, the algorithm
          looks up the last occurrence of the mismatched text character.
          If that character does not occur in the pattern, its last
          occurrence is <code>-1</code>.
        </p>
        <code>
          badCharacterShift = max(1, j - lastOccurrence(c))
        </code>

        {onRunSearch && (
          <button
            type="button"
            className="final-summary__cta"
            onClick={onRunSearch}
          >
            Run Bad Character search with this pattern →
          </button>
        )}
      </div>

      <ShiftCalculator
        pattern={trace.pattern}
        lastOccurrenceTable={trace.table}
      />
    </div>
  );
}

function GoodSuffixSummary({ trace, onRunSearch }) {
  const m = trace.pattern.length;
  const indices = Array.from({ length: m + 1 }, (_, index) => index);

  const lastOccurrenceTable = Object.fromEntries(
    Array.from(trace.pattern).map((char, index) => [char, index])
  );

  return (
    <div className="final-summary">
      <div className="final-summary__head">
        <span className="final-summary__badge">TABLE COMPLETE</span>
        <h3>Good Suffix Table for &quot;{trace.pattern}&quot;</h3>
      </div>

      <table className="final-summary__table final-summary__table--wide">
        <thead>
          <tr>
            <th>j</th>
            {indices.map((index) => (
              <th key={index}>{index}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>shift[j]</th>
            {indices.map((index) => (
              <td key={index}>{trace.shift[index]}</td>
            ))}
          </tr>
          <tr>
            <th>bpos[j]</th>
            {indices.map((index) => (
              <td key={index}>{trace.bpos[index]}</td>
            ))}
          </tr>
        </tbody>
      </table>

      <div className="final-summary__connection">
        <h4>How the search uses this table</h4>
        <p>
          If a mismatch happens at pattern index <code>j</code>, the
          algorithm reads <code>shift[j + 1]</code>. After a complete
          match, it reads <code>shift[0]</code>.
        </p>
        <p>
          Full-match shift:{" "}
          <code>shift[0] = {trace.shift[0]}</code>
        </p>

        {onRunSearch && (
          <button
            type="button"
            className="final-summary__cta"
            onClick={onRunSearch}
          >
            Run Good Suffix search with this pattern →
          </button>
        )}
      </div>

      <ShiftCalculator
        pattern={trace.pattern}
        lastOccurrenceTable={lastOccurrenceTable}
        shiftTable={trace.shift}
      />
    </div>
  );
}
