import { describe, expect, it } from 'vitest';
import { chords, diatonicStaff, keys, keySignatureStaff, playChord, playDiatonic, playNotes, playScale, scaleStaff, seq } from './build';

describe('lesson builders', () => {
  it('builds staff views', () => {
    expect(seq('treble', 'C4', 'E4').items).toHaveLength(2);
    expect(chords('treble', ['C4', 'E4', 'G4']).items[0].notes).toHaveLength(3);
    expect(scaleStaff('treble', 'D4', 'major', { keySignature: true }).keySignature?.vexKey).toBe('D');
    expect(scaleStaff('treble', 'D4', 'major').keySignature).toBeUndefined();
    expect(keySignatureStaff('treble', 'Eb4', 'major').items).toEqual([]);
    expect(diatonicStaff('treble', 'C4', 'major', [1, 4, 5]).items.map((i) => i.notes.length)).toEqual([3, 3, 3]);
  });
  it('builds answers', () => {
    expect(playNotes('C4', 'E4')).toEqual({ kind: 'notes', midis: [60, 64], anyOctave: false });
    expect(playScale('G4', 'major')).toEqual({ kind: 'notes', midis: [67, 69, 71, 72, 74, 76, 78, 79], anyOctave: false });
    expect(playChord('E4', 'G4', 'C5')).toEqual({ kind: 'chord', pitchClasses: [0, 4, 7] });
    expect(playDiatonic('A4', 'minor', 5)).toEqual({ kind: 'chord', pitchClasses: [4, 8, 11] });
  });
  it('labels keys with the spelling given', () => {
    expect(keys('Bb4', 'D5')).toEqual({ midis: [70, 74], labels: { 70: 'B♭', 74: 'D' } });
  });
});
