import { SPEEDS } from "../lib/playbackLogic.js";
import { initAudio } from "../lib/soundEffects.js";
import "./PlaybackControls.css";

/**
 * @param {number} stepIndex
 * @param {number} totalSteps
 * @param {boolean} isPlaying
 * @param {boolean} atStart
 * @param {boolean} atEnd
 * @param {boolean} awaitingContinue
 * @param {number} speed
 * @param {(speed: number) => void} onSpeedChange
 * @param {{first,previous,next,last,play,pause,restart}} actions
 * @param {boolean} [showPseudocode]
 * @param {() => void} [onTogglePseudocode]
 * @param {boolean} [soundEnabled]
 * @param {() => void} [onToggleSound]
 */
export default function PlaybackControls({
  stepIndex,
  totalSteps,
  isPlaying,
  atStart,
  atEnd,
  awaitingContinue = false,
  speed,
  onSpeedChange,
  actions,
  showPseudocode = true,
  onTogglePseudocode,
  soundEnabled = false,
  onToggleSound,
}) {
  const disabled = totalSteps === 0;

  function handleToggleSound() {
    initAudio();
    if (onToggleSound) onToggleSound();
  }

  return (
    <div className="playback">
      <div className="playback__transport" role="group" aria-label="playback transport">
        <button
          type="button"
          className="playback__btn"
          onClick={actions.first}
          disabled={disabled || atStart}
          title="First step"
          aria-label="First step"
        >
          &#8676;
        </button>
        <button
          type="button"
          className="playback__btn"
          onClick={actions.previous}
          disabled={disabled || atStart}
          title="Previous step"
          aria-label="Previous step"
        >
          &#8592;
        </button>

        {isPlaying ? (
          <button
            type="button"
            className="playback__btn playback__btn--primary"
            onClick={actions.pause}
            title="Pause"
            aria-label="Pause"
          >
            &#10073;&#10073; Pause
          </button>
        ) : (
          <button
            type="button"
            className="playback__btn playback__btn--primary"
            onClick={actions.play}
            disabled={disabled || atEnd || awaitingContinue}
            title={
              awaitingContinue
                ? "Resolve the mismatch below to continue"
                : stepIndex > 0 && !atStart
                ? "Resume"
                : "Play"
            }
            aria-label={stepIndex > 0 && !atStart ? "Resume" : "Play"}
          >
            &#9654; {stepIndex > 0 && !atStart ? "Resume" : "Play"}
          </button>
        )}

        <button
          type="button"
          className="playback__btn"
          onClick={actions.next}
          disabled={disabled || atEnd || awaitingContinue}
          title={awaitingContinue ? "Resolve the mismatch below to continue" : "Next step"}
          aria-label="Next step"
        >
          &#8594;
        </button>
        <button
          type="button"
          className="playback__btn"
          onClick={actions.last}
          disabled={disabled || atEnd || awaitingContinue}
          title={awaitingContinue ? "Resolve the mismatch below to continue" : "Last step"}
          aria-label="Last step"
        >
          &#8677;
        </button>
        <button
          type="button"
          className="playback__btn playback__btn--restart"
          onClick={actions.restart}
          disabled={disabled}
          title="Restart"
          aria-label="Restart"
        >
          &#8635; Restart
        </button>
      </div>

      <div className="playback__meta">
        <div className="playback__speeds" role="group" aria-label="playback speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              className={`playback__speed${speed === s ? " playback__speed--active" : ""}`}
              onClick={() => onSpeedChange(s)}
              aria-pressed={speed === s}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="playback__step-count">
          {disabled ? (
            <span>NO TRACE LOADED</span>
          ) : (
            <span>
              STEP {stepIndex + 1} / {totalSteps}
              {awaitingContinue && <span className="playback__frozen-badge">FROZEN &ndash; RESOLVE MISMATCH</span>}
            </span>
          )}
        </div>

        {onTogglePseudocode && (
          <button
            type="button"
            className={`playback__btn playback__btn--pseudocode${!showPseudocode ? " playback__btn--toggled" : ""}`}
            onClick={onTogglePseudocode}
            aria-pressed={!showPseudocode}
            title={showPseudocode ? "Hide Pseudocode" : "Show Pseudocode"}
          >
            <span className="playback__btn-icon" aria-hidden="true">
              {showPseudocode ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </span>
            <span>{showPseudocode ? "Hide Pseudocode" : "Show Pseudocode"}</span>
          </button>
        )}

        {onToggleSound && (
          <button
            type="button"
            className={`playback__btn playback__btn--sound${soundEnabled ? " playback__btn--active" : ""}`}
            onClick={handleToggleSound}
            aria-pressed={soundEnabled}
            title={soundEnabled ? "Mute sound effects" : "Enable tick sound on line change"}
          >
            <span className="playback__btn-icon" aria-hidden="true">
              {soundEnabled ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              )}
            </span>
            <span>{soundEnabled ? "Sound On" : "Sound Off"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
