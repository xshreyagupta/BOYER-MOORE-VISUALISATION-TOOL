
import { useEffect, useState } from "react";
import { ALGORITHMS } from "../../../engine/index.js";
import {
  buildLastOccurrenceTable,
  lastOccurrence,
  buildGoodSuffixTable,
} from "../../../algorithms/preprocessing.js";
import "./InteractiveSimulator.css";

const INITIAL_TEXT = "ABCXABCD";
const INITIAL_PATTERN = "ABCD";

function getMode(algorithm) {
  if (algorithm === ALGORITHMS.BAD_CHARACTER) return "bad-character";
  if (algorithm === ALGORITHMS.GOOD_SUFFIX) return "good-suffix";
  return "full";
}

function analyzeAlignment(text, pattern, alignment, mode) {
  const lastTable = buildLastOccurrenceTable(pattern);
  const { shift: goodSuffixTable } = buildGoodSuffixTable(pattern);
  const comparisons = [];

  for (let j = pattern.length - 1; j >= 0; j--) {
    const textIndex = alignment + j;
    const matched = pattern[j] === text[textIndex];

    comparisons.push({
      patternIndex: j,
      textIndex,
      matched,
    });

    if (!matched) {
      const mismatchCharacter = text[textIndex];
      const lastIndex = lastOccurrence(lastTable, mismatchCharacter);

      const badCharacterShift = Math.max(1, j - lastIndex);
      const goodSuffixShift = goodSuffixTable[j + 1];

      let shift;

      if (mode === "bad-character") {
        shift = badCharacterShift;
      } else if (mode === "good-suffix") {
        shift = goodSuffixShift;
      } else {
        shift = Math.max(badCharacterShift, goodSuffixShift);
      }

      return {
        matched: false,
        comparisons,
        mismatchIndex: j,
        mismatchCharacter,
        lastIndex,
        matchedSuffix: pattern.slice(j + 1),
        badCharacterShift,
        goodSuffixShift,
        shift,
      };
    }
  }

  return { matched: true, comparisons };
}

export default function InteractiveSimulator({
  algorithm,
  text: sharedText,
  pattern: sharedPattern,
  onTextChange,
  onPatternChange,
}) {
  const mode = getMode(algorithm);

  const modeTitle = {
    "bad-character": "Bad Character Simulator",
    "good-suffix": "Good Suffix Simulator",
    full: "Complete Boyer–Moore Simulator",
  }[mode];

  const [localText, setLocalText] = useState(INITIAL_TEXT);
  const [localPattern, setLocalPattern] = useState(INITIAL_PATTERN);

  const text = sharedText ?? localText;
  const pattern = sharedPattern ?? localPattern;

  const [alignment, setAlignment] = useState(0);
  const [pendingAlignment, setPendingAlignment] = useState(null);
  const [draggedPatternIndex, setDraggedPatternIndex] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("");
  const [iterations, setIterations] = useState(1);
  const [finished, setFinished] = useState(false);

  // Detailed explanations are optional and hidden by default.
  const [showExplanation, setShowExplanation] = useState(false);

  const maxAlignment = text.length - pattern.length;

  const validInput =
    text.length > 0 &&
    pattern.length > 0 &&
    pattern.length <= text.length;

  const displayAlignment = pendingAlignment ?? alignment;

  const analysis = validInput
    ? analyzeAlignment(text, pattern, alignment, mode)
    : null;

  const isEndBeyondText =
    analysis &&
    !analysis.matched &&
    alignment + analysis.shift > maxAlignment;

  function resetSimulator() {
    setAlignment(0);
    setPendingAlignment(null);
    setDraggedPatternIndex(null);
    setFeedback("");
    setFeedbackType("");
    setIterations(1);
    setFinished(false);
  }

  useEffect(() => {
    resetSimulator();
  }, [algorithm, text, pattern]);

  function updateText(value) {
    if (onTextChange) {
      onTextChange(value);
    } else {
      setLocalText(value);
    }
  }

  function updatePattern(value) {
    if (onPatternChange) {
      onPatternChange(value);
    } else {
      setLocalPattern(value);
    }
  }

  function handleDragStart(event, patternIndex) {
    setDraggedPatternIndex(patternIndex);
    event.dataTransfer.setData("text/plain", String(patternIndex));
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDrop(event, textIndex) {
    event.preventDefault();

    const rawIndex = event.dataTransfer.getData("text/plain");
    const patternIndex =
      rawIndex === "" ? draggedPatternIndex : Number(rawIndex);

    if (patternIndex === null || !Number.isInteger(patternIndex)) {
      return;
    }

    const targetAlignment = textIndex - patternIndex;

    if (targetAlignment < 0 || targetAlignment > maxAlignment) {
      setFeedback(
        "Keep the entire pattern within the text. Drop the block at a valid alignment."
      );
      setFeedbackType("error");
      return;
    }

    setPendingAlignment(targetAlignment);
    setFeedback("");
    setFeedbackType("");
  }

  function checkMove() {
    if (!analysis || analysis.matched || finished) return;

    if (isEndBeyondText) {
      setFinished(true);
      setFeedback(
        `Correct! The next shift is ${analysis.shift} position(s), beyond the last valid alignment.`
      );
      setFeedbackType("success");
      return;
    }

    if (pendingAlignment === null) {
      setFeedback(
        "Drag a pattern block onto a text block to choose the next alignment."
      );
      setFeedbackType("error");
      return;
    }

    const expectedAlignment = alignment + analysis.shift;

    if (pendingAlignment !== expectedAlignment) {
      setFeedback(
        `Not quite. The correct shift for ${modeTitle} is ${analysis.shift}. Try again.`
      );
      setFeedbackType("error");
      return;
    }

    setAlignment(expectedAlignment);
    setPendingAlignment(null);
    setIterations((previous) => previous + 1);
    setFeedback(
      `Correct! You shifted ${analysis.shift} position(s). Compare from right to left again.`
    );
    setFeedbackType("success");
  }

  const comparisonByTextIndex = new Map(
    (analysis?.comparisons ?? []).map((item) => [
      item.textIndex,
      item,
    ])
  );

  const comparisonByPatternIndex = new Map(
    (analysis?.comparisons ?? []).map((item) => [
      item.patternIndex,
      item,
    ])
  );

  return (
    <section className="interactive-simulator">
      <header className="simulator-header">
        <p className="simulator-eyebrow">HANDS-ON PRACTICE</p>
        <h2>{modeTitle}</h2>
        <p>
          Drag a pattern block to position the pattern. Work out the shift
          using the selected algorithm and check your move at every iteration.
        </p>
      </header>

      <div className="simulator-inputs">
        <label>
          Text
          <input
            value={text}
            onChange={(event) => updateText(event.target.value)}
            spellCheck={false}
            disabled={finished}
          />
        </label>

        <label>
          Pattern
          <input
            value={pattern}
            onChange={(event) => updatePattern(event.target.value)}
            spellCheck={false}
            disabled={finished}
          />
        </label>

        <button
          type="button"
          className="simulator-secondary-btn"
          onClick={() => {
            updateText(INITIAL_TEXT);
            updatePattern(INITIAL_PATTERN);
            resetSimulator();
            setShowExplanation(false);
          }}
        >
          Reset Example
        </button>
      </div>

      {!validInput && (
        <p className="simulator-feedback is-error" role="alert">
          Enter a non-empty pattern that is no longer than the text.
        </p>
      )}

      {validInput && (
        <>
          <div className="simulator-stats">
            <span>Iteration: {iterations}</span>
            <span>Current alignment: {alignment}</span>
            <span>Pattern length: {pattern.length}</span>
          </div>

          <div className="simulator-board">
            <div className="simulator-row-label">TEXT</div>

            <div className="simulator-text-track">
              {Array.from(text).map((character, index) => {
                const comparison = comparisonByTextIndex.get(index);

                return (
                  <div
                    key={`text-${index}`}
                    className={[
                      "simulator-block",
                      "simulator-text-block",
                      comparison?.matched ? "is-match" : "",
                      comparison && !comparison.matched
                        ? "is-mismatch"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(event, index)}
                    title={`Text index ${index}. Drop a pattern block here.`}
                  >
                    <span className="simulator-block-character">
                      {character}
                    </span>
                    <span className="simulator-block-index">{index}</span>
                  </div>
                );
              })}
            </div>

            <div className="simulator-pattern-area">
              <div className="simulator-row-label">PATTERN</div>

              <div className="simulator-pattern-track">
                {Array.from(pattern).map((character, index) => {
                  const comparison =
                    comparisonByPatternIndex.get(index);

                  return (
                    <div
                      key={`pattern-${index}`}
                      draggable={!finished && !analysis?.matched}
                      onDragStart={(event) =>
                        handleDragStart(event, index)
                      }
                      onDragEnd={() => setDraggedPatternIndex(null)}
                      className={[
                        "simulator-block",
                        "simulator-pattern-block",
                        comparison?.matched ? "is-match" : "",
                        comparison && !comparison.matched
                          ? "is-mismatch"
                          : "",
                        draggedPatternIndex === index
                          ? "is-dragging"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{
                        left: `calc(${displayAlignment} * 52px)`,
                      }}
                      title={`Drag ${character}, pattern index ${index}`}
                    >
                      <span className="simulator-block-character">
                        {character}
                      </span>
                      <span className="simulator-block-index">
                        {index}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="simulator-drag-hint">
              ↔ Drag a pattern character and drop it over a text character.
              All pattern blocks move together.
            </p>
          </div>

          {analysis.matched ? (
            <div className="simulator-feedback is-success" role="status">
              <strong>Pattern found!</strong>
              <p>
                All {pattern.length} characters matched at text index{" "}
                {alignment}.
              </p>
              <button
                type="button"
                className="simulator-primary-btn"
                onClick={resetSimulator}
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="simulator-analysis">
              <h3>Current iteration analysis</h3>

              <p>
                Compare from right to left. The mismatch is at pattern index{" "}
                <strong>{analysis.mismatchIndex}</strong>:{" "}
                <strong>{pattern[analysis.mismatchIndex]}</strong> does not
                match text character{" "}
                <strong>{analysis.mismatchCharacter}</strong>.
              </p>

              <label className="simulator-explanation-toggle">
                <input
                  type="checkbox"
                  checked={showExplanation}
                  onChange={(event) =>
                    setShowExplanation(event.target.checked)
                  }
                />
                <span>Show detailed shift explanation</span>
              </label>

              {showExplanation && (
                <>
                  <div className="simulator-rule-grid">
                    {(mode === "bad-character" || mode === "full") && (
                      <div className="simulator-rule-card">
                        <span>Bad Character shift</span>
                        <strong>{analysis.badCharacterShift}</strong>
                        <small>
                          Mismatching text character:{" "}
                          <strong>{analysis.mismatchCharacter}</strong>.
                          Rightmost occurrence in pattern:{" "}
                          <strong>{analysis.lastIndex}</strong>.
                          <br />
                          Shift = max(1, {analysis.mismatchIndex} − (
                          {analysis.lastIndex})) ={" "}
                          <strong>{analysis.badCharacterShift}</strong>.
                        </small>
                      </div>
                    )}

                    {(mode === "good-suffix" || mode === "full") && (
                      <div className="simulator-rule-card">
                        <span>Good Suffix shift</span>
                        <strong>{analysis.goodSuffixShift}</strong>
                        <small>
                          Matched suffix:{" "}
                          <strong>
                            {analysis.matchedSuffix || "(empty suffix)"}
                          </strong>
                          . <br />
                          The preprocessing table gives shift[
                          {analysis.mismatchIndex + 1}] ={" "}
                          <strong>{analysis.goodSuffixShift}</strong>.
                        </small>
                      </div>
                    )}
                  </div>

                  <div className="simulator-required-shift">
                    <span>
                      {mode === "full"
                        ? "Final shift"
                        : mode === "bad-character"
                          ? "Bad Character shift to apply"
                          : "Good Suffix shift to apply"}
                    </span>

                    <strong>
                      {mode === "full"
                        ? `max(${analysis.badCharacterShift}, ${analysis.goodSuffixShift}) = ${analysis.shift}`
                        : `${analysis.shift} position(s)`}
                    </strong>
                  </div>
                </>
              )}

              {isEndBeyondText && (
                <p className="simulator-end-hint">
                  The next correct shift passes the last valid alignment.
                  Confirm to finish the search.
                </p>
              )}

              {feedback && (
                <p
                  className={`simulator-feedback ${
                    feedbackType === "success"
                      ? "is-success"
                      : "is-error"
                  }`}
                  role="status"
                >
                  {feedback}
                </p>
              )}

              <div className="simulator-actions">
                <button
                  type="button"
                  className="simulator-primary-btn"
                  onClick={checkMove}
                  disabled={
                    finished ||
                    (!isEndBeyondText && pendingAlignment === null)
                  }
                >
                  {isEndBeyondText
                    ? "Confirm End of Search"
                    : "Check Move"}
                </button>

                <button
                  type="button"
                  className="simulator-secondary-btn"
                  onClick={resetSimulator}
                >
                  Restart
                </button>
              </div>
            </div>
          )}

          {finished && (
            <div className="simulator-feedback is-success" role="status">
              <strong>Search complete!</strong>
              <p>
                You completed {iterations} alignment(s). Restart to practise
                again.
              </p>
              <button
                type="button"
                className="simulator-primary-btn"
                onClick={resetSimulator}
              >
                Try Again
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
