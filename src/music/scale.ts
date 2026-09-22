import { transposeBy } from './interval';
import { pitchName, type Note } from './note';

export type ScaleType = 'major' | 'natural-minor' | 'harmonic-minor' | 'melodic-minor';
export type ScaleDirection = 'up' | 'up-down';

export const SCALE_TYPES: Record<ScaleType, { label: string; steps: number[] }> = {
  major: { label: 'major', steps: [2, 2, 1, 2, 2, 2, 1] },
  'natural-minor': { label: 'natural minor', steps: [2, 1, 2, 2, 1, 2, 2] },
  'harmonic-minor': { label: 'harmonic minor', steps: [2, 1, 2, 2, 1, 3, 1] },
  'melodic-minor': { label: 'melodic minor', steps: [2, 1, 2, 2, 2, 2, 1] },
};

export const SCALE_TYPE_NAMES = Object.keys(SCALE_TYPES) as ScaleType[];

function ascending(tonic: Note, type: ScaleType): Note[] | null {
  const notes: Note[] = [tonic];
  let semitones = 0;
  for (let i = 0; i < 7; i++) {
    semitones += SCALE_TYPES[type].steps[i];
    const n = transposeBy(tonic, semitones, i + 1, 'up');
    if (!n) return null;
    notes.push(n);
  }
  return notes;
}

/** One octave from the tonic; 'up-down' returns 15 notes. Melodic minor descends as natural minor. */
export function scaleNotes(tonic: Note, type: ScaleType, direction: ScaleDirection): Note[] | null {
  const up = ascending(tonic, type);
  if (!up) return null;
  if (direction === 'up') return up;
  const down = type === 'melodic-minor' ? ascending(tonic, 'natural-minor') : up;
  if (!down) return null;
  return [...up, ...down.slice(0, -1).reverse()];
}

export function scaleLabel(tonic: Note, type: ScaleType): string {
  return `${pitchName(tonic)} ${SCALE_TYPES[type].label}`;
}
