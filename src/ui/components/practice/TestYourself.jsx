
import { useEffect, useState } from "react";

const QUESTION_BANKS = {
  "bad-character": [
    {
      topic: "Bad Character",
      question:
        "Pattern = ABCD. At index j = 3, D mismatches with X. X is absent from the pattern. What is the shift?",
      options: ["1 position", "2 positions", "3 positions", "4 positions"],
      answer: 3,
      explanation:
        "The pattern length is 4 and last(X) = -1. Shift = max(1, j - last(X)) = max(1, 3 - (-1)) = 4 positions.",
    },
    {
      topic: "Bad Character",
      question:
        "Pattern = ABCD. At index j = 3, D mismatches with B. The rightmost B is at index 1. What is the shift?",
      options: ["1 position", "2 positions", "3 positions", "4 positions"],
      answer: 1,
      explanation:
        "Shift = max(1, j - last(B)) = max(1, 3 - 1) = 2 positions.",
    },
    {
      topic: "Last Occurrence Table",
      question:
        "Pattern = ABACA. What is the last occurrence index of A?",
      options: ["0", "2", "4", "-1"],
      answer: 2,
      explanation:
        "Using zero-based indexing, the rightmost A is at index 4. The correct answer is 4.",
    },
    {
      topic: "Bad Character",
      question:
        "Pattern = ABCD. A mismatch occurs at index j = 2 with character C. The rightmost C is at index 2. What is the shift?",
      options: ["0 positions", "1 position", "2 positions", "3 positions"],
      answer: 1,
      explanation:
        "Shift = max(1, j - last(C)) = max(1, 2 - 2) = 1. The algorithm must shift at least one position.",
    },
    {
      topic: "Bad Character",
      question:
        "Pattern = ABCD. A mismatch occurs at index j = 2 with character A. The rightmost A is at index 0. What is the shift?",
      options: ["1 position", "2 positions", "3 positions", "4 positions"],
      answer: 1,
      explanation:
        "Shift = max(1, j - last(A)) = max(1, 2 - 0) = 2 positions.",
    },
    {
      topic: "Preprocessing",
      question:
        "Why do we build a last occurrence table before searching?",
      options: [
        "To sort the pattern",
        "To record each character's rightmost pattern index",
        "To count all text characters",
        "To reverse the pattern",
      ],
      answer: 1,
      explanation:
        "The table stores the rightmost occurrence of each character in the pattern. It lets us calculate the bad-character shift efficiently.",
    },
  ],

  "good-suffix": [
    {
      topic: "Good Suffix",
      question:
        "Two characters at the end of the pattern matched before a mismatch. The preprocessed Good Suffix table gives a shift of 3. What shift does this rule suggest?",
      options: ["1 position", "2 positions", "3 positions", "4 positions"],
      answer: 2,
      explanation:
        "Use the shift supplied by the Good Suffix table for the matched suffix. Here, the suggested shift is 3 positions.",
    },
    {
      topic: "Good Suffix",
      question:
        "A mismatch occurs at pattern index j = 2, after the suffix 'DE' has matched. Which entry of the shift table is used?",
      options: ["shift[0]", "shift[1]", "shift[2]", "shift[3]"],
      answer: 3,
      explanation:
        "When the mismatch is at index j, this implementation uses shift[j + 1]. For j = 2, the entry is shift[3].",
    },
    {
      topic: "Good Suffix",
      question:
        "What is the main purpose of the Good Suffix heuristic?",
      options: [
        "To shift based only on the mismatching text character",
        "To use the suffix that matched to determine a safe shift",
        "To compare the pattern from left to right",
        "To sort the characters in the pattern",
      ],
      answer: 1,
      explanation:
        "Good Suffix uses the already-matched suffix to find another compatible occurrence or a matching pattern prefix, allowing a safe shift.",
    },
    {
      topic: "Good Suffix",
      question:
        "Suppose the Good Suffix table gives shift[2] = 4. A mismatch occurs at j = 1. What shift does this implementation use?",
      options: ["1 position", "2 positions", "3 positions", "4 positions"],
      answer: 3,
      explanation:
        "The lookup is shift[j + 1]. With j = 1, the algorithm reads shift[2], whose value is 4.",
    },
    {
      topic: "Good Suffix",
      question:
        "If the entire pattern matches successfully, which Good Suffix table entry determines the next shift?",
      options: ["shift[0]", "shift[1]", "shift[m - 1]", "bpos[0]"],
      answer: 0,
      explanation:
        "After a complete match, this implementation uses shift[0] to determine how far to move before continuing the search.",
    },
    {
      topic: "Preprocessing",
      question:
        "Why is Good Suffix preprocessing useful?",
      options: [
        "It calculates suffix-related shifts before searching",
        "It removes duplicate text characters",
        "It guarantees every shift equals one",
        "It eliminates the need to compare characters",
      ],
      answer: 0,
      explanation:
        "Preprocessing builds information about suffixes and borders so the search can calculate shifts without rebuilding that information at every mismatch.",
    },
  ],

  full: [
    {
      topic: "Bad Character",
      question:
        "Pattern = ABCD. At index j = 3, D mismatches with X. X is absent from the pattern. What is the bad-character shift?",
      options: ["1 position", "2 positions", "3 positions", "4 positions"],
      answer: 3,
      explanation:
        "Bad-character shift = max(1, j - last(X)) = max(1, 3 - (-1)) = 4 positions.",
    },
    {
      topic: "Good Suffix",
      question:
        "The Good Suffix table suggests a shift of 3 for the current mismatch. What is the Good Suffix shift?",
      options: ["1 position", "2 positions", "3 positions", "4 positions"],
      answer: 2,
      explanation:
        "The Good Suffix heuristic suggests exactly the value provided by its table: 3 positions.",
    },
    {
      topic: "Choosing a Rule",
      question:
        "Bad Character suggests a shift of 2, while Good Suffix suggests 4. What does complete Boyer–Moore choose?",
      options: ["2 positions", "4 positions", "6 positions", "1 position"],
      answer: 1,
      explanation:
        "Complete Boyer–Moore takes the larger shift: max(2, 4) = 4. The shifts are not added.",
    },
    {
      topic: "Both Rules Compete",
      question:
        "Bad Character suggests a shift of 5 and Good Suffix suggests 2. What is the final shift?",
      options: ["2 positions", "3 positions", "5 positions", "7 positions"],
      answer: 2,
      explanation:
        "The final shift is max(5, 2) = 5 positions.",
    },
    {
      topic: "Both Rules Compete",
      question:
        "Bad Character suggests a shift of 1, while Good Suffix suggests 6. What is the final shift?",
      options: ["1 position", "5 positions", "6 positions", "7 positions"],
      answer: 2,
      explanation:
        "The algorithm chooses max(1, 6) = 6 positions, using the larger of the two valid shifts.",
    },
    {
      topic: "Algorithm Comparison",
      question:
        "Why does complete Boyer–Moore combine both heuristics?",
      options: [
        "To always shift by one position",
        "To use the larger valid shift suggested by the two rules",
        "To add both shift values",
        "To stop checking the pattern after the first mismatch",
      ],
      answer: 1,
      explanation:
        "At a mismatch, complete Boyer–Moore selects max(bad-character shift, good-suffix shift). It does not add the shifts.",
    },
  ],
};

export default function TestYourself({ algorithm = "full" }) {
  const questions = QUESTION_BANKS[algorithm] ?? QUESTION_BANKS.full;

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setAnswers([]);
    setFinished(false);
  }, [algorithm]);

  const question = questions[index];
  const score = answers.filter((answer) => answer.correct).length;

  const algorithmName =
    algorithm === "bad-character"
      ? "Bad Character"
      : algorithm === "good-suffix"
        ? "Good Suffix"
        : "Complete Boyer–Moore";

  function checkAnswer() {
    if (selected === null || checked) return;

    setAnswers((previous) => [
      ...previous,
      {
        selected,
        correct: selected === question.answer,
      },
    ]);

    setChecked(true);
  }

  function nextQuestion() {
    if (index === questions.length - 1) {
      setFinished(true);
      return;
    }

    setIndex((previous) => previous + 1);
    setSelected(null);
    setChecked(false);
  }

  function retry() {
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setAnswers([]);
    setFinished(false);
  }

  if (finished) {
    return (
      <section className="test-yourself">
        <div className="test-yourself__header">
          <p className="test-yourself__eyebrow">TRACE-BASED QUIZ</p>
          <h2 className="test-yourself__title">Quiz complete!</h2>
          <p className="test-yourself__intro">
            {algorithmName} — Your score: {score}/{questions.length}
          </p>
        </div>

        <div className="test-yourself__review">
          <h3>Worked answer review</h3>

          {questions.map((item, i) => (
            <article
              className="test-yourself__review-item"
              key={`${item.topic}-${i}`}
            >
              <p className="test-yourself__review-question">
                {i + 1}. {item.question}
              </p>

              <p className="test-yourself__review-answer">
                Correct answer:{" "}
                <strong>{item.options[item.answer]}</strong>
              </p>

              <p className="test-yourself__explanation">
                {item.explanation}
              </p>
            </article>
          ))}
        </div>

        <button className="test-yourself__primary-btn" onClick={retry}>
          Try Again
        </button>
      </section>
    );
  }

  return (
    <section className="test-yourself">
      <div className="test-yourself__header">
        <p className="test-yourself__eyebrow">TRACE-BASED QUIZ</p>
        <h2 className="test-yourself__title">Test Yourself</h2>
        <p className="test-yourself__intro">
          {algorithmName}: practise its rules, calculate shifts, and understand
          why each answer is correct.
        </p>
      </div>

      <div className="test-yourself__progress-row">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <span>{score} correct so far</span>
      </div>

      <div className="test-yourself__progress-track">
        <div
          className="test-yourself__progress-fill"
          style={{
            width: `${((index + 1) / questions.length) * 100}%`,
          }}
        />
      </div>

      <div className="test-yourself__question-card">
        <span className="test-yourself__topic">{question.topic}</span>
        <h3 className="test-yourself__question">{question.question}</h3>

        <div className="test-yourself__options">
          {question.options.map((option, i) => (
            <button
              key={option}
              type="button"
              className={[
                "test-yourself__option",
                selected === i ? "is-selected" : "",
                checked && i === question.answer ? "is-correct" : "",
                checked && selected === i && i !== question.answer
                  ? "is-incorrect"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => !checked && setSelected(i)}
              disabled={checked}
            >
              <span className="test-yourself__option-letter">
                {String.fromCharCode(65 + i)}
              </span>
              <span>{option}</span>
            </button>
          ))}
        </div>

        {checked && (
          <div
            className={`test-yourself__feedback ${
              selected === question.answer ? "is-correct" : "is-incorrect"
            }`}
          >
            <strong>
              {selected === question.answer ? "Correct!" : "Not quite."}
            </strong>
            <p>{question.explanation}</p>
          </div>
        )}

        <div className="test-yourself__actions">
          {!checked ? (
            <button
              className="test-yourself__primary-btn"
              onClick={checkAnswer}
              disabled={selected === null}
            >
              Check Answer
            </button>
          ) : (
            <button
              className="test-yourself__primary-btn"
              onClick={nextQuestion}
            >
              {index === questions.length - 1
                ? "See Results"
                : "Next Question"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
