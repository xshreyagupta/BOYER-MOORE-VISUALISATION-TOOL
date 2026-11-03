/**
 * Mirrors --cell-size / --cell-gap in styles/tokens.css. Kept as JS
 * constants because the pattern track's slide offset is computed in JS
 * (translateX by alignment * (cellSize + gap)) and inline transforms
 * can't read CSS custom properties directly.
 */
export const CELL_SIZE = 44;
export const CELL_GAP = 4;
export const CELL_STRIDE = CELL_SIZE + CELL_GAP;
