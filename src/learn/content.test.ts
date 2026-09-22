import { describe, expect, it } from 'vitest';
import { createExercise } from '../drill/exercises';
import { seededRng } from '../drill/random';
import { pitchClass, toMidi } from '../music/note';
import { UNITS } from './curriculum';
import { allLessons } from './path';

const lessons = allLessons(UNITS);
const uniq = (xs: number[]) => [...new Set(xs)].sort((a, b) => a - b);

describe('curriculum content', () => {
  it('has unique kebab-case lesson ids', () => {
    const ids = lessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  for (const lesson of lessons) {
    describe(lesson.id, () => {
      it('has cards, 2–4 try-it steps and a working checkpoint drill', () => {
        expect(lesson.cards.length).toBeGreaterThan(0);
        expect(lesson.tryIt.length).toBeGreaterThanOrEqual(2);
        expect(lesson.tryIt.length).toBeLessThanOrEqual(4);
        const q = createExercise(lesson.drill).nextQuestion(new Map(), seededRng(1), null);
        expect(q.reveal.length).toBeGreaterThan(0);
      });

      lesson.tryIt.forEach((step, i) => {
        it(`try-it step ${i + 1} is consistent with its staff and keys`, () => {
          const staff = step.staff?.items.flatMap((item) => item.notes.map(toMidi)) ?? [];
          const answer = step.answer;
          if (answer.kind === 'notes') {
            const norm = (m: number) => (answer.anyOctave ? pitchClass(m) : m);
            expect(staff.map(norm)).toEqual(answer.midis.slice(0, staff.length).map(norm));
            if (step.keys) expect(uniq(step.keys.midis.map(norm))).toEqual(uniq(answer.midis.map(norm)));
          } else {
            for (const m of staff) expect(answer.pitchClasses).toContain(pitchClass(m));
            if (step.keys) expect(uniq(step.keys.midis.map(pitchClass))).toEqual(answer.pitchClasses);
          }
        });
      });
    });
  }
});
