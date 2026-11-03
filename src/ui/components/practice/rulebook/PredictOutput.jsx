import { useState } from "react";
import RulebookCodeBlock from "./RulebookCodeBlock.jsx";
import "./PredictOutput.css";

// PHASE 9, requirement 23 -- "small educational interactions are fine",
// explicitly NOT the full pseudocode editor. This is a tiny predict-then-
// reveal quiz: show a snippet, ask a question, let the student reveal the
// answer when ready. No input parsing, no grading -- just a toggle.
export default function PredictOutput({ code, question, answer }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="predict-output">
      <span className="predict-output__eyebrow">Try it</span>
      <RulebookCodeBlock code={code} />
      <p className="predict-output__question">{question}</p>
      {revealed ? (
        <p className="predict-output__answer">
          Answer: <strong>{answer}</strong>
        </p>
      ) : (
        <button type="button" className="predict-output__reveal" onClick={() => setRevealed(true)}>
          REVEAL ANSWER
        </button>
      )}
    </div>
  );
}
