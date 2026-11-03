import { LEVELS, LEVEL_LABELS, getSectionsByLevel } from "../../../../practice/rulebookContent.js";
import "./RulebookToc.css";

// PHASE 9, requirements 24 & 27 -- progressive-learning order (beginner ->
// control flow -> structure -> Boyer-Moore) exposed as a scannable,
// keyboard-navigable set of anchor links (real <a href="#..."> elements,
// not click handlers) plus a link to the cheat sheet at the end.
export default function RulebookToc() {
  return (
    <nav className="rulebook-toc" aria-label="pseudocode rulebook table of contents">
      {Object.values(LEVELS).map((level) => (
        <div key={level} className="rulebook-toc__group">
          <span className="rulebook-toc__group-label">{LEVEL_LABELS[level]}</span>
          <ul className="rulebook-toc__list">
            {getSectionsByLevel(level).map((section) => (
              <li key={section.id}>
                <a className="rulebook-toc__link" href={`#${section.id}`}>
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="rulebook-toc__group">
        <ul className="rulebook-toc__list">
          <li>
            <a className="rulebook-toc__link" href="#cheat-sheet">
              Syntax Cheat Sheet
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
