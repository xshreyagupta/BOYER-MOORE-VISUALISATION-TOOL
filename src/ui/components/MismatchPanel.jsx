import ShiftRace from "./ShiftRace.jsx";
import { getSearchPseudocode } from "../data/pseudocode.js";
import "./MismatchPanel.css";

const WINNER_LABEL = {
  "bad-character": "BAD CHARACTER",
  "good-suffix": "GOOD SUFFIX",
  equal: "BOTH",
};

/**
 * Phase 4 -- Mismatch Freeze panel.
 *
 * Rendered only while playback is frozen at a Full Boyer-Moore mismatch
 * (see usePlayback's `awaitingContinue` / playbackLogic's
 * `isMismatchFreezeState`). Every number shown here is read directly off
 * the frozen execution-trace state -- nothing is recomputed.
 *
 * Walks the student through the fixed reasoning chain:
 *   Mismatch -> Bad Character = X, Good Suffix = Y -> max(X,Y) = Z
 *   -> Winner -> pattern shifts by Z (once CONTINUE is pressed)
 *
 * @param {object} state       the frozen execution-trace state (phase "mismatch")
 * @param {number} stepNumber  0-based index of this state in the trace
 * @param {number} totalSteps  total number of states in the trace
 * @param {() => void} onContinue
 */
export default function MismatchPanel({ state, stepNumber, totalSteps, onContinue }) {
  if (!state) return null;

  const { alignment, i, j, textChar, patternChar, badCharacterShift, goodSuffixShift, chosenShift, winner, pseudocodeLine, explanation } = state;

  // PHASE 7, requirement 9 -- the mismatch freeze is always a Full
  // Boyer-Moore state (see playbackLogic.isMismatchFreezeState), so the
  // shift-selection pseudocode line always comes from the "full" block.
  // `pseudocodeLine` here is read straight off the frozen state -- it's
  // already the "chosenShift <- max(...)" line boyerMoore.js emits at a
  // mismatch, so this needs no separate line lookup logic.
  const shiftSelectionLine = getSearchPseudocode("full")?.lines.find((l) => l.line === pseudocodeLine) ?? null;

  return (
    <div className="mismatch-panel" role="alertdialog" aria-label="Mismatch detected, playback paused">
      <div className="mismatch-panel__head">
        <span className="mismatch-panel__title">MISMATCH DETECTED</span>
        <span className="mismatch-panel__step">
          step {stepNumber + 1} / {totalSteps}
        </span>
      </div>

      <p className="mismatch-panel__detail">
        At alignment <strong>s = {alignment}</strong>, comparing <strong>i = {i}</strong> against{" "}
        <strong>j = {j}</strong>: text character <code>&apos;{textChar}&apos;</code> does not match pattern
        character <code>&apos;{patternChar}&apos;</code>.
      </p>

      <dl className="mismatch-panel__stats">
        <div className="mismatch-panel__stat">
          <dt>Bad Character Shift</dt>
          <dd>{badCharacterShift}</dd>
        </div>
        <div className="mismatch-panel__stat">
          <dt>Good Suffix Shift</dt>
          <dd>{goodSuffixShift}</dd>
        </div>
        <div className="mismatch-panel__stat mismatch-panel__stat--final">
          <dt>Final Shift</dt>
          <dd>{chosenShift}</dd>
        </div>
        <div className="mismatch-panel__stat mismatch-panel__stat--final">
          <dt>Winner</dt>
          <dd>{WINNER_LABEL[winner] ?? winner}</dd>
        </div>
      </dl>

      <ShiftRace
        badCharacterShift={badCharacterShift}
        goodSuffixShift={goodSuffixShift}
        chosenShift={chosenShift}
        winner={winner}
      />

      {shiftSelectionLine && (
        <p className="mismatch-panel__pseudocode">
          <span className="mismatch-panel__pseudocode-tag">line {shiftSelectionLine.line}</span>
          <code>{shiftSelectionLine.text}</code>
        </p>
      )}

      {explanation && <p className="mismatch-panel__explanation">{explanation}</p>}

      <div className="mismatch-panel__actions">
        <span className="mismatch-panel__hint">
          The pattern will shift by {chosenShift} once you continue.
        </span>
        <button type="button" className="mismatch-panel__continue" onClick={onContinue} autoFocus>
          CONTINUE
        </button>
      </div>
    </div>
  );
}
