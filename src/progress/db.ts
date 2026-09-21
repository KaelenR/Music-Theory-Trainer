import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'piano-trainer';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(d) {
      d.createObjectStore('kv');
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
