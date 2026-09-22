import { describe, expect, it } from 'vitest';
import { noteName, parseNote } from './note';
import { chordName, chordNotes, chordPitchClasses } from './chord';

const names = (s: string, q: Parameters<typeof chordNotes>[1], inv = 0) =>
  chordNotes(parseNote(s), q, inv)?.map(noteName) ?? null;

describe('chordNotes', () => {
  it('builds correctly spelled chords', () => {
    expect(names('C4', 'maj')).toEqual(['C4', 'E4', 'G4']);
    expect(names('F#4', 'min')).toEqual(['F#4', 'A4', 'C#5']);
    expect(names('B3', 'dim')).toEqual(['B3', 'D4', 'F4']);
    expect(names('C4', 'aug')).toEqual(['C4', 'E4', 'G#4']);
    expect(names('Bb3', 'dom7')).toEqual(['Bb3', 'D4', 'F4', 'Ab4']);
    expect(names('C4', 'maj7')).toEqual(['C4', 'E4', 'G4', 'B4']);
    expect(names('D4', 'min7')).toEqual(['D4', 'F4', 'A4', 'C5']);
    expect(names('B3', 'hdim7')).toEqual(['B3', 'D4', 'F4', 'A4']);
    expect(names('B3', 'dim7')).toEqual(['B3', 'D4', 'F4', 'Ab4']);
  });
  it('inverts by raising the lowest notes an octave', () => {
    expect(names('C4', 'maj', 1)).toEqual(['E4', 'G4', 'C5']);
    expect(names('C4', 'maj', 2)).toEqual(['G4', 'C5', 'E5']);
    expect(names('G3', 'dom7', 3)).toEqual(['F4', 'G4', 'B4', 'D5']);
  });
  it('returns null for chords needing double accidentals', () => {
    expect(names('Cb4', 'dim7')).toBeNull();
  });
});

describe('chordName / chordPitchClasses', () => {
  it('names chords in lead-sheet style', () => {
    expect(chordName(parseNote('C4'), 'maj')).toBe('C');
    expect(chordName(parseNote('F#4'), 'min7')).toBe('F♯m7');
    expect(chordName(parseNote('Bb3'), 'dim')).toBe('B♭°');
  });
  it('lists sorted unique pitch classes', () => {
    expect(chordPitchClasses(chordNotes(parseNote('C4'), 'maj', 1)!)).toEqual([0, 4, 7]);
    expect(chordPitchClasses(chordNotes(parseNote('Bb3'), 'dom7')!)).toEqual([2, 5, 8, 10]);
  });
});
