import { describe, expect, it } from 'vitest';
import { parseNote } from './note';
import { keySignatureFor } from './key';

describe('keySignatureFor', () => {
  it('gives sharps in order for sharp keys', () => {
    expect(keySignatureFor(parseNote('D4'), 'major')).toEqual({ vexKey: 'D', alters: { F: 1, C: 1 } });
  });
  it('gives flats in order for flat keys', () => {
    expect(keySignatureFor(parseNote('Bb3'), 'major')).toEqual({ vexKey: 'Bb', alters: { B: -1, E: -1 } });
  });
  it('uses the relative major for every minor scale type', () => {
    expect(keySignatureFor(parseNote('B3'), 'natural-minor')?.vexKey).toBe('D');
    expect(keySignatureFor(parseNote('A4'), 'harmonic-minor')).toEqual({ vexKey: 'C', alters: {} });
    expect(keySignatureFor(parseNote('D#4'), 'melodic-minor')?.vexKey).toBe('F#');
  });
  it('returns null for keys with no standard signature', () => {
    expect(keySignatureFor(parseNote('G#4'), 'major')).toBeNull();
  });
});
