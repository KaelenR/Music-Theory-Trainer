import { describe, expect, it } from 'vitest';
import { seededRng } from './random';
import { createExercise, defaultSettings, EXERCISE_TYPES, setupKey } from './exercises';

describe('exercises', () => {
  it('creates a working exercise for every type with its defaults', () => {
    for (const type of EXERCISE_TYPES) {
      const q = createExercise(defaultSettings(type)).nextQuestion(new Map(), seededRng(1), null);
      expect(q.reveal.length).toBeGreaterThan(0);
    }
  });
  it('keeps the original storage key for note reading', () => {
    expect(setupKey('note-reading')).toBe('noteReadingSetup');
    expect(setupKey('chords')).toBe('chordsSetup');
  });
});
