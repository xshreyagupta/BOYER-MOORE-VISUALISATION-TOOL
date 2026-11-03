import { useMemo, useState } from "react";
import { run, ALGORITHMS } from "../engine/index.js";
import Controls from "./components/Controls.jsx";
import ComparisonSetup from "./components/ComparisonSetup.jsx";
import ComparisonPanel from "./components/ComparisonPanel.jsx";
import PlaybackControls from "./components/PlaybackControls.jsx";
import MismatchPanel from "./components/MismatchPanel.jsx";
import PreprocessingLab from "./components/PreprocessingLab.jsx";
import PracticeLab from "./components/practice/PracticeLab.jsx";
import Theory from "./components/Theory.jsx";
import { useComparisonPlayback } from "./hooks/useComparisonPlayback.js";
import { usePseudocodeSound } from "./hooks/usePseudocodeSound.js";
import { ALL_THREE_ALGORITHMS, DEFAULT_PAIR_ID, getPairById } from "./lib/comparisonSelectors.js";
import "./App.css";

const DEFAULT_TEXT = "ABCXABCDABXABCDABCDABDE";
const DEFAULT_PATTERN = "ABCD";

// PHASE 6 -- the app now has two top-level modes: the existing search
// visualizer (unchanged, still the default) and the new Preprocessing Lab.
// Nothing about Search mode's behavior changes based on this addition --
// APP_MODES.SEARCH is simply what the app already was.
// PHASE 8 -- adds a third mode, Practice, alongside the two above. Search
// and Preprocessing Tables are completely untouched by this addition.
// PHASE 9 -- adds a fourth mode, Theory, for conceptual comparison and
// complexity analysis. All prior modes are unchanged.
const APP_MODES = Object.freeze({
  SEARCH: "search",
  PREPROCESSING: "preprocessing",
  PRACTICE: "practice",
  THEORY: "theory",
});

export default function App() {
  const [mode, setMode] = useState(APP_MODES.SEARCH);
  const [showPseudocode, setShowPseudocode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  // Live input fields (Phase 2 behavior: editing these doesn't do anything
  // until Run is pressed).
  const [text, setText] = useState(DEFAULT_TEXT);
  const [pattern, setPattern] = useState(DEFAULT_PATTERN);

  // The text/pattern actually driving the current comparison -- only
  // updated by Run, exactly like the pre-Phase-5 `result` state was.
  const [committedText, setCommittedText] = useState(DEFAULT_TEXT);
  const [committedPattern, setCommittedPattern] = useState(DEFAULT_PATTERN);

  // PHASE 5 -- how many screens, and which algorithm(s) fill them.
  const [numScreens, setNumScreens] = useState(1);
  const [singleAlgorithm, setSingleAlgorithm] = useState(ALGORITHMS.FULL);
  const [pairId, setPairId] = useState(DEFAULT_PAIR_ID);

  // Bumped on every Run click, same role as the old `runVersion`: lets the
  // shared playback hook know a genuinely new set of traces exists.
  const [runVersion, setRunVersion] = useState(0);

  function handleRun() {
    setCommittedText(text);
    setCommittedPattern(pattern);
    setRunVersion((v) => v + 1);
  }

  const activeAlgorithms = useMemo(() => {
    if (numScreens === 1) return [singleAlgorithm];
    if (numScreens === 2) return getPairById(pairId).algorithms;
    return ALL_THREE_ALGORITHMS;
  }, [numScreens, singleAlgorithm, pairId]);

  // One trace-run per visible algorithm, all against the SAME committed
  // text/pattern -- this is the "same input, same comparison context"
  // requirement. Traces may (and often do) end up different lengths;
  // nothing here assumes otherwise.
  const panelResults = useMemo(
    () =>
      activeAlgorithms.map((algorithm) => ({
        algorithm,
        ...run(algorithm, committedText, committedPattern),
      })),
    [activeAlgorithms, committedText, committedPattern]
  );

  // Changing the algorithm(s) on screen is, from playback's point of view,
  // just as much a "new trace set" as pressing Run -- reset to step 0 for
  // either.
  const resetKey = `${runVersion}:${activeAlgorithms.join(",")}`;

  const { playback, panelViews, freezeState, sharedTotalSteps } = useComparisonPlayback({
    panelResults,
    resetKey,
  });
  const { stepIndex, awaitingContinue } = playback;

  // Active highlighted pseudocode line(s) in current panel views.
  // Changes to this trigger the subtle tick sound if soundEnabled is true.
  const activeLineKey = useMemo(
    () => panelViews.map((p) => p.state?.pseudocodeLine ?? "-").join(":"),
    [panelViews]
  );

  usePseudocodeSound({
    soundEnabled,
    activeLineKey,
    resetKey,
    stepIndex,
  });

  // Every panel validates the same (text, pattern) through the same
  // validateInput, so a validation error is identical across panels --
  // showing the first is enough.
  const error = panelResults[0]?.error ?? null;

  // Preprocessing Lab's "Run ... search with this pattern" hands off into
  // Search mode: same pattern, matching single-algorithm screen, existing
  // text untouched, and a fresh run so playback starts at step 0.
  function handleRunSearchFromLab(labPattern, algorithm) {
    setPattern(labPattern);
    setCommittedPattern(labPattern);
    setNumScreens(1);
    setSingleAlgorithm(algorithm);
    setRunVersion((v) => v + 1);
    setMode(APP_MODES.SEARCH);
  }

  return (
    <div className="app">
      <header className="app__header-bar">
        <div className="app__brand">
          <span className="app__eyebrow">Boyer &ndash; Moore</span>
          <h1 className="app__title">
            Interactive String-Matching <span className="app__title-accent">Laboratory</span>
          </h1>
        </div>

        <nav className="app__mode-toggle" role="group" aria-label="lab mode">
          <button
            type="button"
            className={`app__mode-btn${mode === APP_MODES.SEARCH ? " app__mode-btn--active" : ""}`}
            onClick={() => setMode(APP_MODES.SEARCH)}
            aria-pressed={mode === APP_MODES.SEARCH}
          >
            Search
          </button>
          <button
            type="button"
            className={`app__mode-btn${mode === APP_MODES.PREPROCESSING ? " app__mode-btn--active" : ""}`}
            onClick={() => setMode(APP_MODES.PREPROCESSING)}
            aria-pressed={mode === APP_MODES.PREPROCESSING}
          >
            Preprocessing Tables
          </button>
          <button
            type="button"
            className={`app__mode-btn${mode === APP_MODES.PRACTICE ? " app__mode-btn--active" : ""}`}
            onClick={() => setMode(APP_MODES.PRACTICE)}
            aria-pressed={mode === APP_MODES.PRACTICE}
          >
            Practice Lab
          </button>
          <button
            type="button"
            className={`app__mode-btn${mode === APP_MODES.THEORY ? " app__mode-btn--active" : ""}`}
            onClick={() => setMode(APP_MODES.THEORY)}
            aria-pressed={mode === APP_MODES.THEORY}
          >
            Theory
          </button>
        </nav>
      </header>

      {mode === APP_MODES.PREPROCESSING ? (
        <main className="app__main">
          <PreprocessingLab onRunSearch={handleRunSearchFromLab} />
        </main>
      ) : mode === APP_MODES.PRACTICE ? (
        <main className="app__main">
          <PracticeLab />
        </main>
      ) : mode === APP_MODES.THEORY ? (
        <main className="app__main">
          <Theory />
        </main>
      ) : (
      <main className="app__main">
        <div className="app__controls-row">
          <Controls
            text={text}
            pattern={pattern}
            onTextChange={setText}
            onPatternChange={setPattern}
            onRun={handleRun}
            error={error}
          />

          <ComparisonSetup
            numScreens={numScreens}
            singleAlgorithm={singleAlgorithm}
            pairId={pairId}
            onNumScreensChange={setNumScreens}
            onSingleAlgorithmChange={setSingleAlgorithm}
            onPairIdChange={setPairId}
          />
        </div>

        <PlaybackControls
          stepIndex={playback.stepIndex}
          totalSteps={playback.totalSteps}
          isPlaying={playback.isPlaying}
          atStart={playback.atStart}
          atEnd={playback.atEnd}
          awaitingContinue={awaitingContinue}
          speed={playback.speed}
          onSpeedChange={playback.setSpeed}
          actions={playback.actions}
          showPseudocode={showPseudocode}
          onTogglePseudocode={() => setShowPseudocode((prev) => !prev)}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((prev) => !prev)}
        />

        <section
          className={`app__comparison-grid app__comparison-grid--${panelViews.length}`}
          aria-label="algorithm comparison"
        >
          {panelViews.map((panel) => (
            <ComparisonPanel
              key={panel.algorithm}
              algorithm={panel.algorithm}
              text={committedText}
              pattern={committedPattern}
              state={panel.state}
              previousState={panel.previousState}
              confirmedMatches={panel.confirmedMatches}
              ownStepIndex={panel.ownStepIndex}
              ownTotalSteps={panel.ownTotalSteps}
              finishedEarly={panel.finishedEarly}
              showPseudocode={showPseudocode}
            />
          ))}
        </section>

        {awaitingContinue && freezeState && (
          <MismatchPanel
            state={freezeState}
            stepNumber={stepIndex}
            totalSteps={sharedTotalSteps}
            onContinue={playback.actions.continueFromMismatch}
          />
        )}
      </main>
      )}
    </div>
  );
}
