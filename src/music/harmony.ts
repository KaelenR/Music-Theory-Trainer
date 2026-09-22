import { chordNotes, type ChordQuality } from './chord';
import type { Note } from './note';
import { scaleNotes } from './scale';

export type Mode = 'major' | 'minor';

const QUALITIES: Record<Mode, ChordQuality[]> = {
  major: ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'],
  minor: ['min', 'dim', 'maj', 'min', 'maj', 'maj', 'dim'],
};

const NUMERALS: Record<Mode, string[]> = {
  major: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
  minor: ['i', 'ii°', 'III', 'iv', 'V', 'VI', 'vii°'],
};

function checkDegree(degree: number): void {
  if (!Number.isInteger(degree) || degree < 1 || degree > 7) throw new Error(`Invalid scale degree ${degree}`);
}

export function romanNumeral(mode: Mode, degree: number): string {
  checkDegree(degree);
  return NUMERALS[mode][degree - 1];
}

export function diatonicQuality(mode: Mode, degree: number): ChordQuality {
  checkDegree(degree);
  return QUALITIES[mode][degree - 1];
}

/** Root-position triad on a scale degree. Minor keys take V and vii° from harmonic minor (raised 7th). */
export function diatonicTriad(tonic: Note, mode: Mode, degree: number): Note[] | null {
  checkDegree(degree);
  const type = mode === 'major' ? 'major' : degree === 5 || degree === 7 ? 'harmonic-minor' : 'natural-minor';
  const scale = scaleNotes(tonic, type, 'up');
  if (!scale) return null;
  return chordNotes(scale[degree - 1], diatonicQuality(mode, degree));
}
