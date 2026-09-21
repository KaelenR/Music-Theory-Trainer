import { describe, expect, it } from 'vitest';
import { parseNote } from '../music/note';
import { accidentalOf, splitByStaff, staffForNote, toVexKey } from './vexKeys';

describe('toVexKey', () => {
  it('formats keys for VexFlow', () => {
    expect(toVexKey(parseNote('C4'))).toBe('c/4');
    expect(toVexKey(parseNote('C#4'))).toBe('c#/4');
    expect(toVexKey(parseNote('Bb3'))).toBe('bb/3');
  });
});

describe('accidentalOf', () => {
  it('returns the accidental glyph code or null', () => {
    expect(accidentalOf(parseNote('F#5'))).toBe('#');
    expect(accidentalOf(parseNote('Eb4'))).toBe('b');
    expect(accidentalOf(parseNote('G4'))).toBeNull();
  });
});

describe('staffForNote', () => {
  it('splits at middle C', () => {
    expect(staffForNote(parseNote('C4'))).toBe('treble');
    expect(staffForNote(parseNote('B3'))).toBe('bass');
  });
});

describe('splitByStaff', () => {
  const notes = [parseNote('E2'), parseNote('G4')];
  it('puts every note on the single clef for treble/bass views', () => {
    expect(splitByStaff({ clef: 'treble', notes })).toEqual({ treble: notes, bass: [] });
    expect(splitByStaff({ clef: 'bass', notes })).toEqual({ treble: [], bass: notes });
  });
  it('splits by middle C for grand staff', () => {
    expect(splitByStaff({ clef: 'grand', notes })).toEqual({ treble: [notes[1]], bass: [notes[0]] });
  });
});
