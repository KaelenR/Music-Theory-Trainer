import { describe, expect, it } from 'vitest';
import { drill } from './build';
import { checkpointConfig, findLesson, lessonAfter, nextLesson, allLessons } from './path';
import type { Lesson, Unit } from './types';

const lesson = (id: string): Lesson => ({ id, title: id, cards: [{ text: id }], tryIt: [], drill: drill.noteReading() });
const units: Unit[] = [
  { id: 'u1', title: 'One', lessons: [lesson('a'), lesson('b')] },
  { id: 'u2', title: 'Two', lessons: [lesson('c')] },
];

describe('path helpers', () => {
  it('flattens lessons in order', () => {
    expect(allLessons(units).map((l) => l.id)).toEqual(['a', 'b', 'c']);
  });
  it('finds a lesson with its unit', () => {
    expect(findLesson(units, 'c')?.unit.id).toBe('u2');
    expect(findLesson(units, 'zzz')).toBeNull();
  });
  it('picks the first unpassed lesson', () => {
    expect(nextLesson(units, new Set())?.id).toBe('a');
    expect(nextLesson(units, new Set(['a']))?.id).toBe('b');
    expect(nextLesson(units, new Set(['a', 'b', 'c']))).toBeNull();
  });
  it('finds the following lesson across units', () => {
    expect(lessonAfter(units, 'b')?.id).toBe('c');
    expect(lessonAfter(units, 'c')).toBeNull();
  });
  it('builds a 10-question move-on checkpoint', () => {
    const c = checkpointConfig(lesson('a'));
    expect(c.session).toEqual({ length: 10, missMode: 'move-on', weighting: true });
    expect(c.exercise.type).toBe('note-reading');
  });
});
