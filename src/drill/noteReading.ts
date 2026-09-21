import { noteName, parseNote, pitchClass, STEPS, toMidi, type Alter, type Note } from '../music/note';
import type { StaffClef } from '../staff/types';
import { weightedPick } from './random';
import type { Exercise } from './types';

export interface NoteReadingSettings {
  clef: StaffClef;
  low: string;
  high: string;
  accidentals: boolean;
  anyOctave: boolean;
}

export const CLEF_DEFAULT_RANGES: Record<StaffClef, { low: string; high: string }> = {
  treble: { low: 'C4', high: 'G5' },
  bass: { low: 'E2', high: 'C4' },
  grand: { low: 'C3', high: 'C5' },
};

export const DEFAULT_NOTE_READING: NoteReadingSettings = {
  clef: 'treble',
  ...CLEF_DEFAULT_RANGES.treble,
  accidentals: false,
  anyOctave: false,
};

function isAwkward(n: Note): boolean {
  return (n.alter === 1 && (n.step === 'E' || n.step === 'B')) ||
    (n.alter === -1 && (n.step === 'F' || n.step === 'C'));
}

export function candidateNotes(s: NoteReadingSettings): Note[] {
  const lo = toMidi(parseNote(s.low));
  const hi = toMidi(parseNote(s.high));
  const alters: Alter[] = s.accidentals ? [-1, 0, 1] : [0];
  const out: Note[] = [];
  for (let octave = 0; octave <= 8; octave++) {
    for (const step of STEPS) {
      for (const alter of alters) {
        const n: Note = { step, alter, octave };
        const m = toMidi(n);
        if (m >= lo && m <= hi && !isAwkward(n)) out.push(n);
      }
    }
  }
  return out;
}

export function createNoteReading(s: NoteReadingSettings): Exercise {
  const pool = candidateNotes(s);
  if (pool.length === 0) throw new Error('No notes in the selected range');
  return {
    nextQuestion(weights, rng, previous) {
      const choices = previous && pool.length > 1 ? pool.filter((n) => noteName(n) !== previous.itemKey) : pool;
      const note = weightedPick(choices, (n) => 1 + 3 * (weights.get(noteName(n)) ?? 0), rng);
      return { itemKey: noteName(note), notes: [note], clef: s.clef };
    },
    check(q, heard) {
      const target = toMidi(q.notes[0]);
      const ok = s.anyOctave ? pitchClass(heard.midi) === pitchClass(target) : heard.midi === target;
      return ok ? 'correct' : 'wrong';
    },
  };
}
