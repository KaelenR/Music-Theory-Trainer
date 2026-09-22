import { transposeBy } from './interval';
import { pitchClass, pitchName, toMidi, type Note } from './note';

export type ChordQuality = 'maj' | 'min' | 'dim' | 'aug' | 'dom7' | 'maj7' | 'min7' | 'hdim7' | 'dim7';

interface QualityInfo {
  suffix: string;
  label: string;
  /** Chord tones above the root as [semitones, letter steps]. */
  tones: [number, number][];
}

export const CHORD_QUALITIES: Record<ChordQuality, QualityInfo> = {
  maj: { suffix: '', label: 'major', tones: [[4, 2], [7, 4]] },
  min: { suffix: 'm', label: 'minor', tones: [[3, 2], [7, 4]] },
  dim: { suffix: '°', label: 'diminished', tones: [[3, 2], [6, 4]] },
  aug: { suffix: '+', label: 'augmented', tones: [[4, 2], [8, 4]] },
  dom7: { suffix: '7', label: 'dominant 7th', tones: [[4, 2], [7, 4], [10, 6]] },
  maj7: { suffix: 'maj7', label: 'major 7th', tones: [[4, 2], [7, 4], [11, 6]] },
  min7: { suffix: 'm7', label: 'minor 7th', tones: [[3, 2], [7, 4], [10, 6]] },
  hdim7: { suffix: 'ø7', label: 'half-diminished 7th', tones: [[3, 2], [6, 4], [10, 6]] },
  dim7: { suffix: '°7', label: 'diminished 7th', tones: [[3, 2], [6, 4], [9, 6]] },
};

export const CHORD_QUALITY_NAMES = Object.keys(CHORD_QUALITIES) as ChordQuality[];

/** Chord notes low to high. `inversion` raises that many of the lowest notes by an octave. */
export function chordNotes(root: Note, quality: ChordQuality, inversion = 0): Note[] | null {
  const upper = CHORD_QUALITIES[quality].tones.map(([semi, steps]) => transposeBy(root, semi, steps, 'up'));
  if (upper.some((n) => n === null)) return null;
  const notes = [root, ...(upper as Note[])];
  if (inversion < 0 || inversion >= notes.length) throw new Error(`Invalid inversion ${inversion}`);
  return notes
    .map((n, i) => (i < inversion ? { ...n, octave: n.octave + 1 } : n))
    .sort((a, b) => toMidi(a) - toMidi(b));
}

export function chordName(root: Note, quality: ChordQuality): string {
  return `${pitchName(root)}${CHORD_QUALITIES[quality].suffix}`;
}

export function chordPitchClasses(notes: Note[]): number[] {
  return [...new Set(notes.map((n) => pitchClass(toMidi(n))))].sort((a, b) => a - b);
}
