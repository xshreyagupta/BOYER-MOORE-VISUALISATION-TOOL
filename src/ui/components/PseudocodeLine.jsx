import "./PseudocodeLine.css";

/**
 * PHASE 7, requirement 3/8 -- one line of a pseudocode block.
 *
 * `active` (this trace state's own `pseudocodeLine`) and `selected` (the
 * line the student last clicked, for the "what is this line doing?"
 * explanation) are independent and rendered differently: active is the
 * amber "this is executing right now" highlight; selected is a persistent
 * outline so the clicked line stays visually marked while its explanation
 * is shown below the panel.
 *
 * @param {number} number      1-based pseudocode line number
 * @param {string} text        the code text for this line
 * @param {number} indent      nesting depth, purely visual
 * @param {boolean} active     true if this is the currently-executing line
 * @param {boolean} selected   true if the student clicked this line
 * @param {() => void} onSelect
 */
export default function PseudocodeLine({ number, text, indent, active, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`pseudocode-line${active ? " pseudocode-line--active" : ""}${
        selected ? " pseudocode-line--selected" : ""
      }`}
      style={{ "--pseudocode-indent": indent }}
      onClick={onSelect}
      aria-pressed={selected}
      aria-current={active ? "step" : undefined}
    >
      <span className="pseudocode-line__number">{number}</span>
      <span className="pseudocode-line__text">{text}</span>
    </button>
  );
}
