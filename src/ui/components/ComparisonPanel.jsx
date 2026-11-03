
import { useEffect, useRef } from "react";
import TextRenderer from "./TextRenderer.jsx";
import PatternRenderer from "./PatternRenderer.jsx";
import ReadoutBar from "./ReadoutBar.jsx";
import ExplanationPanel from "./ExplanationPanel.jsx";
import PseudocodePanel from "./PseudocodePanel.jsx";
import VariableTracker from "./VariableTracker.jsx";
import { getSearchPseudocode } from "../data/pseudocode.js";
import { CELL_STRIDE } from "../lib/layoutMetrics.js";
import "./ComparisonPanel.css";

const ALGORITHM_LABELS = {
  "bad-character": "Bad Character",
  "good-suffix": "Good Suffix",
  full: "Full Boyer-Moore",
};

export default function ComparisonPanel({
  algorithm,
  text,
  pattern,
  state,
  confirmedMatches,
  ownStepIndex,
  ownTotalSteps,
  finishedEarly,
  previousState,
  showPseudocode = true,
}) {
  const visualScrollRef = useRef(null);

  // Keep the current pattern alignment visible during playback.
  useEffect(() => {
    const viewport = visualScrollRef.current;
    if (!viewport || !text.length) return;

    const alignment = Math.max(0, state?.alignment ?? 0);

    // Keep approximately two character cells before the alignment
    // whenever possible, so learners can see the surrounding text.
    const targetScroll = Math.max(
      0,
      alignment * CELL_STRIDE - 2 * CELL_STRIDE
    );

    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    viewport.scrollLeft = Math.min(targetScroll, Math.max(0, maxScroll));
  }, [state?.alignment, text.length, pattern.length]);

  return (
    <section
      className="comparison-panel"
      aria-label={`${ALGORITHM_LABELS[algorithm] ?? algorithm} panel`}
    >
      <header className="comparison-panel__head">
        <span className="comparison-panel__label">
          {ALGORITHM_LABELS[algorithm] ?? algorithm}
        </span>

        <span className="comparison-panel__step">
          {ownTotalSteps > 0 ? (
            <>
              step {ownStepIndex + 1} / {ownTotalSteps}
              {finishedEarly && (
                <span className="comparison-panel__done-badge">DONE</span>
              )}
            </>
          ) : (
            "no trace"
          )}
        </span>
      </header>

      <div
        className={`comparison-panel__body${
          showPseudocode ? " comparison-panel__body--with-code" : ""
        }`}
      >
        <div className="comparison-panel__main">
          <div className="comparison-panel__stage">
            <div
              className="comparison-panel__visual-scroll"
              ref={visualScrollRef}
              aria-label="Scrollable string matching visualization"
            >
              <div className="comparison-panel__visual-content">
                <TextRenderer
                  text={text}
                  state={state}
                  patternLength={pattern.length}
                  confirmedMatches={confirmedMatches}
                />

                <PatternRenderer pattern={pattern} state={state} />
              </div>
            </div>
          </div>

          <ReadoutBar state={state} />

          <VariableTracker
            variables={state?.variables}
            previousVariables={previousState?.variables}
            stepKey={ownStepIndex}
          />

          <ExplanationPanel
            state={state}
            stepNumber={ownTotalSteps > 0 ? ownStepIndex : null}
            totalSteps={ownTotalSteps > 0 ? ownTotalSteps : null}
          />
        </div>

        <div
          className="comparison-panel__code"
          style={{ display: showPseudocode ? undefined : "none" }}
          aria-hidden={!showPseudocode}
        >
          <PseudocodePanel
            algorithm={algorithm}
            pseudocode={getSearchPseudocode(algorithm)}
            activeLine={state?.pseudocodeLine ?? null}
          />
        </div>
      </div>
    </section>
  );
}
