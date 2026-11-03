import CharacterCell from "./CharacterCell.jsx";
import IndexRuler from "./IndexRuler.jsx";
import { getTextCellStatus } from "../lib/traceSelectors.js";
import "./TextRenderer.css";

/**
 * Renders the search text as a fixed row of aligned character cells.
 * This track never moves -- the pattern track slides underneath it.
 *
 * @param {string} text
 * @param {object|null} state          current execution-trace state
 * @param {number} patternLength
 * @param {number[]} confirmedMatches  start indices of matches found so far
 */
export default function TextRenderer({ text, state, patternLength, confirmedMatches }) {
  return (
    <div className="text-renderer">
      <IndexRuler length={text.length} />
      <div className="text-renderer__track" aria-label="search text">
        {text.length === 0 ? (
          <div className="text-renderer__empty">(empty text)</div>
        ) : (
          Array.from(text).map((char, i) => (
            <CharacterCell
              key={i}
              char={char}
              index={i}
              status={getTextCellStatus(state, i, patternLength, confirmedMatches)}
            />
          ))
        )}
      </div>
    </div>
  );
}
