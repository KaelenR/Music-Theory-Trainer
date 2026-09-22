import { describe, expect, it } from 'vitest';
import { calibrateFrom, computeLevels, computeTuningOffset, type CalibrationSample } from './calibration';

const many = (freq: number, n = 20, clarity = 0.95): CalibrationSample[] =>
  Array.from({ length: n }, () => ({ freq, clarity }));

describe('computeTuningOffset', () => {
  it('is zero for a piano tuned to A440', () => {
    expect(computeTuningOffset(many(440))).toBe(0);
  });
  it('measures a sharp piano', () => {
    expect(computeTuningOffset(many(445))).toBeCloseTo(19.6, 1);
  });
  it('ignores unclear samples and octave errors', () => {
    const samples = [...many(445), ...many(300, 30, 0.4), ...many(880, 5)];
    expect(computeTuningOffset(samples)).toBeCloseTo(19.6, 1);
  });
  it('returns null with too few usable samples', () => {
    expect(computeTuningOffset(many(440, 5))).toBeNull();
    expect(computeTuningOffset(many(440, 20, 0.5))).toBeNull();
  });
  it('accepts moderately clear samples (clarity 0.88)', () => {
    expect(computeTuningOffset(many(440, 20, 0.88))).toBe(0);
  });
});

describe('calibrateFrom', () => {
  const held = (freq: number, rms: number, n = 20, clarity = 0.9) =>
    Array.from({ length: n }, () => ({ freq, clarity, rms }));

  it('returns tuning and levels measured only from clear A4 frames', () => {
    const quiet = Array.from({ length: 20 }, () => 0.00003);
    const samples = [...held(445, 0.0003), ...held(300, 0.01, 10, 0.3), ...held(880, 0.02, 5)];
    const result = calibrateFrom(quiet, samples)!;
    expect(result.tuningOffsetCents).toBeCloseTo(19.6, 1);
    expect(result.levels.pianoRms).toBeCloseTo(0.0003, 6);
  });

  it('returns null without a steady A4', () => {
    expect(calibrateFrom([0.00003], held(300, 0.001, 20, 0.3))).toBeNull();
  });
});

describe('computeLevels', () => {
  const rms = (value: number, n = 20) => Array.from({ length: n }, () => value);

  it('sets the silence cutoff between room noise and piano (geometric mean)', () => {
    const levels = computeLevels(rms(0.00003), rms(0.0003))!;
    expect(levels.pianoRms).toBeCloseTo(0.0003, 6);
    expect(levels.silenceRms).toBeCloseTo(Math.sqrt(0.00003 * 0.0003), 7);
    expect(levels.clearOfNoise).toBe(true);
  });

  it('uses medians so a stray spike does not skew the result', () => {
    const levels = computeLevels([...rms(0.00003), 0.01], [...rms(0.0003), 0.05])!;
    expect(levels.pianoRms).toBeCloseTo(0.0003, 6);
  });

  it('flags a piano that is barely louder than the room', () => {
    expect(computeLevels(rms(0.0002), rms(0.0003))!.clearOfNoise).toBe(false);
  });

  it('falls back to a fraction of the piano level when no quiet samples exist', () => {
    const levels = computeLevels([], rms(0.0003))!;
    expect(levels.silenceRms).toBeCloseTo(0.00003, 7);
  });

  it('returns null without piano samples', () => {
    expect(computeLevels(rms(0.00003), [])).toBeNull();
  });
});
