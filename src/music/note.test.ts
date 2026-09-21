import { describe, expect, it } from 'vitest';
import {
  displayName, freqToMidi, fromMidi, midiToFreq, noteName, parseNote, pitchClass, toMidi,
} from './note';

describe('toMidi', () => {
  it('maps reference notes', () => {
    expect(toMidi(parseNote('C4'))).toBe(60);
    expect(toMidi(parseNote('A4'))).toBe(69);
    expect(toMidi(parseNote('A0'))).toBe(21);
    expect(toMidi(parseNote('C8'))).toBe(108);
  });
  it('applies accidentals, including enharmonics across octave boundaries', () => {
    expect(toMidi(parseNote('C#4'))).toBe(61);
    expect(toMidi(parseNote('Db4'))).toBe(61);
    expect(toMidi(parseNote('Cb4'))).toBe(59);
    expect(toMidi(parseNote('B#3'))).toBe(60);
  });
});

describe('parseNote / noteName', () => {
  it('round-trips', () => {
    for (const s of ['C4', 'F#5', 'Bb3', 'E2', 'G#6']) expect(noteName(parseNote(s))).toBe(s);
  });
  it('throws on invalid input', () => {
    expect(() => parseNote('H4')).toThrow();
    expect(() => parseNote('C')).toThrow();
    expect(() => parseNote('C##4')).toThrow();
  });
});

describe('fromMidi', () => {
  it('uses sharp spellings', () => {
    expect(noteName(fromMidi(60))).toBe('C4');
    expect(noteName(fromMidi(61))).toBe('C#4');
    expect(noteName(fromMidi(59))).toBe('B3');
    expect(noteName(fromMidi(70))).toBe('A#4');
  });
});

describe('pitchClass', () => {
  it('wraps to 0-11', () => {
    expect(pitchClass(60)).toBe(0);
    expect(pitchClass(71)).toBe(11);
    expect(pitchClass(-1)).toBe(11);
  });
});

describe('displayName', () => {
  it('uses musical symbols', () => {
    expect(displayName(parseNote('F#5'))).toBe('F♯5');
    expect(displayName(parseNote('Bb3'))).toBe('B♭3');
    expect(displayName(parseNote('C4'))).toBe('C4');
  });
});

describe('freqToMidi / midiToFreq', () => {
  it('converts exact pitches', () => {
    expect(freqToMidi(440)).toEqual({ midi: 69, cents: 0 });
    const c4 = freqToMidi(261.6256);
    expect(c4.midi).toBe(60);
    expect(Math.abs(c4.cents)).toBeLessThan(0.1);
  });
  it('reports cents deviation', () => {
    const r = freqToMidi(452);
    expect(r.midi).toBe(69);
    expect(r.cents).toBeCloseTo(46.6, 1);
  });
  it('respects a custom A4 reference', () => {
    const r = freqToMidi(440, 445);
    expect(r.midi).toBe(69);
    expect(r.cents).toBeCloseTo(-19.6, 1);
  });
  it('inverts', () => {
    expect(midiToFreq(69)).toBe(440);
    expect(midiToFreq(60)).toBeCloseTo(261.6256, 3);
  });
});
