import CharacterCell from "./CharacterCell.jsx";
import { getPatternCellStatus } from "../lib/traceSelectors.js";
import { CELL_STRIDE } from "../lib/layoutMetrics.js";
import "./PatternRenderer.css";

/**
 * Renders the pattern as a row of aligned character cells that slides
 * horizontally to sit under its current alignment `s` in the text above.
 *
 * @param {string} pattern
 * @param {object|null} state   current execution-trace state
 */
export default function PatternRenderer({ pattern, state }) {
  const alignment = state ? state.alignment : 0;
  const offsetPx = alignment * CELL_STRIDE;

  return (
    <div className="pattern-renderer">
      <div className="pattern-renderer__rail">
        <div
          className="pattern-renderer__track"
          style={{ transform: `translateX(${offsetPx}px)` }}
          aria-label="pattern"
        >
          {pattern.length === 0 ? (
            <div className="pattern-renderer__empty">(empty pattern)</div>
          ) : (
            Array.from(pattern).map((char, j) => (
              <CharacterCell
                key={j}
                char={char}
                index={j}
                showIndex
                status={getPatternCellStatus(state, j)}
              />
            ))
          )}
        </div>
      </div>
      <div className="pattern-renderer__caption">
        pattern, aligned at <strong>s&nbsp;=&nbsp;{alignment}</strong>
      </div>
    </div>
  );
}
