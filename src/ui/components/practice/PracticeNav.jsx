
import "./PracticeNav.css";

export const PRACTICE_SECTIONS = Object.freeze({
  RULEBOOK: "rulebook",
  WRITE: "write",
  TEST: "test",
  SIMULATOR: "simulator",
});

const SECTION_LABELS = Object.freeze({
  [PRACTICE_SECTIONS.RULEBOOK]: "Pseudocode Rulebook",
  [PRACTICE_SECTIONS.WRITE]: "Write Pseudocode",
  [PRACTICE_SECTIONS.TEST]: "Test Yourself",
  [PRACTICE_SECTIONS.SIMULATOR]: "Interactive Simulator",
});

export default function PracticeNav({ section, onSectionChange }) {
  return (
    <div className="practice-nav" role="group" aria-label="practice lab section">
      {Object.values(PRACTICE_SECTIONS).map((id) => (
        <button
          key={id}
          type="button"
          className={`practice-nav__btn${
            section === id ? " practice-nav__btn--active" : ""
          }`}
          onClick={() => onSectionChange(id)}
          aria-pressed={section === id}
        >
          {SECTION_LABELS[id]}
        </button>
      ))}
    </div>
  );
}
