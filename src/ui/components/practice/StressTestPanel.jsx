// StressTestPanel -- "Stress Test My Algorithm" / "Find Counterexample"
//
// Runs the bounded counterexample generator against the student's ALREADY-
// SUBMITTED pseudocode (the source that produced `lastResult`).
//
// Props:
//   source:       string          -- the student's pseudocode source
//   algorithm:    string          -- ALGORITHMS.* constant
//   lastResult:   object | null   -- the executeSource result from the last Run
//   onLoadCase:   function({ text, pattern }) -- loads a pair into the editor
//
// The generator runs synchronously inside a setTimeout(0) so React can
// repaint the "Searching…" state before work begins.  It never touches eval
// or arbitrary JS execution.

import { useState, useRef } from "react";
import { findCounterexample } from "../../../practice/counterexampleGenerator.js";
import { ALGORITHM_LABELS } from "./PracticeSetup.jsx";
import "./StressTestPanel.css";

const STATUS = Object.freeze({
  IDLE: "idle",
  RUNNING: "running",
  DONE_FOUND: "done-found",
  DONE_CLEAN: "done-clean",
  ABORTED: "aborted",
});

function formatMatches(arr) {
  if (!arr || arr.length === 0) return "No match";
  return arr.join(", ");
}

function KindBadge({ kind }) {
  const labels = {
    "execution-failure": "Execution Failure",
    "wrong-matches": "Wrong Match Positions",
    "trace-divergence": "Incorrect Intermediate Value",
  };
  return (
    <span className={`stress-badge stress-badge--${kind}`}>
      {labels[kind] ?? kind}
    </span>
  );
}

function DivergenceDetail({ divergence }) {
  if (!divergence || !divergence.diverged) return null;

  return (
    <div className="stress-divergence">
      <div className="stress-divergence__title">First Behavioral Divergence</div>

      {divergence.line != null && (
        <div className="stress-divergence__line">Source line: {divergence.line}</div>
      )}

      {(divergence.studentValue !== undefined ||
        divergence.expectedValue !== undefined) && (
        <div className="stress-divergence__values">
          <span className="stress-divergence__val stress-divergence__val--student">
            Your value: <strong>{String(divergence.studentValue ?? "--")}</strong>
          </span>
          <span className="stress-divergence__val stress-divergence__val--expected">
            Expected: <strong>{String(divergence.expectedValue ?? "--")}</strong>
          </span>
        </div>
      )}

      <p className="stress-divergence__message">
        {divergence.studentMessage ?? divergence.message}
      </p>
    </div>
  );
}

export default function StressTestPanel({
  source,
  algorithm,
  lastResult,
  onLoadCase,
}) {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [searchResult, setSearchResult] = useState(null);
  const cancelRef = useRef(false);

  // Guard: only run if there is a valid, completed or runtime-error
  // result — the student must have already pressed RUN MY PSEUDOCODE.
  const canRun =
    source &&
    lastResult &&
    lastResult.status !== "invalid" &&
    status !== STATUS.RUNNING;

  function handleStart() {
    if (!canRun) return;

    setStatus(STATUS.RUNNING);
    setSearchResult(null);
    cancelRef.current = false;

    // Defer the actual work so React can paint the "Searching…" UI first.
    setTimeout(() => {
      if (cancelRef.current) return;

      const result = findCounterexample(source, algorithm, {
        maxTotalCases: 300,
        searchTimeMs: 4000,
        maxStepsPerExec: 3000,
        minimise: true,
      });

      if (cancelRef.current) return;

      setSearchResult(result);
      setStatus(result.found ? STATUS.DONE_FOUND : STATUS.DONE_CLEAN);
    }, 0);
  }

  function handleLoadCounterexample() {
    const ce = searchResult?.counterexample;
    if (!ce || typeof onLoadCase !== "function") return;
    onLoadCase({ text: ce.text, pattern: ce.pattern });
  }

  const algorithmLabel = ALGORITHM_LABELS[algorithm] ?? algorithm;

  return (
    <div className="stress-panel">
      <div className="stress-panel__header">
        <span className="stress-panel__eyebrow">Counterexample Search</span>
        <h3 className="stress-panel__title">Stress Test My Algorithm</h3>
        <p className="stress-panel__desc">
          Automatically search for a (text, pattern) pair where your{" "}
          <strong>{algorithmLabel}</strong> pseudocode disagrees with the
          reference implementation. Tests up to 300 cases including all
          predefined test cases and short generated strings.
        </p>
      </div>

      <div className="stress-panel__controls">
        <button
          type="button"
          className="stress-panel__btn stress-panel__btn--primary"
          onClick={handleStart}
          disabled={!canRun}
          title={
            !lastResult
              ? "Run your pseudocode first before stress-testing it."
              : lastResult.status === "invalid"
              ? "Fix validation errors before stress-testing."
              : undefined
          }
        >
          {status === STATUS.RUNNING
            ? "Searching\u2026"
            : "FIND COUNTEREXAMPLE"}
        </button>

        {!lastResult && (
          <span className="stress-panel__hint">
            Press "RUN MY PSEUDOCODE" first.
          </span>
        )}
      </div>

      {/* ── Running indicator ─────────────────────────────────── */}
      {status === STATUS.RUNNING && (
        <div className="stress-panel__running" aria-live="polite">
          <span className="stress-panel__spinner" aria-hidden="true" />
          Searching up to 300 cases…
        </div>
      )}

      {/* ── Clean result ──────────────────────────────────────── */}
      {status === STATUS.DONE_CLEAN && searchResult && (
        <div className="stress-panel__clean" role="status" aria-live="polite">
          <div className="stress-panel__clean-title">✓ No counterexample found</div>
          <p className="stress-panel__clean-body">
            Checked <strong>{searchResult.casesChecked}</strong> case
            {searchResult.casesChecked === 1 ? "" : "s"} (
            {searchResult.phases.join(" → ")}).
            {searchResult.timedOut
              ? " Search timed out — the budget was exhausted."
              : ""}
            {" "}No counterexample was found within this search budget. This
            does not guarantee formal correctness — only that this bounded
            search did not find a failing case.
          </p>
        </div>
      )}

      {/* ── Counterexample found ──────────────────────────────── */}
      {status === STATUS.DONE_FOUND && searchResult?.counterexample && (
        <div className="stress-panel__found" role="alert" aria-live="assertive">
          <div className="stress-panel__found-header">
            <div className="stress-panel__found-title">⚠ Counterexample Found</div>
            <KindBadge kind={searchResult.counterexample.kind} />
          </div>

          <p className="stress-panel__found-meta">
            Found after checking{" "}
            <strong>{searchResult.casesChecked}</strong> case
            {searchResult.casesChecked === 1 ? "" : "s"} (
            {searchResult.phases.join(" → ")}).
            {searchResult.testCaseName
              ? ` Failed on predefined test "${searchResult.testCaseName}".`
              : " Failed on a generated case."}
          </p>

          {/* The failing pair */}
          <div className="stress-panel__pair">
            <div className="stress-pair-field">
              <span className="stress-pair-field__label">Text</span>
              <code className="stress-pair-field__value">
                {searchResult.counterexample.text || "(empty)"}
              </code>
            </div>
            <div className="stress-pair-field">
              <span className="stress-pair-field__label">Pattern</span>
              <code className="stress-pair-field__value">
                {searchResult.counterexample.pattern || "(empty)"}
              </code>
            </div>
          </div>

          {/* Expected vs actual output */}
          {searchResult.counterexample.kind === "wrong-matches" && (
            <div className="stress-panel__comparison">
              <div className="stress-comparison-row stress-comparison-row--expected">
                <span className="stress-comparison-row__label">Expected matches</span>
                <code className="stress-comparison-row__value">
                  {formatMatches(searchResult.counterexample.referenceMatches)}
                </code>
              </div>
              <div className="stress-comparison-row stress-comparison-row--actual">
                <span className="stress-comparison-row__label">Your matches</span>
                <code className="stress-comparison-row__value">
                  {formatMatches(searchResult.counterexample.studentMatches)}
                </code>
              </div>
            </div>
          )}

          {searchResult.counterexample.kind === "execution-failure" && (
            <div className="stress-panel__exec-failure">
              <p className="stress-panel__exec-failure-msg">
                {searchResult.counterexample.description}
              </p>
              {searchResult.counterexample.studentResult?.error && (
                <p className="stress-panel__exec-error-detail">
                  {searchResult.counterexample.studentResult.error.studentMessage ??
                    searchResult.counterexample.studentResult.error.message}
                </p>
              )}
            </div>
          )}

          {/* Description / first divergence */}
          <p className="stress-panel__description">
            {searchResult.counterexample.description}
          </p>

          <DivergenceDetail
            divergence={searchResult.counterexample.divergence}
          />

          {/* Load button */}
          <button
            type="button"
            className="stress-panel__btn stress-panel__btn--load"
            onClick={handleLoadCounterexample}
          >
            LOAD THIS EXAMPLE → Visualize
          </button>

          <p className="stress-panel__load-hint">
            Loading this example will set the text and pattern inputs above
            and re-run your pseudocode on them, so you can step through the
            failing execution.
          </p>
        </div>
      )}
    </div>
  );
}
