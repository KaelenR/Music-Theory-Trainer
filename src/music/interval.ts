import { STEPS, toMidi, type Alter, type Note } from './note';

export type IntervalName = 'm2' | 'M2' | 'm3' | 'M3' | 'P4' | 'TT' | 'P5' | 'm6' | 'M6' | 'm7' | 'M7' | 'P8';

export interface Interval {
  name: IntervalName;
  semitones: number;
  /** Letter-name distance (a 3rd is 2 steps). */
  steps: number;
  label: string;
}

export const INTERVALS: Record<IntervalName, Interval> = {
  m2: { name: 'm2', semitones: 1, steps: 1, label: 'minor 2nd' },
  M2: { name: 'M2', semitones: 2, steps: 1, label: 'major 2nd' },
  m3: { name: 'm3', semitones: 3, steps: 2, label: 'minor 3rd' },
  M3: { name: 'M3', semitones: 4, steps: 2, label: 'major 3rd' },
  P4: { name: 'P4', semitones: 5, steps: 3, label: 'perfect 4th' },
  TT: { name: 'TT', semitones: 6, steps: 3, label: 'tritone' },
  P5: { name: 'P5', semitones: 7, steps: 4, label: 'perfect 5th' },
  m6: { name: 'm6', semitones: 8, steps: 5, label: 'minor 6th' },
  M6: { name: 'M6', semitones: 9, steps: 5, label: 'major 6th' },
  m7: { name: 'm7', semitones: 10, steps: 6, label: 'minor 7th' },
  M7: { name: 'M7', semitones: 11, steps: 6, label: 'major 7th' },
  P8: { name: 'P8', semitones: 12, steps: 7, label: 'octave' },
};

export const INTERVAL_NAMES = Object.keys(INTERVALS) as IntervalName[];

/**
 * Move a note by a number of semitones and letter steps, keeping correct spelling.
 * Returns null when the result would need a double sharp or double flat.
 */
export function transposeBy(n: Note, semitones: number, steps: number, direction: 'up' | 'down'): Note | null {
  const sign = direction === 'up' ? 1 : -1;
  const index = STEPS.indexOf(n.step) + sign * steps;
  const step = STEPS[((index % 7) + 7) % 7];
  const octave = n.octave + Math.floor(index / 7);
  const alter = toMidi(n) + sign * semitones - toMidi({ step, alter: 0, octave });
  if (alter < -1 || alter > 1) return null;
  return { step, alter: alter as Alter, octave };
}

export function transpose(n: Note, iv: Interval, direction: 'up' | 'down' = 'up'): Note | null {
  return transposeBy(n, iv.semitones, iv.steps, direction);
}
