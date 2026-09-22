import { createChords, DEFAULT_CHORDS, type ChordSettings } from './chords';
import { createHarmony, DEFAULT_HARMONY, type HarmonySettings } from './harmony';
import { createIntervals, DEFAULT_INTERVALS, type IntervalSettings } from './intervals';
import { createNoteReading, DEFAULT_NOTE_READING, type NoteReadingSettings } from './noteReading';
import { createScales, DEFAULT_SCALES, type ScaleSettings } from './scales';
import type { Exercise } from './types';

export type ExerciseType = 'note-reading' | 'intervals' | 'chords' | 'scales' | 'harmony';

export type ExerciseSettings =
  | ({ type: 'note-reading' } & NoteReadingSettings)
  | ({ type: 'intervals' } & IntervalSettings)
  | ({ type: 'chords' } & ChordSettings)
  | ({ type: 'scales' } & ScaleSettings)
  | ({ type: 'harmony' } & HarmonySettings);

export const EXERCISE_TYPES: ExerciseType[] = ['note-reading', 'intervals', 'chords', 'scales', 'harmony'];

export const EXERCISE_LABELS: Record<ExerciseType, string> = {
  'note-reading': 'Note reading',
  intervals: 'Intervals',
  chords: 'Chords',
  scales: 'Scales',
  harmony: 'Harmony',
};

export function defaultSettings(type: ExerciseType): ExerciseSettings {
  switch (type) {
    case 'note-reading':
      return { type, ...structuredClone(DEFAULT_NOTE_READING) };
    case 'intervals':
      return { type, ...structuredClone(DEFAULT_INTERVALS) };
    case 'chords':
      return { type, ...structuredClone(DEFAULT_CHORDS) };
    case 'scales':
      return { type, ...structuredClone(DEFAULT_SCALES) };
    case 'harmony':
      return { type, ...structuredClone(DEFAULT_HARMONY) };
  }
}

export function createExercise(s: ExerciseSettings): Exercise {
  switch (s.type) {
    case 'note-reading':
      return createNoteReading(s);
    case 'intervals':
      return createIntervals(s);
    case 'chords':
      return createChords(s);
    case 'scales':
      return createScales(s);
    case 'harmony':
      return createHarmony(s);
  }
}

/** IndexedDB key for a type's last-used setup. Note reading keeps its original key so saved setups survive. */
export function setupKey(type: ExerciseType): string {
  return type === 'note-reading' ? 'noteReadingSetup' : `${type}Setup`;
}
