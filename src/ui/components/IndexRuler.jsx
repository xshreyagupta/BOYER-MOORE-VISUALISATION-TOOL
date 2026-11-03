import "./IndexRuler.css";

/**
 * A row of tick marks + index numbers aligned above the text cells.
 * Purely presentational -- width must match the character-cell track.
 */
export default function IndexRuler({ length }) {
  return (
    <div className="ruler" role="presentation">
      {Array.from({ length }, (_, i) => (
        <div className="ruler__tick" key={i}>
          <span className="ruler__label">{i}</span>
          <span className="ruler__mark" />
        </div>
      ))}
    </div>
  );
}
