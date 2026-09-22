/** Pitch frames at or above this clarity are trusted, for calibration and detection alike. */
export const CLARITY_MIN = 0.85;

export interface CalibrationSample {
  freq: number;
  clarity: number;
}

export interface Levels {
  /** Frames quieter than this are treated as silence. */
  silenceRms: number;
  /** Typical level of a held piano note at the iPad; used to scale the level meter. */
  pianoRms: number;
  /** False when the piano is barely louder than the room (detection will be unreliable). */
  clearOfNoise: boolean;
}

/** Used until the user calibrates. Very low, because iPad mic input without AGC is quiet. */
export const DEFAULT_LEVELS: Levels = { silenceRms: 0.0001, pianoRms: 0.001, clearOfNoise: true };

const MIN_PIANO_TO_NOISE = 3;
const NO_NOISE_SAMPLE_FRACTION = 0.1;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function centsFromA4(freq: number): number {
  return 1200 * Math.log2(freq / 440);
}

/** A clear frame within a semitone of A4 — i.e. the held calibration note, not noise or an octave error. */
function isClearA4(s: CalibrationSample): boolean {
  return s.clarity >= CLARITY_MIN && s.freq > 0 && Math.abs(centsFromA4(s.freq)) <= 100;
}

export function computeTuningOffset(samples: CalibrationSample[], minSamples = 10): number | null {
  const cents = samples.filter(isClearA4).map((s) => centsFromA4(s.freq));
  if (cents.length < minSamples) return null;
  return Math.round(median(cents) * 10) / 10;
}

export interface PianoSample extends CalibrationSample {
  rms: number;
}

/** Full calibration: tuning from the held A4, levels from the quiet phase and the same A4 frames. */
export function calibrateFrom(
  quietRms: number[],
  samples: PianoSample[],
): { tuningOffsetCents: number; levels: Levels } | null {
  const tuningOffsetCents = computeTuningOffset(samples);
  const levels = computeLevels(quietRms, samples.filter(isClearA4).map((s) => s.rms));
  if (tuningOffsetCents === null || levels === null) return null;
  return { tuningOffsetCents, levels };
}

/**
 * Derive the silence cutoff from a quiet-room measurement and a held piano note.
 * The cutoff sits at the geometric mean of the two, so it is equally far (in dB)
 * from room noise and from the piano.
 */
export function computeLevels(quietRms: number[], pianoRms: number[]): Levels | null {
  if (pianoRms.length === 0) return null;
  const piano = median(pianoRms);
  if (quietRms.length === 0) {
    return { silenceRms: piano * NO_NOISE_SAMPLE_FRACTION, pianoRms: piano, clearOfNoise: true };
  }
  const noise = median(quietRms);
  return {
    silenceRms: Math.sqrt(Math.max(noise, 1e-7) * piano),
    pianoRms: piano,
    clearOfNoise: piano >= noise * MIN_PIANO_TO_NOISE,
  };
}

/** Level-meter fill (0–100) with a typical held piano note at 60%. */
export function meterPercent(rms: number, levels: Levels): number {
  return Math.min(100, (rms / levels.pianoRms) * 60);
}

/** Input level in dB relative to full scale, for readouts (tiny RMS values are unreadable as decimals). */
export function formatDb(rms: number): string {
  return rms > 0 ? `${Math.round(20 * Math.log10(rms))} dB` : '–∞ dB';
}
