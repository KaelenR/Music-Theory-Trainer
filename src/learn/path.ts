import type { DrillConfig } from '../drill/config';
import { CHECKPOINT_LENGTH } from './progress';
import type { Lesson, Unit } from './types';

export function allLessons(units: Unit[]): Lesson[] {
  return units.flatMap((u) => u.lessons);
}

export function findLesson(units: Unit[], id: string): { lesson: Lesson; unit: Unit } | null {
  for (const unit of units) {
    const lesson = unit.lessons.find((l) => l.id === id);
    if (lesson) return { lesson, unit };
  }
  return null;
}

export function nextLesson(units: Unit[], passed: ReadonlySet<string>): Lesson | null {
  return allLessons(units).find((l) => !passed.has(l.id)) ?? null;
}

export function lessonAfter(units: Unit[], id: string): Lesson | null {
  const lessons = allLessons(units);
  const i = lessons.findIndex((l) => l.id === id);
  return i >= 0 && i + 1 < lessons.length ? lessons[i + 1] : null;
}

export function checkpointConfig(lesson: Lesson): DrillConfig {
  return {
    exercise: structuredClone(lesson.drill),
    session: { length: CHECKPOINT_LENGTH, missMode: 'move-on', weighting: true },
  };
}
