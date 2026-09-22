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
