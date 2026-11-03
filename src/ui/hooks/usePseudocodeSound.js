import { useEffect, useRef } from "react";
import { playTickSound } from "../lib/soundEffects.js";

/**
 * Monitors the active pseudocode line(s) during animation playback and
 * manual stepping, playing a subtle tick sound via Web Audio API whenever
 * the highlighted line changes.
 *
 * Requirements enforced:
 * - Plays only when soundEnabled is true.
 * - Plays tick only when the highlighted line actually changes.
 * - No repeated sounds when the line remains unchanged.
 * - Works during auto-play and manual stepping (Forward/Backward).
 * - Pausing stops further sounds naturally.
 * - Resetting (Restart, new Run, algorithm change) generates zero spurious sounds.
 * - If pseudocode is hidden, sound continues to follow execution state.
 *
 * @param {object} options
 * @param {boolean} options.soundEnabled
 * @param {string|number|null} options.activeLineKey  the current highlighted line identifier
 * @param {*} options.resetKey                        trace reset identifier
 * @param {number} options.stepIndex                  current playback step index
 */
export function usePseudocodeSound({
  soundEnabled,
  activeLineKey,
  resetKey,
  stepIndex,
}) {
  const prevLineRef = useRef(activeLineKey);
  const skipNextSoundRef = useRef(true);
  const prevStepIndexRef = useRef(stepIndex);
  const prevResetKeyRef = useRef(resetKey);

  // When resetKey changes (e.g. new Run or algorithm change), suppress sound
  useEffect(() => {
    if (prevResetKeyRef.current !== resetKey) {
      prevResetKeyRef.current = resetKey;
      skipNextSoundRef.current = true;
      prevLineRef.current = activeLineKey;
    }
  }, [resetKey, activeLineKey]);

  // When step resets to 0 (Restart or First button), suppress spurious sound
  useEffect(() => {
    if (stepIndex === 0 && prevStepIndexRef.current !== 0) {
      skipNextSoundRef.current = true;
      prevLineRef.current = activeLineKey;
    }
    prevStepIndexRef.current = stepIndex;
  }, [stepIndex, activeLineKey]);

  // Trigger tick when active highlighted line changes
  useEffect(() => {
    if (!soundEnabled) {
      prevLineRef.current = activeLineKey;
      return;
    }

    // Skip the first event after mount, reset, or restart
    if (skipNextSoundRef.current) {
      skipNextSoundRef.current = false;
      prevLineRef.current = activeLineKey;
      return;
    }

    // Play tick only when activeLineKey genuinely changed and is valid
    if (
      activeLineKey != null &&
      activeLineKey !== "" &&
      activeLineKey !== "-" &&
      activeLineKey !== prevLineRef.current
    ) {
      playTickSound();
    }

    prevLineRef.current = activeLineKey;
  }, [soundEnabled, activeLineKey]);
}
