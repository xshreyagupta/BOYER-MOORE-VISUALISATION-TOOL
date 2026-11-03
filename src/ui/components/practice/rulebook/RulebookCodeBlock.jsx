import "./RulebookCodeBlock.css";

// PHASE 9 -- reuses the same dark, mono-font "code block" look
// PseudocodePanel already established (see PseudocodePanel.css) so rulebook
// examples read as the same visual language as the rest of the app, not a
// new one. `tone` adds a colored left border using the existing
// match/mismatch tokens for VALID/INVALID examples; plain examples render
// with no tone.
export default function RulebookCodeBlock({ code, caption, tone = null }) {
  return (
    <div className={`rulebook-code${tone ? ` rulebook-code--${tone}` : ""}`}>
      {tone && <span className="rulebook-code__tag">{tone === "valid" ? "VALID" : "INVALID"}</span>}
      <pre className="rulebook-code__pre">{code}</pre>
      {caption && <p className="rulebook-code__caption">{caption}</p>}
    </div>
  );
}
