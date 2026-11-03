import { CATEGORY_LABELS } from "../../../pseudocode/firstDivergence.js";
 
import "./FirstErrorPanel.css";
 
// PHASE 13 -- Displays ONLY the first meaningful behavioral divergence
// found by findFirstDivergence().
//
// Props:
//   divergence:
//     {
//       diverged: boolean,
//       studentStep?: number,
//       referenceStep?: number,
//       line?: number | null,
//       category?: string,
//       studentValue?: any,
//       expectedValue?: any,
//       message?: string,
//       studentMessage?: string,
//       haltedByRuntimeError?: boolean,
//     }
//
//   onGoToError:
//     function(studentStep)
//
// No scoring, grading, hints, analytics, or extra feedback.
 
function formatValue(value) {
  if (value === null || value === undefined) {
    return "--";
  }
 
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
 
  return String(value);
}
 
function formatCategory(category) {
  if (!category) {
    return null;
  }
 
  // Reuses firstDivergence.js's own CATEGORY_LABELS rather than keeping a
  // second, independently-maintained copy of the same label strings.
  return CATEGORY_LABELS[category] ?? category;
}
 
export default function FirstErrorPanel({
  divergence,
  onGoToError,
}) {
  if (!divergence) {
    return null;
  }
 
  // No behavioral divergence.
  if (!divergence.diverged) {
    // A runtime error/step-limit is already shown by ExecutionResultPanel.
    // Don't add another "no divergence" message when execution stopped.
    if (divergence.haltedByRuntimeError) {
      return null;
    }
 
    return (
      <div
        className="first-error-panel"
        aria-live="polite"
      >
        <div className="first-error-panel__title">
          NO ERROR DETECTED
        </div>
 
        <p className="first-error-panel__message">
          No behavioral divergence detected.
        </p>
      </div>
    );
  }
 
  const hasStudentValue =
    divergence.studentValue !== undefined;
 
  const hasExpectedValue =
    divergence.expectedValue !== undefined;
 
  const category =
    formatCategory(divergence.category);
 
  const canGoToError =
    typeof divergence.studentStep ===
      "number" &&
    typeof onGoToError === "function";
 
  return (
    <div
      className="first-error-panel"
      role="alert"
      aria-live="assertive"
    >
      <div className="first-error-panel__title">
        FIRST ERROR
      </div>
 
      {divergence.line != null && (
        <div className="first-error-panel__line">
          Line {divergence.line}
        </div>
      )}
 
      {category && (
        <div className="first-error-panel__category">
          {category}
        </div>
      )}
 
      {(hasStudentValue ||
        hasExpectedValue) && (
        <div className="first-error-panel__values">
          {hasStudentValue && (
            <div className="first-error-panel__value">
              <span className="first-error-panel__value-label">
                Your value
              </span>
 
              <span className="first-error-panel__value-amount">
                {formatValue(
                  divergence.studentValue
                )}
              </span>
            </div>
          )}
 
          {hasExpectedValue && (
            <div className="first-error-panel__value">
              <span className="first-error-panel__value-label">
                Expected
              </span>
 
              <span className="first-error-panel__value-amount">
                {formatValue(
                  divergence.expectedValue
                )}
              </span>
            </div>
          )}
        </div>
      )}
 
      {(divergence.studentMessage ||
        divergence.message) && (
        <p className="first-error-panel__message">
          {divergence.studentMessage ??
            divergence.message}
        </p>
      )}
 
      {canGoToError && (
        <button
          type="button"
          className="first-error-panel__goto"
          onClick={() =>
            onGoToError(
              divergence.studentStep
            )
          }
        >
          GO TO ERROR
        </button>
      )}
    </div>
  );
}