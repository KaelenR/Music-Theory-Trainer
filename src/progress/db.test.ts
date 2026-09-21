import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { getSetting, setSetting } from './db';

describe('settings store', () => {
  it('returns the fallback for a missing key', async () => {
    expect(await getSetting('missing', 42)).toBe(42);
  });
  it('round-trips values', async () => {
    await setSetting('tuningOffsetCents', 12.5);
    expect(await getSetting('tuningOffsetCents', 0)).toBe(12.5);
    await setSetting('obj', { a: [1, 2], b: 'x' });
    expect(await getSetting('obj', null)).toEqual({ a: [1, 2], b: 'x' });
  });
});
