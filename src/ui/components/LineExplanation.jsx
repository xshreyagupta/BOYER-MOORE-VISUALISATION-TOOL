import "./LineExplanation.css";

/**
 * PHASE 7, requirement 8 -- "Clickable pseudocode": once a student clicks a
 * pseudocode line, show a short, plain-English answer to "what is this
 * line doing?" The note text itself comes from pseudocode.js's
 * `lineNotes` (see getLineNote in pseudocodeSelectors.js) -- never
 * generated here.
 *
 * @param {number|null} lineNumber   the selected line, or null if none selected
 * @param {string|null} lineText     that line's code text, for the header
 * @param {string|null} note         the explanation text
 */
export default function LineExplanation({ lineNumber, lineText, note }) {
  if (lineNumber === null || !note) return null;

  return (
    <div className="line-explanation">
      <div className="line-explanation__head">
        <span className="line-explanation__eyebrow">line {lineNumber}</span>
        {lineText && <code className="line-explanation__code">{lineText}</code>}
      </div>
      <p className="line-explanation__text">{note}</p>
    </div>
  );
}
