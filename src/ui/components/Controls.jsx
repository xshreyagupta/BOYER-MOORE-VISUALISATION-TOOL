import "./Controls.css";

/**
 * PHASE 5 note: the single "Algorithm" select that used to live here was
 * superseded by ComparisonSetup.jsx, which picks 1-3 algorithms (screens)
 * to run side by side instead of one at a time. Text/Pattern/Run/error
 * stay exactly as they were in Phase 2/3/4 -- unrelated to which
 * algorithm(s) get run against them.
 */
export default function Controls({ text, pattern, onTextChange, onPatternChange, onRun, error }) {
  return (
    <div className="controls">
      <div className="controls__inputs">
        <label className="controls__field">
          <span>Text</span>
          <input
            type="text"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            spellCheck={false}
            placeholder="e.g. ABCABCABCD"
          />
        </label>
        <label className="controls__field">
          <span>Pattern</span>
          <input
            type="text"
            value={pattern}
            onChange={(e) => onPatternChange(e.target.value)}
            spellCheck={false}
            placeholder="e.g. ABCD"
          />
        </label>
        <button className="controls__run" onClick={onRun} type="button">
          Run
        </button>
      </div>

      {error && <div className="controls__error">{error}</div>}
    </div>
  );
}
