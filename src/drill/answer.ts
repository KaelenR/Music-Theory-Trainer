import { displayName, PITCH_CLASS_NAMES, pitchClass } from '../music/note';
import type { Answer, Question } from './types';

type NotesAnswer = Extract<Answer, { kind: 'notes' }>;

export function matchNote(answer: NotesAnswer, matched: number, midi: number): 'progress' | 'correct' | 'wrong' {
  const expected = answer.midis[matched];
  const ok = answer.anyOctave ? pitchClass(midi) === pitchClass(expected) : midi === expected;
  if (!ok) return 'wrong';
  return matched + 1 === answer.midis.length ? 'correct' : 'progress';
}

export interface ChordThresholds {
  /** An expected pitch class must reach this fraction of the strongest one. */
  present: number;
  /** An unexpected pitch class must stay below this fraction. */
  absent: number;
}

/** Starting values; tune against the real piano using the Calibrate screen's chroma bars. */
export const CHORD_THRESHOLDS: ChordThresholds = { present: 0.35, absent: 0.6 };

function relative(chroma: ArrayLike<number>): number[] | null {
  let max = 0;
  for (let pc = 0; pc < 12; pc++) max = Math.max(max, chroma[pc]);
  if (!(max > 0)) return null;
  return Array.from({ length: 12 }, (_, pc) => chroma[pc] / max);
}

export function matchChord(pitchClasses: number[], chroma: ArrayLike<number>, t = CHORD_THRESHOLDS): boolean {
  const rel = relative(chroma);
  if (!rel) return false;
  return rel.every((v, pc) => (pitchClasses.includes(pc) ? v >= t.present : v < t.absent));
}

export function heardPitchClasses(chroma: ArrayLike<number>, t = CHORD_THRESHOLDS): number[] {
  const rel = relative(chroma);
  if (!rel) return [];
  return rel.flatMap((v, pc) => (v >= t.present ? [pc] : []));
}

export function pitchClassNames(pcs: number[]): string {
  return pcs.map((pc) => PITCH_CLASS_NAMES[pc]).join(' ');
}

export function describeReveal(q: Question): string {
  return q.reveal.map((group) => group.map(displayName).join('+')).join(' ');
}
