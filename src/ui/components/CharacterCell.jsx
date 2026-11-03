import "./CharacterCell.css";

/**
 * A single aligned character cell.
 *
 * status values:
 *  - "idle"        default resting state
 *  - "dim"         outside the pattern's current window (text only)
 *  - "settled"     already compared-and-matched earlier in this attempt
 *  - "active"      the exact cell being compared right now (i or j)
 *  - "match"       this comparison was a match
 *  - "mismatch"    this comparison was a mismatch
 *  - "confirmed"   part of a fully confirmed match span (persists)
 */
export default function CharacterCell({ char, index, status = "idle", showIndex = false }) {
  return (
    <div className={`cc cc--${status}`} data-index={index}>
      {showIndex && <span className="cc__index">{index}</span>}
      <span className="cc__char">{char}</span>
    </div>
  );
}
