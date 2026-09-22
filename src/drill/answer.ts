import { displayName, PITCH_CLASS_NAMES, pitchClass } from '../music/note';
import type { Answer, Question } from './types';

type NotesAnswer = Extract<Answer, { kind: 'notes' }>;

export function matchNote(
  answer: NotesAnswer,
  matched: number,
  midi: number,
): 'progress' | 'correct' | 'wrong' | 'ignored' {
  const same = (a: number, b: number) => (answer.anyOctave ? pitchClass(a) === pitchClass(b) : a === b);
  if (!same(midi, answer.midis[matched])) {
    // Re-striking (or the tracker re-reporting) the note just matched is not a mistake.
    return matched > 0 && same(midi, answer.midis[matched - 1]) ? 'ignored' : 'wrong';
  }
  return matched + 1 === answer.midis.length ? 'correct' : 'progress';
}

export function hasSound(chroma: ArrayLike<number>): boolean {
  for (let pc = 0; pc < 12; pc++) if (chroma[pc] > 0) return true;
  return false;
}

export interface ChordThresholds {
  /** An expected pitch class must reach this fraction of the strongest one. */
  present: number;
  /**
   * In a one- or two-note answer, an expected pitch class a fifth above another chord tone must
   * reach this instead, since that tone's 3rd harmonic already lands there (protects harmonic
   * 5ths and 4ths). Triads use `present`: their other tones rule out a lone overtone.
   */
  shadowedPresent: number;
  /**
   * In an answer of four or more pitch classes, an expected pitch class a fifth above another
   * chord tone must reach this, so a triad's overtones don't pass for its 7th chord.
   */
  shadowedSeventh: number;
  /** An unexpected pitch class must stay below this fraction (unless it is a fifth above a chord tone). */
  absent: number;
}

/** Starting values; tune against the real piano using the Calibrate screen's chroma bars. */
export const CHORD_THRESHOLDS: ChordThresholds = { present: 0.35, shadowedPresent: 0.7, shadowedSeventh: 0.5, absent: 0.6 };

/** Pitch classes named in "You played …" messages must reach this fraction of the strongest one. */
export const DISPLAY_CUTOFF = 0.6;

function relative(chroma: ArrayLike<number>): number[] | null {
  let max = 0;
  for (let pc = 0; pc < 12; pc++) max = Math.max(max, chroma[pc]);
  if (!(max > 0)) return null;
  return Array.from({ length: 12 }, (_, pc) => chroma[pc] / max);
}

export function matchChord(pitchClasses: number[], chroma: ArrayLike<number>, t = CHORD_THRESHOLDS): boolean {
  const rel = relative(chroma);
  if (!rel) return false;
  // Each tone's 3rd harmonic lands a perfect fifth above it.
  const shadowed = new Set(pitchClasses.map((p) => (p + 7) % 12));
  const size = new Set(pitchClasses).size;
  const shadowedMin = size <= 2 ? t.shadowedPresent : size === 3 ? t.present : t.shadowedSeventh;
  return rel.every((v, pc) => {
    if (pitchClasses.includes(pc)) return v >= (shadowed.has(pc) ? shadowedMin : t.present);
    return shadowed.has(pc) || v < t.absent;
  });
}

export function heardPitchClasses(chroma: ArrayLike<number>, cutoff = DISPLAY_CUTOFF): number[] {
  const rel = relative(chroma);
  if (!rel) return [];
  return rel.flatMap((v, pc) => (v >= cutoff ? [pc] : []));
}

export function pitchClassNames(pcs: number[]): string {
  return pcs.map((pc) => PITCH_CLASS_NAMES[pc]).join(' ');
}

export function describeReveal(q: Question): string {
  return q.reveal.map((group) => group.map(displayName).join('+')).join(' ');
}
