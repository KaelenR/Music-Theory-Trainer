import { describe, expect, it } from 'vitest';
import { parseNote } from '../music/note';
import { describeReveal, DISPLAY_CUTOFF, heardPitchClasses, matchChord, matchNote, pitchClassNames } from './answer';
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
  it('ignores a repeat of the note just matched', () => {
    const two = { kind: 'notes' as const, midis: [60, 64], anyOctave: false };
    expect(matchNote(two, 1, 60)).toBe('ignored');
    expect(matchNote({ ...two, anyOctave: true }, 1, 72)).toBe('ignored');
    expect(matchNote(two, 1, 61)).toBe('wrong');
  });
  it('does not ignore a repeated note that is also the expected one', () => {
    expect(matchNote({ kind: 'notes', midis: [60, 60], anyOctave: false }, 1, 60)).toBe('correct');
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
  it('exempts the fifth above a chord tone (its 3rd harmonic) from the absent check', () => {
    expect(matchChord([0, 3, 6], chroma({ 0: 1, 3: 0.8, 6: 0.8, 10: 0.7 }))).toBe(true);
  });
  it('needs a chord tone that shadows an overtone to be stronger', () => {
    expect(matchChord([0, 7], chroma({ 0: 1, 7: 0.5 }))).toBe(false);
    expect(matchChord([0, 7], chroma({ 0: 1, 7: 0.9 }))).toBe(true);
  });
  it('accepts a triad whose fifth is only moderately strong', () => {
    // F major (F4 A4 C5) on device-like audio: C sits at 0.6–0.77.
    expect(matchChord([0, 5, 9], chroma({ 5: 0.92, 9: 1, 0: 0.62 }))).toBe(true);
  });
  it('needs the seventh of a four-note chord above the overtone level of its third', () => {
    // A C major triad: E's 3rd harmonic puts B at 0.35 — not Cmaj7.
    expect(matchChord([0, 4, 7, 11], chroma({ 0: 1, 4: 0.95, 7: 0.9, 11: 0.35 }))).toBe(false);
    expect(matchChord([0, 4, 7, 11], chroma({ 0: 1, 4: 0.95, 7: 0.9, 11: 0.75 }))).toBe(true);
  });
});

describe('heardPitchClasses / pitchClassNames', () => {
  it('lists the clearly present pitch classes', () => {
    expect(heardPitchClasses(chroma({ 0: 1, 4: 0.8, 8: 0.9, 2: 0.1 }))).toEqual([0, 4, 8]);
    expect(pitchClassNames([0, 4, 8])).toBe('C E A♭');
  });
  it('leaves out weaker overtones by default, and takes a custom cutoff', () => {
    expect(DISPLAY_CUTOFF).toBe(0.6);
    expect(heardPitchClasses(chroma({ 0: 1, 7: 0.5 }))).toEqual([0]);
    expect(heardPitchClasses(chroma({ 0: 1, 7: 0.5 }), 0.4)).toEqual([0, 7]);
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
