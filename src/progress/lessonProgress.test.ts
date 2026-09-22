import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import { getAllLessonProgress, getSetting, recordLessonAttempt } from './db';

describe('lesson progress store', () => {
  it('upgrades a version-1 database without losing settings', async () => {
    const v1 = await openDB('piano-trainer', 1, { upgrade: (d) => void d.createObjectStore('kv') });
    await v1.put('kv', 5, 'tuningOffsetCents');
    v1.close();
    expect(await getSetting('tuningOffsetCents', 0)).toBe(5);
    expect(await getAllLessonProgress()).toEqual([]);
  });

  it('keeps the best score and first pass time', async () => {
    expect(await recordLessonAttempt('grand-staff', 6, false, 1000)).toEqual({ lessonId: 'grand-staff', bestScore: 6, attempts: 1, passedAt: null });
    expect(await recordLessonAttempt('grand-staff', 9, true, 2000)).toEqual({ lessonId: 'grand-staff', bestScore: 9, attempts: 2, passedAt: 2000 });
    expect(await recordLessonAttempt('grand-staff', 5, false, 3000)).toEqual({ lessonId: 'grand-staff', bestScore: 9, attempts: 3, passedAt: 2000 });
    expect(await getAllLessonProgress()).toHaveLength(1);
  });
});
