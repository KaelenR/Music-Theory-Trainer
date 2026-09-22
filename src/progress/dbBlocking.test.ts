import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { getSetting, setSetting } from './db';

function openRaw(version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('piano-trainer', version);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

describe('database connection', () => {
  it('closes when a newer version needs to open, and callers fall back', async () => {
    await setSetting('x', 1);
    const newer = await openRaw(3);
    expect(newer.version).toBe(3);
    // The app's version is now too old to reopen: getters fall back instead of hanging.
    expect(await getSetting('x', 0)).toBe(0);
    newer.close();
  });
});
