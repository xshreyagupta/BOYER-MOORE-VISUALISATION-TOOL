import {
  getBadCharacterCellStatus,
  getGoodSuffixShiftCellStatus,
  getGoodSuffixBposCellStatus,
} from "../lib/preprocessingSelectors.js";
import "./TableView.css";

/**
 * Requirement 9, "Progressive table updates": renders the table being
 * built, live, at whatever point `step` represents. Column layout is
 * fixed up front (the distinct pattern characters for Bad Character, or
 * indices 0..m for Good Suffix) so cells fill in in place rather than the
 * table reflowing as preprocessing proceeds -- every cell status comes
 * straight from preprocessingSelectors, which reads only `step`.
 *
 * @param {{ algorithm: "bad-character", pattern: string, table: object }} [badCharacterTrace]
 * @param {{ algorithm: "good-suffix", pattern: string, shift: number[], bpos: number[] }} [goodSuffixTrace]
 * @param {object|null} step  current trace step (must belong to the same trace as the one being rendered)
 */
export default function TableView({ trace, step }) {
  if (!trace) {
    return (
      <div className="table-view table-view--empty">
        <span>No trace loaded yet.</span>
      </div>
    );
  }

  return trace.algorithm === "bad-character" ? (
    <BadCharacterTable trace={trace} step={step} />
  ) : (
    <GoodSuffixTable trace={trace} step={step} />
  );
}

function BadCharacterTable({ trace, step }) {
  const chars = Object.keys(trace.table).sort();

  if (chars.length === 0) {
    return (
      <div className="table-view">
        <div className="table-view__title">Last-Occurrence Table (Bad Character)</div>
        <p className="table-view__empty-note">Pattern is empty -- table has no entries.</p>
      </div>
    );
  }

  return (
    <div className="table-view">
      <div className="table-view__title">Last-Occurrence Table (Bad Character)</div>
      <div className="tv-grid" style={{ gridTemplateColumns: `repeat(${chars.length}, minmax(48px, 1fr))` }}>
        <div className="tv-grid__row">
          {chars.map((c) => (
            <div key={c} className="tv-grid__header">
              {c}
            </div>
          ))}
        </div>
        <div className="tv-grid__row">
          {chars.map((c) => {
            const status = getBadCharacterCellStatus(step, c);
            const value = step?.tableSnapshot?.[c];
            return (
              <div key={c} className={`tv-cell tv-cell--${status}`}>
                {value !== undefined ? value : "\u2013"}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GoodSuffixTable({ trace, step }) {
  const m = trace.pattern.length;
  const indices = Array.from({ length: m + 1 }, (_, i) => i);

  return (
    <div className="table-view">
      <div className="table-view__title">Good Suffix Table (shift / bpos)</div>
      <div className="tv-grid" style={{ gridTemplateColumns: `72px repeat(${indices.length}, minmax(40px, 1fr))` }}>
        <div className="tv-grid__row">
          <div className="tv-grid__corner">j</div>
          {indices.map((i) => (
            <div key={i} className="tv-grid__header">
              {i}
            </div>
          ))}
        </div>
        <div className="tv-grid__row">
          <div className="tv-grid__rowlabel">shift</div>
          {indices.map((i) => {
            const status = getGoodSuffixShiftCellStatus(step, i);
            const value = step?.shiftSnapshot?.[i];
            return (
              <div key={i} className={`tv-cell tv-cell--${status}`}>
                {status === "unset" ? "\u2013" : value}
              </div>
            );
          })}
        </div>
        <div className="tv-grid__row">
          <div className="tv-grid__rowlabel">bpos</div>
          {indices.map((i) => {
            const status = getGoodSuffixBposCellStatus(step, i);
            const value = step?.bposSnapshot?.[i];
            return (
              <div key={i} className={`tv-cell tv-cell--${status}`}>
                {status === "unset" ? "\u2013" : value}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
