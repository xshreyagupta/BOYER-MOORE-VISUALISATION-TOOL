/**
 * Brute-force reference matcher, deliberately independent of any
 * Boyer-Moore logic. Used purely as a correctness oracle in tests: if a
 * heuristic's reported matches ever disagree with this, the heuristic (or
 * its preprocessing) has a bug.
 */
export function naiveSearch(text, pattern) {
  const matches = [];
  if (pattern.length === 0 || pattern.length > text.length) return matches;
  for (let i = 0; i <= text.length - pattern.length; i++) {
    let ok = true;
    for (let k = 0; k < pattern.length; k++) {
      if (text[i + k] !== pattern[k]) {
        ok = false;
        break;
      }
    }
    if (ok) matches.push(i);
  }
  return matches;
}
