import { keySignatureFor, type KeySignature } from '../music/key';
import { parseNote, toMidi, type Note } from '../music/note';
import { scaleLabel, scaleNotes, type ScaleDirection, type ScaleType } from '../music/scale';
import { weightedPick } from './random';
import type { Exercise, Question } from './types';

export interface ScaleSettings {
  clef: 'treble' | 'bass';
  types: ScaleType[];
  /** Add A♭, D♭, G♭, F♯ and C♯ tonics. */
  moreKeys: boolean;
  direction: ScaleDirection;
  /** Show only the key signature; the player works out the notes (any octave). */
  keySignatureOnly: boolean;
  /** Name the scale in the prompt (default true). False asks the player to work out the key too. */
  showName?: boolean;
  /** Exact tonics to use (e.g. ['C', 'G', 'F']); overrides moreKeys. Used by lesson presets. */
  tonics?: string[];
}

export const DEFAULT_SCALES: ScaleSettings = {
  clef: 'treble',
  types: ['major'],
  moreKeys: false,
  direction: 'up',
  keySignatureOnly: false,
};

const COMMON_TONICS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Bb', 'Eb'];
const MORE_TONICS = ['Ab', 'Db', 'Gb', 'F#', 'C#'];
const TONIC_OCTAVE = { treble: 4, bass: 3 };

export interface ScaleCandidate {
  key: string;
  label: string;
  notes: Note[];
  keySignature: KeySignature;
}

export function scaleCandidates(s: ScaleSettings): ScaleCandidate[] {
  const names = s.tonics ?? [...COMMON_TONICS, ...(s.moreKeys ? MORE_TONICS : [])];
  const tonics = names.map((t) => parseNote(`${t}${TONIC_OCTAVE[s.clef]}`));
  const out: ScaleCandidate[] = [];
  for (const tonic of tonics) {
    for (const type of s.types) {
      const notes = scaleNotes(tonic, type, s.direction);
      const keySignature = keySignatureFor(tonic, type);
      if (!notes || !keySignature) continue;
      const label = scaleLabel(tonic, type);
      out.push({ key: `${label} ${s.direction}`, label, notes, keySignature });
    }
  }
  return out;
}

export function createScales(s: ScaleSettings): Exercise {
  const pool = scaleCandidates(s);
  if (pool.length === 0) throw new Error('No scales match these settings');
  return {
    nextQuestion(weights, rng, previous): Question {
      const choices = previous && pool.length > 1 ? pool.filter((c) => c.key !== previous.itemKey) : pool;
      const c = weightedPick(choices, (x) => 1 + 3 * (weights.get(x.key) ?? 0), rng);
      const sequence = c.notes.map((n) => [n]);
      return {
        itemKey: c.key,
        clef: s.clef,
        display: s.keySignatureOnly ? [] : sequence,
        reveal: sequence,
        keySignature: c.keySignature,
        prompt: `${s.showName === false ? 'Scale for this key signature' : c.label} · ${s.direction === 'up' ? 'up one octave' : 'up and back down'}`,
        answer: { kind: 'notes', midis: c.notes.map(toMidi), anyOctave: s.keySignatureOnly },
      };
    },
  };
}
