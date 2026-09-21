import { describe, expect, it } from 'vitest';
import { DrillSession, type SessionOptions } from './session';
import type { Exercise, Question } from './types';

function fakeExercise() {
  let i = 0;
  const seenWeights: Map<string, number>[] = [];
  const ex: Exercise = {
    nextQuestion(weights) {
      seenWeights.push(new Map(weights));
      return { itemKey: `q${i++}`, notes: [], clef: 'treble' } satisfies Question;
    },
    check: (_q, h) => (h.midi === 60 ? 'correct' : 'wrong'),
  };
  return { ex, seenWeights };
}

const RIGHT = { midi: 60, time: 0 };
const WRONG = { midi: 61, time: 0 };
const opts = (o: Partial<SessionOptions> = {}): SessionOptions => ({ length: 10, missMode: 'retry', weighting: true, ...o });

describe('DrillSession', () => {
  it('starts by asking the first question', () => {
    const s = new DrillSession(fakeExercise().ex, opts());
    expect(s.state).toBe('idle');
    s.start();
    expect(s.state).toBe('asking');
    expect(s.current?.itemKey).toBe('q0');
  });

  it('records a first-try correct answer and advances', () => {
    let t = 1000;
    const s = new DrillSession(fakeExercise().ex, opts(), Math.random, () => t);
    s.start();
    t = 1800;
    expect(s.hear(RIGHT)).toBe('correct');
    expect(s.state).toBe('answered');
    expect(s.log).toEqual([{ itemKey: 'q0', firstTryCorrect: true, misses: 0, responseMs: 800, askedAt: 1000 }]);
    s.advance();
    expect(s.state).toBe('asking');
    expect(s.current?.itemKey).toBe('q1');
  });

  it('retry mode keeps the question until correct and counts the miss', () => {
    const s = new DrillSession(fakeExercise().ex, opts({ missMode: 'retry' }));
    s.start();
    expect(s.hear(WRONG)).toBe('wrong');
    expect(s.state).toBe('asking');
    expect(s.current?.itemKey).toBe('q0');
    expect(s.log).toHaveLength(0);
    expect(s.hear(RIGHT)).toBe('correct');
    expect(s.log[0]).toMatchObject({ itemKey: 'q0', firstTryCorrect: false, misses: 1 });
  });

  it('move-on mode reveals after one miss and ignores input while revealing', () => {
    const s = new DrillSession(fakeExercise().ex, opts({ missMode: 'move-on' }));
    s.start();
    expect(s.hear(WRONG)).toBe('wrong');
    expect(s.state).toBe('revealing');
    expect(s.log[0]).toMatchObject({ firstTryCorrect: false, misses: 1 });
    expect(s.hear(RIGHT)).toBe('ignored');
    s.advance();
    expect(s.current?.itemKey).toBe('q1');
  });

  it('ends after a fixed number of questions', () => {
    const s = new DrillSession(fakeExercise().ex, opts({ length: 10 }));
    s.start();
    for (let i = 0; i < 10; i++) {
      s.hear(RIGHT);
      s.advance();
    }
    expect(s.state).toBe('done');
    expect(s.log).toHaveLength(10);
    expect(s.hear(RIGHT)).toBe('ignored');
  });

  it('endless mode continues until finish()', () => {
    const s = new DrillSession(fakeExercise().ex, opts({ length: 'endless' }));
    s.start();
    for (let i = 0; i < 60; i++) {
      s.hear(RIGHT);
      s.advance();
    }
    expect(s.state).toBe('asking');
    s.finish();
    expect(s.state).toBe('done');
  });

  it('passes miss weights to the exercise when weighting is on', () => {
    const { ex, seenWeights } = fakeExercise();
    const s = new DrillSession(ex, opts({ missMode: 'retry' }));
    s.start();
    s.hear(WRONG);
    s.hear(WRONG);
    s.hear(RIGHT);
    s.advance();
    expect(seenWeights[1].get('q0')).toBe(2);
  });

  it('counts a move-on miss in the weights', () => {
    const { ex, seenWeights } = fakeExercise();
    const s = new DrillSession(ex, opts({ missMode: 'move-on' }));
    s.start();
    s.hear(WRONG);
    s.advance();
    expect(seenWeights[1].get('q0')).toBe(1);
  });

  it('reduces an item weight after a later first-try correct answer', () => {
    const q: Question = { itemKey: 'same', notes: [], clef: 'treble' };
    const seen: Map<string, number>[] = [];
    const ex: Exercise = {
      nextQuestion(weights) { seen.push(new Map(weights)); return q; },
      check: (_q, h) => (h.midi === 60 ? 'correct' : 'wrong'),
    };
    const s = new DrillSession(ex, opts({ missMode: 'move-on', length: 'endless' }));
    s.start();
    s.hear(WRONG);
    s.advance();
    s.hear(WRONG);
    s.advance();
    expect(seen[2].get('same')).toBe(2);
    s.hear(RIGHT);
    s.advance();
    expect(seen[3].get('same')).toBe(1);
  });

  it('passes empty weights when weighting is off', () => {
    const { ex, seenWeights } = fakeExercise();
    const s = new DrillSession(ex, opts({ weighting: false }));
    s.start();
    s.hear(WRONG);
    s.hear(RIGHT);
    s.advance();
    expect(seenWeights[1].size).toBe(0);
  });

  it('computes stats', () => {
    let t = 0;
    const s = new DrillSession(fakeExercise().ex, opts({ missMode: 'move-on', length: 'endless' }), Math.random, () => t);
    s.start();
    const answers = [RIGHT, RIGHT, WRONG, RIGHT, RIGHT, RIGHT];
    for (const a of answers) {
      t += 1000;
      s.hear(a);
      s.advance();
    }
    expect(s.stats()).toEqual({ asked: 6, correct: 5, accuracy: 5 / 6, avgResponseMs: 1000, bestRun: 3 });
  });

  it('returns zeroed stats with no answers', () => {
    const s = new DrillSession(fakeExercise().ex, opts());
    expect(s.stats()).toEqual({ asked: 0, correct: 0, accuracy: 0, avgResponseMs: 0, bestRun: 0 });
  });
});
