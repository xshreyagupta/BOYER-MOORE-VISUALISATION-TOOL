import { useRef } from "react";
import "./CodeEditor.css";

/**
 * Generic line-numbered, syntax-neutral text editor used throughout the
 * Practice Lab. Originally written for the (now-abandoned) Monaco/
 * multi-language code practice track, but nothing about its implementation
 * is Monaco- or language-specific -- it just exposes `value`, `onChange`,
 * `language` (a display label shown in the topbar), `readOnly`, and an
 * optional `hint` (short status text shown next to the label). That made it
 * a straightforward carry-over into the student pseudocode track: Phase 10
 * (Pseudocode Editor + Validation) is expected to render this same
 * component with `language="Pseudocode"` and per-line validation state
 * layered on top, rather than building a new editor from scratch.
 */
export default function CodeEditor({ value, onChange, language, readOnly = false, hint = null }) {
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);

  const lineCount = value.split("\n").length;

  function handleScroll(e) {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.target.scrollTop;
    }
  }

  // Basic editing quality-of-life: Tab inserts two spaces instead of moving
  // focus out of the editor.
  function handleKeyDown(e) {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = textareaRef.current;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = `${value.slice(0, start)}  ${value.slice(end)}`;
      onChange(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  }

  return (
    <div className="code-editor">
      <div className="code-editor__topbar">
        <span className="code-editor__language">{language}</span>
        {hint && <span className="code-editor__hint">{hint}</span>}
      </div>
      <div className="code-editor__body">
        <div className="code-editor__gutter" ref={gutterRef} aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="code-editor__line-number">
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          className="code-editor__textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          readOnly={readOnly}
          aria-label="code editor"
        />
      </div>
    </div>
  );
}
