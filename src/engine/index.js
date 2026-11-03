import { runBadCharacter } from "../algorithms/badCharacter.js";
import { runGoodSuffix } from "../algorithms/goodSuffix.js";
import { runBoyerMoore } from "../algorithms/boyerMoore.js";

export const ALGORITHMS = Object.freeze({
  BAD_CHARACTER: "bad-character",
  GOOD_SUFFIX: "good-suffix",
  FULL: "full",
});

/**
 * Runs the requested algorithm mode against (text, pattern) and returns a
 * full trace-run result. This is the single entry point the future
 * Visualize/Compare/Practice pages will call -- nothing downstream needs
 * to know which module actually implements a given mode.
 *
 * @param {"bad-character"|"good-suffix"|"full"} algorithm
 * @param {string} text
 * @param {string} pattern
 */
export function run(algorithm, text, pattern) {
  switch (algorithm) {
    case ALGORITHMS.BAD_CHARACTER:
      return runBadCharacter(text, pattern);
    case ALGORITHMS.GOOD_SUFFIX:
      return runGoodSuffix(text, pattern);
    case ALGORITHMS.FULL:
      return runBoyerMoore(text, pattern);
    default:
      throw new Error(`Unknown algorithm mode: "${algorithm}"`);
  }
}

export { runBadCharacter, runGoodSuffix, runBoyerMoore };
