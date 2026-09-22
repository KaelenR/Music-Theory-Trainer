import { describe, expect, it } from 'vitest';
import { BLACK_WIDTH, isBlack, keyboardLayout, keyboardRange, WHITE_WIDTH } from './keyboardLayout';

describe('keyboardRange', () => {
  it('pads to whole C-to-B octaves', () => {
    expect(keyboardRange([60, 64])).toEqual({ low: 60, high: 71 });
    expect(keyboardRange([59, 62])).toEqual({ low: 48, high: 71 });
    expect(keyboardRange([72])).toEqual({ low: 72, high: 83 });
  });
  it('defaults to the middle-C octave', () => {
    expect(keyboardRange([])).toEqual({ low: 60, high: 71 });
  });
});

describe('keyboardLayout', () => {
  it('lays out one octave', () => {
    const { keys, width } = keyboardLayout(60, 71);
    expect(width).toBe(7 * WHITE_WIDTH);
    expect(keys).toHaveLength(12);
    expect(keys.slice(0, 7).every((k) => !k.black)).toBe(true);
    const cSharp = keys.find((k) => k.midi === 61)!;
    expect(cSharp).toMatchObject({ black: true, x: WHITE_WIDTH - BLACK_WIDTH / 2, width: BLACK_WIDTH });
    expect(keys.find((k) => k.midi === 64)!.x).toBe(2 * WHITE_WIDTH);
  });
  it('knows black keys', () => {
    expect([60, 61, 63, 64, 66, 70, 71].map(isBlack)).toEqual([false, true, true, false, true, true, false]);
  });
});
