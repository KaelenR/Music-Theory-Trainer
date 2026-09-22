import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'piano-trainer';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(d, oldVersion) {
      if (oldVersion < 1) d.createObjectStore('kv');
      if (oldVersion < 2) d.createObjectStore('lessonProgress', { keyPath: 'lessonId' });
    },
  });
  return dbPromise;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await (await db()).get('kv', key);
    return value === undefined ? fallback : (value as T);
  } catch {
    return fallback;
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await (await db()).put('kv', value, key);
}

export interface LessonProgress {
  lessonId: string;
  bestScore: number;
  attempts: number;
  /** When the lesson was first passed (ms since epoch), or null. */
  passedAt: number | null;
}

export async function getAllLessonProgress(): Promise<LessonProgress[]> {
  try {
    return (await (await db()).getAll('lessonProgress')) as LessonProgress[];
  } catch {
    return [];
  }
}

export async function recordLessonAttempt(
  lessonId: string,
  score: number,
  passed: boolean,
  now: number = Date.now(),
): Promise<LessonProgress> {
  const d = await db();
  const prev = (await d.get('lessonProgress', lessonId)) as LessonProgress | undefined;
  const next: LessonProgress = {
    lessonId,
    bestScore: Math.max(prev?.bestScore ?? 0, score),
    attempts: (prev?.attempts ?? 0) + 1,
    passedAt: prev?.passedAt ?? (passed ? now : null),
  };
  await d.put('lessonProgress', next);
  return next;
}
