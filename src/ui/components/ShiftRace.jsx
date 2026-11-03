import "./ShiftRace.css";

/**
 * Visual "race" between the two heuristics at a Full Boyer-Moore mismatch:
 * a horizontal bar per heuristic, sized relative to the larger of the two
 * proposed shifts, followed by the max(...) calculation and the winner.
 *
 * Purely a rendering of data that already exists on the execution-trace
 * mismatch state (badCharacterShift, goodSuffixShift, chosenShift, winner)
 * -- nothing here computes or guesses a shift value.
 *
 * @param {number} badCharacterShift
 * @param {number} goodSuffixShift
 * @param {number} chosenShift
 * @param {"bad-character"|"good-suffix"|"equal"} winner
 */
export default function ShiftRace({ badCharacterShift, goodSuffixShift, chosenShift, winner }) {
  const scale = Math.max(badCharacterShift, goodSuffixShift, 1);
  const bcPercent = Math.max((badCharacterShift / scale) * 100, 6);
  const gsPercent = Math.max((goodSuffixShift / scale) * 100, 6);

  const bcWins = winner === "bad-character";
  const gsWins = winner === "good-suffix";
  const isEqual = winner === "equal";

  return (
    <div className="shift-race">
      <RaceLane
        label="Bad Character"
        value={badCharacterShift}
        percent={bcPercent}
        isWinner={bcWins || isEqual}
      />
      <RaceLane
        label="Good Suffix"
        value={goodSuffixShift}
        percent={gsPercent}
        isWinner={gsWins || isEqual}
      />

      <div className="shift-race__formula">
        <span className="shift-race__formula-expr">
          max({badCharacterShift}, {goodSuffixShift}) = <strong>{chosenShift}</strong>
        </span>
        <span className={`shift-race__winner shift-race__winner--${winner}`}>
          Winner:{" "}
          {isEqual ? "BOTH (equal shifts)" : bcWins ? "BAD CHARACTER" : "GOOD SUFFIX"}
        </span>
      </div>
    </div>
  );
}

function RaceLane({ label, value, percent, isWinner }) {
  return (
    <div className={`shift-race__lane${isWinner ? " shift-race__lane--winner" : ""}`}>
      <div className="shift-race__lane-head">
        <span className="shift-race__lane-label">{label}</span>
        <span className="shift-race__lane-value">{value}</span>
      </div>
      <div className="shift-race__track">
        <div className="shift-race__bar" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
