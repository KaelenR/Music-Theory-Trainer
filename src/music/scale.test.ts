import { describe, expect, it } from 'vitest';
import { noteName, parseNote } from './note';
import { scaleLabel, scaleNotes } from './scale';

const names = (s: string, t: Parameters<typeof scaleNotes>[1], d: Parameters<typeof scaleNotes>[2] = 'up') =>
  scaleNotes(parseNote(s), t, d)?.map(noteName) ?? null;

describe('scaleNotes', () => {
  it('builds one octave up', () => {
    expect(names('D4', 'major')).toEqual(['D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5', 'D5']);
    expect(names('A4', 'natural-minor')).toEqual(['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5']);
    expect(names('A4', 'harmonic-minor')![6]).toBe('G#5');
    expect(names('Bb3', 'major')).toEqual(['Bb3', 'C4', 'D4', 'Eb4', 'F4', 'G4', 'A4', 'Bb4']);
  });
  it('comes back down, using natural minor on the way down for melodic minor', () => {
    const mel = names('A4', 'melodic-minor', 'up-down')!;
    expect(mel).toHaveLength(15);
    expect(mel.slice(5, 10)).toEqual(['F#5', 'G#5', 'A5', 'G5', 'F5']);
    expect(mel[14]).toBe('A4');
    const maj = names('C4', 'major', 'up-down')!;
    expect(maj[0]).toBe('C4');
    expect(maj[7]).toBe('C5');
    expect(maj[14]).toBe('C4');
  });
  it('labels scales', () => {
    expect(scaleLabel(parseNote('F#4'), 'harmonic-minor')).toBe('F♯ harmonic minor');
  });
});
