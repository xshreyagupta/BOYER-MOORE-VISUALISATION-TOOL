/**
 * Lightweight Web Audio API click/tick sound generator for algorithm visualization.
 * No external sound files or dependencies.
 */

let audioCtx = null;
let lastTickTime = 0;

/**
 * Initializes or resumes the AudioContext in response to a user interaction.
 */
export function initAudio() {
  try {
    if (typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
  } catch {
    // Gracefully ignore audio initialization errors
  }
}

/**
 * Plays a short, subtle tick sound.
 * Throttled to prevent overlapping or excessively rapid clicks.
 */
export function playTickSound() {
  try {
    initAudio();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    // Enforce minimum interval between ticks (40ms) to prevent overlapping/saturation
    if (now - lastTickTime < 0.04) return;
    lastTickTime = now;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Subtle pitch drop from 800Hz to 320Hz over 18ms creates a crisp, gentle mechanical click
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.018);

    // Soft volume (0.06) with exponential decay
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // Disconnect cleanup error safely ignored
      }
    };

    osc.start(now);
    osc.stop(now + 0.018);
  } catch {
    // Graceful fallback if Web Audio is restricted or errors
  }
}
