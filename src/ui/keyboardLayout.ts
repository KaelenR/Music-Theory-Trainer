import { pitchClass } from '../music/note';

export const WHITE_WIDTH = 24;
export const BLACK_WIDTH = 14;
const BLACK_PCS = new Set([1, 3, 6, 8, 10]);

export interface KeyRect {
  midi: number;
  x: number;
  width: number;
  black: boolean;
}

export function isBlack(midi: number): boolean {
  return BLACK_PCS.has(pitchClass(midi));
}

/** Whole octaves (C up to B) covering every key; at least one octave; C4–B4 when empty. */
export function keyboardRange(midis: number[]): { low: number; high: number } {
  if (midis.length === 0) return { low: 60, high: 71 };
  const lo = Math.min(...midis);
  const hi = Math.max(...midis);
  const low = lo - pitchClass(lo);
  const high = Math.max(hi + (11 - pitchClass(hi)), low + 11);
  return { low, high };
}

/** Key rectangles in draw order (white keys first so black keys paint on top). */
export function keyboardLayout(low: number, high: number): { keys: KeyRect[]; width: number } {
  const whites: KeyRect[] = [];
  const blacks: KeyRect[] = [];
  let whiteIndex = 0;
  for (let midi = low; midi <= high; midi++) {
    if (isBlack(midi)) {
      blacks.push({ midi, x: whiteIndex * WHITE_WIDTH - BLACK_WIDTH / 2, width: BLACK_WIDTH, black: true });
    } else {
      whites.push({ midi, x: whiteIndex * WHITE_WIDTH, width: WHITE_WIDTH, black: false });
      whiteIndex++;
    }
  }
  return { keys: [...whites, ...blacks], width: whiteIndex * WHITE_WIDTH };
}
