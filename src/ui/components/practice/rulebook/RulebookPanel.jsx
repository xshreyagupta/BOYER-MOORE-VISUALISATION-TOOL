import { RULEBOOK_SECTIONS } from "../../../../practice/rulebookContent.js";
import RulebookToc from "./RulebookToc.jsx";
import RulebookSection from "./RulebookSection.jsx";
import RulebookCheatSheet from "./RulebookCheatSheet.jsx";
import "./RulebookPanel.css";

// PHASE 9 -- Pseudocode Rulebook.
//
// Purely educational: a table of contents, every syntax section in
// progressive-learning order, and a cheat sheet at the end. No parser, no
// validator, no execution -- see rulebookContent.js's header comment.
// `onPracticeLink(algorithm)` is passed down from PracticeLab so a section's
// "[ PRACTICE THIS ]" button can switch to the Write Pseudocode tab
// (optionally pre-selecting an algorithm) without this component knowing
// anything about PracticeLab's own state.
export default function RulebookPanel({ onPracticeLink }) {
  return (
    <div className="rulebook-panel">
      <p className="rulebook-panel__intro">
        The exact pseudocode syntax the Practice Lab accepts, from basic variables up to Boyer-Moore-specific rules like combined shifts.
      </p>

      <RulebookToc />

      <div className="rulebook-panel__sections">
        {RULEBOOK_SECTIONS.map((section) => (
          <RulebookSection key={section.id} section={section} onPracticeLink={onPracticeLink} />
        ))}
      </div>

      <RulebookCheatSheet />
    </div>
  );
}
