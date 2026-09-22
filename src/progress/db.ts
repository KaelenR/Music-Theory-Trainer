import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'piano-trainer';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (dbPromise) return dbPromise;
  const opening = new Promise<IDBPDatabase>((resolve, reject) => {
    let gaveUp = false;
    openDB(DB_NAME, DB_VERSION, {
      upgrade(d, oldVersion) {
        if (oldVersion < 1) d.createObjectStore('kv');
        if (oldVersion < 2) d.createObjectStore('lessonProgress', { keyPath: 'lessonId' });
      },
      blocked() {
        // An older version is still open elsewhere (another tab): fail now so callers fall back,
        // and try again on the next call.
        gaveUp = true;
        if (dbPromise === opening) dbPromise = null;
        reject(new Error('Database upgrade blocked by another open copy of the app'));
      },
      blocking(_currentVersion, _blockedVersion, event) {
        // A newer version wants to open (e.g. an updated tab): step aside; the next call reopens.
        (event.target as IDBDatabase).close();
        if (dbPromise === opening) dbPromise = null;
      },
    }).then((d) => {
      if (gaveUp) d.close();
      else resolve(d);
    }, reject);
  });
  dbPromise = opening;
  return opening;
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
