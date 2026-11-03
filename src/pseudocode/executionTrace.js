// PHASE 11 -- Student pseudocode execution trace.
//
// Separate from src/engine/executionTrace.js.
//
// src/engine/executionTrace.js:
// trusted reference algorithm traces.
//
// This file:
// execution traces produced by arbitrary student-written pseudocode.

export function createTraceBuilder() {
  const states = [];
  let step = 0;

  function push(partial) {
    const state = {
      step: step++,
      ...partial,
    };

    states.push(state);

    return state;
  }

  return {
    push,
    getStates: () => states,
  };
}

const ALIGNMENT_NAMES = [
  "alignment",
  "s",
  "position",
  "pos",
];

export const BAD_SHIFT_NAMES = [
  "badCharacterShift",
  "badShift",
  "bcShift",
];

export const GOOD_SHIFT_NAMES = [
  "goodSuffixShift",
  "goodShift",
  "gsShift",
];

export const CHOSEN_SHIFT_NAMES = [
  "shift",
  "chosenShift",
  "totalShift",
];

export const MATCH_NAMES = [
  "matchFound",
  "match",
  "matchIndex",
  "foundAt",
];

function firstPresent(variables, names) {
  for (const name of names) {
    if (
      Object.prototype.hasOwnProperty.call(
        variables,
        name
      )
    ) {
      return variables[name];
    }
  }

  return undefined;
}

export function normalizeBoyerMooreState(
  variables,
  comparison
) {
  const normalized = {};

  const alignment = firstPresent(
    variables,
    ALIGNMENT_NAMES
  );

  if (alignment !== undefined) {
    normalized.alignment = alignment;
  }

  const badShift = firstPresent(
    variables,
    BAD_SHIFT_NAMES
  );

  if (badShift !== undefined) {
    normalized.badCharacterShift =
      badShift;
  }

  const goodShift = firstPresent(
    variables,
    GOOD_SHIFT_NAMES
  );

  if (goodShift !== undefined) {
    normalized.goodSuffixShift =
      goodShift;
  }

  const chosenShift = firstPresent(
    variables,
    CHOSEN_SHIFT_NAMES
  );

  if (chosenShift !== undefined) {
    normalized.chosenShift =
      chosenShift;
  }

  const match = firstPresent(
    variables,
    MATCH_NAMES
  );

  if (match !== undefined) {
    normalized.match = match;
  }

  if (comparison) {
    normalized.currentComparison =
      comparison;

    normalized.mismatch =
      comparison.result ===
      "mismatch";
  }

  return normalized;
}