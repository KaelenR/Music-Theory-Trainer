import { describe, expect, it } from 'vitest';
import { parseNote } from '../music/note';
import { describeReveal, heardPitchClasses, matchChord, matchNote, pitchClassNames } from './answer';
import type { Question } from './types';

const chroma = (entries: Record<number, number>) => Array.from({ length: 12 }, (_, pc) => entries[pc] ?? 0);

describe('matchNote', () => {
  const answer = { kind: 'notes' as const, midis: [60, 64, 67], anyOctave: false };
  it('reports progress, completion and mistakes', () => {
    expect(matchNote(answer, 0, 60)).toBe('progress');
    expect(matchNote(answer, 1, 64)).toBe('progress');
    expect(matchNote(answer, 2, 67)).toBe('correct');
    expect(matchNote(answer, 1, 65)).toBe('wrong');
    expect(matchNote(answer, 0, 72)).toBe('wrong');
  });
  it('compares pitch classes when any octave is allowed', () => {
    expect(matchNote({ ...answer, anyOctave: true }, 0, 48)).toBe('progress');
  });
});

describe('matchChord', () => {
  it('passes when every chord tone is present and nothing else is strong', () => {
    expect(matchChord([0, 4, 7], chroma({ 0: 1, 4: 0.8, 7: 0.9, 11: 0.2 }))).toBe(true);
  });
  it('fails when a chord tone is missing', () => {
    expect(matchChord([0, 4, 7], chroma({ 0: 1, 4: 0.1, 7: 0.9 }))).toBe(false);
  });
  it('fails when an unexpected pitch class is strong', () => {
    expect(matchChord([0, 4, 7], chroma({ 0: 1, 3: 0.9, 4: 0.8, 7: 0.9 }))).toBe(false);
  });
  it('fails on silence', () => {
    expect(matchChord([0, 4, 7], chroma({}))).toBe(false);
  });
});

describe('heardPitchClasses / pitchClassNames', () => {
  it('lists the clearly present pitch classes', () => {
    expect(heardPitchClasses(chroma({ 0: 1, 4: 0.8, 8: 0.9, 2: 0.1 }))).toEqual([0, 4, 8]);
    expect(pitchClassNames([0, 4, 8])).toBe('C E A♭');
  });
});

describe('describeReveal', () => {
  it('lists the answer notes, joining simultaneous notes with +', () => {
    const q: Question = {
      itemKey: 'x', clef: 'treble', display: [], answer: { kind: 'chord', pitchClasses: [0, 4] },
      reveal: [[parseNote('C4')], [parseNote('E4'), parseNote('G4')]],
    };
    expect(describeReveal(q)).toBe('C4 E4+G4');
  });
});
