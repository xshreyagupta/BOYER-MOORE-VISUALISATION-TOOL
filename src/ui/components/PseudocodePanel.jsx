import { useEffect, useState } from "react";
import PseudocodeLine from "./PseudocodeLine.jsx";
import LineExplanation from "./LineExplanation.jsx";
import { getLineNote } from "../lib/pseudocodeSelectors.js";
import "./PseudocodePanel.css";

/**
 * PHASE 7, requirements 1-4 & 8 -- "Synchronized Pseudocode".
 *
 * Renders one algorithm's pseudocode (from src/ui/data/pseudocode.js) and
 * highlights whichever line `activeLine` names. `activeLine` is never
 * computed here -- it's read straight off the current execution-trace
 * state's own `pseudocodeLine` field by the caller, so this panel
 * synchronizes with playback for free: whatever step usePlayback/
 * useComparisonPlayback/useTablePlayback is currently showing already
 * determines `activeLine`, including while playback is frozen at a
 * mismatch (requirement 9) -- the frozen state's `pseudocodeLine` simply
 * stays put until CONTINUE is pressed, same as every other value derived
 * from that state.
 *
 * Clicking a line (requirement 8) is local UI state -- it doesn't affect
 * playback or any other panel. Selection resets whenever the algorithm
 * changes (new pseudocode block) so a stale line number from a previous
 * block can never appear selected against different code.
 *
 * @param {string} algorithm            e.g. "bad-character" | "good-suffix" | "full"
 * @param {{title: string, lines: Array, lineNotes: object}|null} pseudocode
 * @param {number|null} activeLine      pseudocodeLine of the current trace state
 */
export default function PseudocodePanel({ algorithm, pseudocode, activeLine }) {
  const [selectedLine, setSelectedLine] = useState(null);

  // A different algorithm's pseudocode is a different set of lines --
  // don't leave a line from the old block marked selected.
  useEffect(() => {
    setSelectedLine(null);
  }, [algorithm]);

  if (!pseudocode) {
    return (
      <div className="pseudocode-panel pseudocode-panel--empty">
        <span className="pseudocode-panel__eyebrow">Pseudocode</span>
        <p className="pseudocode-panel__idle">No pseudocode available for this mode.</p>
      </div>
    );
  }

  const selectedText = selectedLine !== null ? pseudocode.lines.find((l) => l.line === selectedLine)?.text ?? null : null;
  const selectedNote = getLineNote(pseudocode, selectedLine);

  return (
    <div className="pseudocode-panel">
      <div className="pseudocode-panel__head">
        <span className="pseudocode-panel__eyebrow">Pseudocode</span>
        <span className="pseudocode-panel__title">{pseudocode.title}</span>
      </div>

      <div className="pseudocode-panel__lines" role="group" aria-label={`${pseudocode.title} pseudocode, click a line for an explanation`}>
        {pseudocode.lines.map((l) => (
          <PseudocodeLine
            key={l.line}
            number={l.line}
            text={l.text}
            indent={l.indent}
            active={activeLine === l.line}
            selected={selectedLine === l.line}
            onSelect={() => setSelectedLine((prev) => (prev === l.line ? null : l.line))}
          />
        ))}
      </div>

      <LineExplanation lineNumber={selectedLine} lineText={selectedText} note={selectedNote} />
    </div>
  );
}
