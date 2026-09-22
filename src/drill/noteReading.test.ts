import { describe, expect, it } from 'vitest';
import { noteName, parseNote } from '../music/note';
import { seededRng } from './random';
import { candidateNotes, createNoteReading, DEFAULT_NOTE_READING, type NoteReadingSettings } from './noteReading';

const settings = (over: Partial<NoteReadingSettings> = {}): NoteReadingSettings => ({ ...DEFAULT_NOTE_READING, ...over });
const noWeights = new Map<string, number>();

describe('candidateNotes', () => {
  it('lists naturals in range, inclusive', () => {
    expect(candidateNotes(settings({ low: 'C4', high: 'C5' })).map(noteName))
      .toEqual(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']);
  });
  it('adds sharps and flats but skips E#, Fb, B#, Cb', () => {
    expect(candidateNotes(settings({ low: 'C4', high: 'E4', accidentals: true })).map(noteName))
      .toEqual(['C4', 'C#4', 'Db4', 'D4', 'D#4', 'Eb4', 'E4']);
  });
});

describe('createNoteReading', () => {
  it('throws when the range is empty', () => {
    expect(() => createNoteReading(settings({ low: 'C5', high: 'C4' }))).toThrow();
  });

  it('asks single notes on the configured clef', () => {
    const ex = createNoteReading(settings({ clef: 'grand', low: 'C3', high: 'C5' }));
    const q = ex.nextQuestion(noWeights, seededRng(1), null);
    expect(q.display).toHaveLength(1);
    expect(q.display[0]).toHaveLength(1);
    expect(q.reveal).toEqual(q.display);
    expect(q.clef).toBe('grand');
    expect(q.itemKey).toBe(noteName(q.display[0][0]));
  });

  it('never repeats the previous item', () => {
    const ex = createNoteReading(settings({ low: 'C4', high: 'D4' }));
    const rng = seededRng(7);
    let prev = ex.nextQuestion(noWeights, rng, null);
    for (let i = 0; i < 20; i++) {
      const q = ex.nextQuestion(noWeights, rng, prev);
      expect(q.itemKey).not.toBe(prev.itemKey);
      prev = q;
    }
  });

  it('favors items with more misses', () => {
    const ex = createNoteReading(settings({ low: 'C4', high: 'G4' }));
    const rng = seededRng(3);
    const weights = new Map([['D4', 10]]);
    let d4 = 0;
    for (let i = 0; i < 200; i++) if (ex.nextQuestion(weights, rng, null).itemKey === 'D4') d4++;
    expect(d4).toBeGreaterThan(150);
  });

  it('asks for the exact note by default', () => {
    const ex = createNoteReading(settings({ low: 'C4', high: 'C4' }));
    const q = ex.nextQuestion(noWeights, seededRng(1), null);
    expect(q.display).toEqual([[parseNote('C4')]]);
    expect(q.answer).toEqual({ kind: 'notes', midis: [60], anyOctave: false });
  });

  it('passes any-octave through to the answer', () => {
    const ex = createNoteReading(settings({ low: 'C4', high: 'C4', anyOctave: true }));
    expect(ex.nextQuestion(noWeights, seededRng(1), null).answer).toEqual({ kind: 'notes', midis: [60], anyOctave: true });
  });
});
