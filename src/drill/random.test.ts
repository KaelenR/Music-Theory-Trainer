import { describe, expect, it } from 'vitest';
import { seededRng, weightedPick } from './random';

describe('weightedPick', () => {
  const items = ['a', 'b'];
  const w = (x: string) => (x === 'a' ? 1 : 3);
  it('selects by cumulative weight', () => {
    expect(weightedPick(items, w, () => 0)).toBe('a');
    expect(weightedPick(items, w, () => 0.2)).toBe('a');
    expect(weightedPick(items, w, () => 0.3)).toBe('b');
    expect(weightedPick(items, w, () => 0.9999)).toBe('b');
  });
  it('never picks zero-weight items', () => {
    const rng = seededRng(1);
    for (let i = 0; i < 100; i++) expect(weightedPick(items, (x) => (x === 'a' ? 0 : 1), rng)).toBe('b');
  });
});

describe('seededRng', () => {
  it('is deterministic and in [0, 1)', () => {
    const a = seededRng(42), b = seededRng(42);
    for (let i = 0; i < 50; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});
