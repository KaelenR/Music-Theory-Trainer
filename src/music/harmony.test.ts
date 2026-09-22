import { describe, expect, it } from 'vitest';
import { noteName, parseNote } from './note';
import { diatonicQuality, diatonicTriad, romanNumeral } from './harmony';

const triad = (tonic: string, mode: 'major' | 'minor', degree: number) =>
  diatonicTriad(parseNote(tonic), mode, degree)?.map(noteName) ?? null;

describe('romanNumeral', () => {
  it('names major-key degrees', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((d) => romanNumeral('major', d))).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
  });
  it('names minor-key degrees with a major V', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((d) => romanNumeral('minor', d))).toEqual(['i', 'ii°', 'III', 'iv', 'V', 'VI', 'vii°']);
  });
  it('rejects degrees outside 1–7', () => {
    expect(() => romanNumeral('major', 8)).toThrow();
  });
});

describe('diatonicTriad', () => {
  it('builds major-key triads from the scale', () => {
    expect(triad('C4', 'major', 4)).toEqual(['F4', 'A4', 'C5']);
    expect(triad('G4', 'major', 5)).toEqual(['D5', 'F#5', 'A5']);
    expect(triad('C4', 'major', 7)).toEqual(['B4', 'D5', 'F5']);
    expect(triad('F4', 'major', 2)).toEqual(['G4', 'Bb4', 'D5']);
  });
  it('uses natural minor except for V and vii°', () => {
    expect(triad('A4', 'minor', 1)).toEqual(['A4', 'C5', 'E5']);
    expect(triad('A4', 'minor', 3)).toEqual(['C5', 'E5', 'G5']);
    expect(triad('A4', 'minor', 5)).toEqual(['E5', 'G#5', 'B5']);
    expect(triad('A4', 'minor', 7)).toEqual(['G#5', 'B5', 'D6']);
    expect(triad('D4', 'minor', 4)).toEqual(['G4', 'Bb4', 'D5']);
  });
  it('matches the quality table', () => {
    expect(diatonicQuality('major', 2)).toBe('min');
    expect(diatonicQuality('minor', 2)).toBe('dim');
  });
});
