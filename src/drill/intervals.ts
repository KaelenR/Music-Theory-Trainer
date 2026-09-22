import { INTERVALS, transpose, type IntervalName } from '../music/interval';
import { noteName, parseNote, pitchClass, STEPS, toMidi, type Note } from '../music/note';
import type { StaffClef } from '../staff/types';
import { weightedPick } from './random';
import type { Exercise, Question } from './types';

export type IntervalDirection = 'up' | 'down' | 'both';

export interface IntervalSettings {
  clef: StaffClef;
  /** Range for the starting (root) note. */
  low: string;
  high: string;
  intervals: IntervalName[];
  direction: IntervalDirection;
  /** Play both notes together instead of one after the other. */
  harmonic: boolean;
  /** Show both notes (reading practice) instead of naming the interval. */
  showTarget: boolean;
}

export const INTERVAL_CLEF_RANGES: Record<StaffClef, { low: string; high: string }> = {
  treble: { low: 'C4', high: 'C5' },
  bass: { low: 'C3', high: 'C4' },
  grand: { low: 'C3', high: 'C5' },
};

export const DEFAULT_INTERVALS: IntervalSettings = {
  clef: 'treble',
  ...INTERVAL_CLEF_RANGES.treble,
  intervals: ['m3', 'M3', 'P4', 'P5'],
  direction: 'up',
  harmonic: false,
  showTarget: false,
};

export interface IntervalCandidate {
  key: string;
  root: Note;
  target: Note;
  name: IntervalName;
  up: boolean;
}

export function intervalCandidates(s: IntervalSettings): IntervalCandidate[] {
  const lo = toMidi(parseNote(s.low));
  const hi = toMidi(parseNote(s.high));
  const directions = s.direction === 'both' ? [true, false] : [s.direction === 'up'];
  const out: IntervalCandidate[] = [];
  for (let octave = 0; octave <= 8; octave++) {
    for (const step of STEPS) {
      const root: Note = { step, alter: 0, octave };
      const m = toMidi(root);
      if (m < lo || m > hi) continue;
      for (const name of s.intervals) {
        // Played together, an octave is one pitch class: indistinguishable from a single note.
        if (s.harmonic && name === 'P8') continue;
        for (const up of directions) {
          const target = transpose(root, INTERVALS[name], up ? 'up' : 'down');
          if (target) out.push({ key: `${noteName(root)} ${name}${up ? '↑' : '↓'}`, root, target, name, up });
        }
      }
    }
  }
  return out;
}

export function createIntervals(s: IntervalSettings): Exercise {
  const pool = intervalCandidates(s);
  if (pool.length === 0) throw new Error('No intervals match these settings');
  return {
    nextQuestion(weights, rng, previous): Question {
      const choices = previous && pool.length > 1 ? pool.filter((c) => c.key !== previous.itemKey) : pool;
      const c = weightedPick(choices, (x) => 1 + 3 * (weights.get(x.key) ?? 0), rng);
      const both = s.harmonic ? [[c.root, c.target]] : [[c.root], [c.target]];
      const label = `${INTERVALS[c.name].label} ${c.up ? 'up' : 'down'}`;
      return {
        itemKey: c.key,
        clef: s.clef,
        display: s.showTarget ? both : [[c.root]],
        reveal: both,
        prompt: s.showTarget
          ? (s.harmonic ? 'Play both notes together' : 'Play both notes in order')
          : `${label}${s.harmonic ? ' · together' : ''}`,
        answer: s.harmonic
          ? {
              kind: 'chord',
              pitchClasses: [...new Set([pitchClass(toMidi(c.root)), pitchClass(toMidi(c.target))])].sort((a, b) => a - b),
            }
          : { kind: 'notes', midis: [toMidi(c.root), toMidi(c.target)], anyOctave: false },
      };
    },
  };
}
