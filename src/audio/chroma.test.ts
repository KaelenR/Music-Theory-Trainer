import { describe, expect, it } from 'vitest';
import { matchChord } from '../drill/answer';
import { midiToFreq } from '../music/note';
import { chromaFromSpectrum, createChromaMap } from './chroma';

const SR = 48000;
const N = 8192;
const BIN_HZ = SR / N;

/** A dB spectrum with piano-like partials (amplitude 1/h) for each MIDI note, tuned to `a4`. */
function spectrumAt(a4: number, ...midis: number[]): Float32Array {
  const db = new Float32Array(N / 2).fill(-140);
  for (const m of midis) {
    for (let h = 1; h <= 8; h++) {
      const i = Math.round((midiToFreq(m, a4) * h) / BIN_HZ);
      if (i >= db.length) continue;
      db[i] = 20 * Math.log10(10 ** (db[i] / 20) + 1 / h);
    }
  }
  return db;
}
const spectrum = (...midis: number[]) => spectrumAt(440, ...midis);

/** Partial amplitudes closer to a real piano: the 2nd–4th harmonics stay strong. */
const PIANO_PARTIALS = [1, 0.9, 0.7, 0.5, 0.35, 0.25, 0.15, 0.1];
function pianoSpectrum(...midis: number[]): Float32Array {
  const db = new Float32Array(N / 2).fill(-140);
  for (const m of midis) {
    PIANO_PARTIALS.forEach((amp, k) => {
      const i = Math.round((midiToFreq(m, 440) * (k + 1)) / BIN_HZ);
      if (i < db.length) db[i] = 20 * Math.log10(10 ** (db[i] / 20) + amp);
    });
  }
  return db;
}

describe('chroma', () => {
  const map = createChromaMap(SR, N);

  it('puts a single note in its pitch class', () => {
    const c = chromaFromSpectrum(spectrum(60), map);
    expect(Array.from(c).indexOf(Math.max(...c))).toBe(0);
  });

  it('recognizes a C major triad and rejects C minor', () => {
    const c = chromaFromSpectrum(spectrum(60, 64, 67), map);
    expect(matchChord([0, 4, 7], c)).toBe(true);
    expect(matchChord([0, 3, 7], c)).toBe(false);
  });

  it('does not mistake one note plus its overtones for a chord or fifth', () => {
    const c = chromaFromSpectrum(spectrum(60), map);
    expect(matchChord([0, 4, 7], c)).toBe(false);
    expect(matchChord([0, 7], c)).toBe(false);
  });

  describe('with piano-like partials', () => {
    const pc = (...midis: number[]) => chromaFromSpectrum(pianoSpectrum(...midis), map);

    it('recognizes diminished triads and a diminished seventh', () => {
      expect(matchChord([0, 3, 6], pc(48, 51, 54))).toBe(true);
      expect(matchChord([0, 3, 6], pc(60, 63, 66))).toBe(true);
      expect(matchChord([2, 5, 8, 11], pc(59, 62, 65, 68))).toBe(true);
    });

    it('recognizes a harmonic minor third', () => {
      expect(matchChord([0, 3], pc(60, 63))).toBe(true);
    });

    it('does not take a single note for a fifth', () => {
      expect(matchChord([0, 7], pc(48))).toBe(false);
      expect(matchChord([0, 7], pc(60))).toBe(false);
    });

    it('recognizes C major and rejects C minor', () => {
      expect(matchChord([0, 4, 7], pc(48, 52, 55))).toBe(true);
      expect(matchChord([0, 4, 7], pc(60, 64, 67))).toBe(true);
      expect(matchChord([0, 4, 7], pc(48, 51, 55))).toBe(false);
      expect(matchChord([0, 4, 7], pc(60, 63, 67))).toBe(false);
    });
  });

  it('follows the tuning reference', () => {
    // A piano 40 cents sharp sits between semitones for an A440 map but lines up with a tuned map.
    const a4 = 440 * 2 ** (40 / 1200);
    const sharpPiano = spectrumAt(a4, 60, 64, 67);
    expect(matchChord([0, 4, 7], chromaFromSpectrum(sharpPiano, createChromaMap(SR, N, a4)))).toBe(true);
    const untuned = chromaFromSpectrum(sharpPiano, map);
    expect(untuned.reduce((a, b) => a + b, 0)).toBeLessThan(
      chromaFromSpectrum(sharpPiano, createChromaMap(SR, N, a4)).reduce((a, b) => a + b, 0),
    );
  });
});
