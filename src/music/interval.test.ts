import { describe, expect, it } from 'vitest';
import { noteName, parseNote } from './note';
import { INTERVAL_NAMES, INTERVALS, transpose } from './interval';

const up = (s: string, iv: keyof typeof INTERVALS) => {
  const r = transpose(parseNote(s), INTERVALS[iv], 'up');
  return r && noteName(r);
};
const down = (s: string, iv: keyof typeof INTERVALS) => {
  const r = transpose(parseNote(s), INTERVALS[iv], 'down');
  return r && noteName(r);
};

describe('transpose', () => {
  it('spells intervals by letter', () => {
    expect(up('C4', 'M3')).toBe('E4');
    expect(up('E4', 'm3')).toBe('G4');
    expect(up('F4', 'TT')).toBe('B4');
    expect(up('A4', 'P8')).toBe('A5');
    expect(up('B4', 'm2')).toBe('C5');
    expect(up('E4', 'M3')).toBe('G#4');
    expect(up('Bb3', 'P5')).toBe('F4');
  });
  it('goes down across octave boundaries', () => {
    expect(down('C4', 'm2')).toBe('B3');
    expect(down('D4', 'P5')).toBe('G3');
  });
  it('returns null when a double accidental would be needed', () => {
    expect(down('Gb4', 'M3')).toBeNull();
  });
  it('lists all twelve intervals in size order', () => {
    expect(INTERVAL_NAMES).toEqual(['m2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8']);
    expect(INTERVAL_NAMES.map((n) => INTERVALS[n].semitones)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});
