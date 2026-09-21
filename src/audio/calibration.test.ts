import { describe, expect, it } from 'vitest';
import { computeTuningOffset, type CalibrationSample } from './calibration';

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
});
