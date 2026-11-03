import { CHEAT_SHEET } from "../../../../practice/rulebookContent.js";
import "./RulebookCheatSheet.css";

// PHASE 9, requirement 22 -- compact reference, easy to scan while writing
// pseudocode. Deliberately terse: no explanation prose, just label + exact
// syntax, in a dense grid.
export default function RulebookCheatSheet() {
  return (
    <section id="cheat-sheet" className="rulebook-cheat-sheet" aria-labelledby="cheat-sheet-heading">
      <h3 id="cheat-sheet-heading" className="rulebook-cheat-sheet__title">
        Syntax Cheat Sheet
      </h3>
      <div className="rulebook-cheat-sheet__grid">
        {CHEAT_SHEET.map((entry) => (
          <div key={entry.label} className="rulebook-cheat-sheet__entry">
            <span className="rulebook-cheat-sheet__label">{entry.label}</span>
            <pre className="rulebook-cheat-sheet__code">{entry.code}</pre>
          </div>
        ))}
      </div>
    </section>
  );
}
