import { CHORD_QUALITIES, chordName, chordNotes, chordPitchClasses, type ChordQuality } from '../music/chord';
import { parseNote, type Note } from '../music/note';
import type { StaffClef } from '../staff/types';
import { weightedPick } from './random';
import type { Exercise, Question } from './types';

export interface ChordSettings {
  clef: StaffClef;
  qualities: ChordQuality[];
  inversions: boolean;
  /** Add B♭, E♭, A♭, D♭ and F♯ roots. */
  accidentalRoots: boolean;
  /** Show only the chord symbol (e.g. "F♯m7") instead of notes on the staff. */
  showName: boolean;
}

export const DEFAULT_CHORDS: ChordSettings = {
  clef: 'treble',
  qualities: ['maj', 'min'],
  inversions: false,
  accidentalRoots: false,
  showName: false,
};

const NATURAL_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ACCIDENTAL_ROOTS = ['Bb', 'Eb', 'Ab', 'Db', 'F#'];
/** Grand-staff roots from F up start in octave 3 so the chord straddles middle C. */
const GRAND_LOW_ROOTS = new Set(['F', 'G', 'A', 'B', 'F#', 'Ab', 'Bb']);
const rootOctave = (clef: StaffClef, root: string) =>
  clef === 'treble' ? 4 : clef === 'bass' ? 3 : GRAND_LOW_ROOTS.has(root) ? 3 : 4;
const INVERSION_NAMES = ['', '1st inversion', '2nd inversion', '3rd inversion'];

export interface ChordCandidate {
  key: string;
  root: Note;
  quality: ChordQuality;
  notes: Note[];
}

export function chordCandidates(s: ChordSettings): ChordCandidate[] {
  const roots = [...NATURAL_ROOTS, ...(s.accidentalRoots ? ACCIDENTAL_ROOTS : [])].map((r) =>
    parseNote(`${r}${rootOctave(s.clef, r)}`),
  );
  const out: ChordCandidate[] = [];
  for (const root of roots) {
    for (const quality of s.qualities) {
      const size = CHORD_QUALITIES[quality].tones.length + 1;
      const inversions = s.inversions && !s.showName ? size : 1;
      for (let inv = 0; inv < inversions; inv++) {
        const notes = chordNotes(root, quality, inv);
        if (!notes) continue;
        const name = chordName(root, quality);
        out.push({ key: inv ? `${name} (${INVERSION_NAMES[inv]})` : name, root, quality, notes });
      }
    }
  }
  return out;
}

export function createChords(s: ChordSettings): Exercise {
  const pool = chordCandidates(s);
  if (pool.length === 0) throw new Error('No chords match these settings');
  return {
    nextQuestion(weights, rng, previous): Question {
      const choices = previous && pool.length > 1 ? pool.filter((c) => c.key !== previous.itemKey) : pool;
      const c = weightedPick(choices, (x) => 1 + 3 * (weights.get(x.key) ?? 0), rng);
      return {
        itemKey: c.key,
        clef: s.clef,
        display: s.showName ? [] : [c.notes],
        reveal: [c.notes],
        prompt: s.showName ? chordName(c.root, c.quality) : undefined,
        answer: { kind: 'chord', pitchClasses: chordPitchClasses(c.notes) },
      };
    },
  };
}
