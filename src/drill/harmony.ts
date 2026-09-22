import { chordPitchClasses } from '../music/chord';
import { diatonicTriad, romanNumeral, type Mode } from '../music/harmony';
import { keySignatureFor, type KeySignature } from '../music/key';
import { parseNote, pitchName, type Note } from '../music/note';
import { weightedPick } from './random';
import type { Exercise, Question } from './types';

export interface HarmonySettings {
  clef: 'treble' | 'bass';
  mode: Mode;
  /** Key tonics, e.g. ['C', 'G']. */
  tonics: string[];
  /** Scale degrees 1–7. */
  degrees: number[];
  /** Show "in G major"; otherwise only the numeral and key signature. */
  showKeyName: boolean;
}

export const HARMONY_TONICS: Record<Mode, string[]> = {
  major: ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab'],
  minor: ['A', 'E', 'B', 'D', 'G', 'C', 'F'],
};

export const DEFAULT_HARMONY_TONICS: Record<Mode, string[]> = {
  major: ['C', 'G', 'D', 'F'],
  minor: ['A', 'E', 'D', 'G'],
};

export const DEFAULT_HARMONY: HarmonySettings = {
  clef: 'treble',
  mode: 'major',
  tonics: [...DEFAULT_HARMONY_TONICS.major],
  degrees: [1, 4, 5],
  showKeyName: true,
};

const TONIC_OCTAVE = { treble: 4, bass: 3 };

export interface HarmonyCandidate {
  key: string;
  numeral: string;
  notes: Note[];
  keySignature: KeySignature;
}

export function harmonyCandidates(s: HarmonySettings): HarmonyCandidate[] {
  const out: HarmonyCandidate[] = [];
  for (const t of s.tonics) {
    const tonic = parseNote(`${t}${TONIC_OCTAVE[s.clef]}`);
    const keySignature = keySignatureFor(tonic, s.mode === 'major' ? 'major' : 'natural-minor');
    if (!keySignature) continue;
    for (const degree of s.degrees) {
      const notes = diatonicTriad(tonic, s.mode, degree);
      if (!notes) continue;
      const numeral = romanNumeral(s.mode, degree);
      out.push({ key: `${numeral} in ${pitchName(tonic)} ${s.mode}`, numeral, notes, keySignature });
    }
  }
  return out;
}

export function createHarmony(s: HarmonySettings): Exercise {
  const pool = harmonyCandidates(s);
  if (pool.length === 0) throw new Error('No chords match these settings');
  return {
    nextQuestion(weights, rng, previous): Question {
      const choices = previous && pool.length > 1 ? pool.filter((c) => c.key !== previous.itemKey) : pool;
      const c = weightedPick(choices, (x) => 1 + 3 * (weights.get(x.key) ?? 0), rng);
      return {
        itemKey: c.key,
        clef: s.clef,
        display: [],
        reveal: [c.notes],
        keySignature: c.keySignature,
        prompt: s.showKeyName ? c.key : c.numeral,
        answer: { kind: 'chord', pitchClasses: chordPitchClasses(c.notes) },
      };
    },
  };
}
