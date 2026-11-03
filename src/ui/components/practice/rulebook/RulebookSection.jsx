import RulebookCodeBlock from "./RulebookCodeBlock.jsx";
import PredictOutput from "./PredictOutput.jsx";
import PracticeLinkButton from "./PracticeLinkButton.jsx";
import "./RulebookSection.css";

export default function RulebookSection({ section, onPracticeLink }) {
  const { id, title, explanation, examples, valid, invalid, predict, practiceLink, highlight } = section;

  return (
    <section id={id} className={`rulebook-section${highlight ? " rulebook-section--highlight" : ""}`} aria-labelledby={`${id}-heading`}>
      <h3 id={`${id}-heading`} className="rulebook-section__title">
        {title}
      </h3>
      <p className="rulebook-section__explanation">{explanation}</p>

      {examples.map((ex, i) => (
        <RulebookCodeBlock key={i} code={ex.code} caption={ex.caption} />
      ))}

      {(valid || invalid) && (
        <div className="rulebook-section__valid-invalid">
          {valid && <RulebookCodeBlock code={valid.code} caption={valid.note} tone="valid" />}
          {invalid && <RulebookCodeBlock code={invalid.code} caption={invalid.note} tone="invalid" />}
        </div>
      )}

      {predict && <PredictOutput code={predict.code} question={predict.question} answer={predict.answer} />}

      {practiceLink && <PracticeLinkButton label={practiceLink.label} onClick={() => onPracticeLink(practiceLink.algorithm)} />}
    </section>
  );
}
