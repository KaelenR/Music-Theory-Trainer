import { describe, expect, it } from 'vitest';
import { parseNote } from '../music/note';
import { accidentalsFor, splitByStaff, staffForNote, toVexKey } from './vexKeys';

const seq = (...names: string[]) => names.map((n) => [parseNote(n)]);

describe('toVexKey', () => {
  it('formats keys for VexFlow', () => {
    expect(toVexKey(parseNote('C4'))).toBe('c/4');
    expect(toVexKey(parseNote('C#4'))).toBe('c#/4');
    expect(toVexKey(parseNote('Bb3'))).toBe('bb/3');
  });
});

describe('accidentalsFor', () => {
  it('draws accidentals only where they differ from the key and the measure so far', () => {
    expect(accidentalsFor(seq('D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5', 'D5'), { F: 1, C: 1 }))
      .toEqual([[null], [null], [null], [null], [null], [null], [null], [null]]);
    expect(accidentalsFor(seq('F#4', 'G4'))).toEqual([['#'], [null]]);
  });
  it('draws naturals against the key signature', () => {
    expect(accidentalsFor(seq('B4', 'Bb4'), { B: -1 })).toEqual([['n'], ['b']]);
  });
  it('carries accidentals through the measure and cancels them with naturals', () => {
    const melodicA = seq('A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G#5', 'A5', 'G5', 'F5', 'E5');
    const accs = accidentalsFor(melodicA).map((g) => g[0]);
    expect(accs.slice(5, 10)).toEqual(['#', '#', null, 'n', 'n']);
  });
  it('handles chords note by note', () => {
    expect(accidentalsFor([[parseNote('C4'), parseNote('E4'), parseNote('G#4')]])).toEqual([[null, null, '#']]);
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
    expect(splitByStaff('treble', notes)).toEqual({ treble: notes, bass: [] });
    expect(splitByStaff('bass', notes)).toEqual({ treble: [], bass: notes });
  });
  it('splits by middle C for grand staff', () => {
    expect(splitByStaff('grand', notes)).toEqual({ treble: [notes[1]], bass: [notes[0]] });
  });
});
