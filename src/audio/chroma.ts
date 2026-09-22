import { pitchClass } from '../music/note';

/** 8192 points ≈ 5.9 Hz bins at 48 kHz: fine enough to separate semitones from about C3 up. */
export const CHROMA_FFT_SIZE = 8192;
/** Bins further than this from a semitone center (in semitones) are ignored as ambiguous. */
const MAX_DEVIATION = 0.35;

/** Precomputed pitch class for each FFT bin (-1 = ignored). Rebuild when the tuning changes. */
export function createChromaMap(sampleRate: number, fftSize: number, a4 = 440, minHz = 60, maxHz = 2000): Int8Array {
  const map = new Int8Array(fftSize / 2).fill(-1);
  const binHz = sampleRate / fftSize;
  for (let i = 1; i < map.length; i++) {
    const hz = i * binHz;
    if (hz < minHz || hz > maxHz) continue;
    const midi = 69 + 12 * Math.log2(hz / a4);
    const nearest = Math.round(midi);
    if (Math.abs(midi - nearest) <= MAX_DEVIATION) map[i] = pitchClass(nearest);
  }
  return map;
}

/** Sum of linear magnitudes per pitch class from a dB spectrum (AnalyserNode.getFloatFrequencyData). */
export function chromaFromSpectrum(db: ArrayLike<number>, map: Int8Array): Float32Array {
  const out = new Float32Array(12);
  for (let i = 0; i < map.length; i++) {
    const pc = map[i];
    if (pc >= 0) out[pc] += 10 ** (db[i] / 20);
  }
  return out;
}
