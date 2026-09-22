import { describe, expect, it } from 'vitest';
import { DrillSession, type SessionOptions } from './session';
import type { Answer, Exercise, Heard, Question } from './types';

const notesAnswer = (...midis: number[]): Answer => ({ kind: 'notes', midis, anyOctave: false });

function fakeExercise(answer: Answer = notesAnswer(60), sameKey = false) {
  let i = 0;
  const seenWeights: Map<string, number>[] = [];
  const ex: Exercise = {
    nextQuestion(weights) {
      seenWeights.push(new Map(weights));
      const q: Question = { itemKey: sameKey ? 'same' : `q${i++}`, clef: 'treble', display: [], reveal: [], answer };
      return q;
    },
  };
  return { ex, seenWeights };
}

const note = (midi: number): Heard => ({ kind: 'note', midi, time: 0 });
const chordOf = (...pcs: number[]): Heard => ({
  kind: 'chord',
  chroma: Array.from({ length: 12 }, (_, pc) => (pcs.includes(pc) ? 1 : 0)),
  time: 0,
});
const RIGHT = note(60);
const WRONG = note(61);
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
    const { ex, seenWeights } = fakeExercise(notesAnswer(60), true);
    const s = new DrillSession(ex, opts({ missMode: 'move-on', length: 'endless' }));
    s.start();
    s.hear(WRONG);
    s.advance();
    s.hear(WRONG);
    s.advance();
    expect(seenWeights[2].get('same')).toBe(2);
    s.hear(RIGHT);
    s.advance();
    expect(seenWeights[3].get('same')).toBe(1);
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

  it('tracks progress through a multi-note answer', () => {
    const s = new DrillSession(fakeExercise(notesAnswer(60, 62, 64)).ex, opts());
    s.start();
    expect(s.hear(note(60))).toBe('progress');
    expect(s.matched).toBe(1);
    expect(s.hear(note(62))).toBe('progress');
    expect(s.hear(note(64))).toBe('correct');
    expect(s.log[0]).toMatchObject({ firstTryCorrect: true, misses: 0 });
  });

  it('keeps the position after a wrong note mid-sequence in retry mode', () => {
    const s = new DrillSession(fakeExercise(notesAnswer(60, 62)).ex, opts({ missMode: 'retry' }));
    s.start();
    s.hear(note(60));
    expect(s.hear(note(65))).toBe('wrong');
    expect(s.matched).toBe(1);
    expect(s.hear(note(62))).toBe('correct');
    expect(s.log[0]).toMatchObject({ firstTryCorrect: false, misses: 1 });
  });

  it('resets progress for the next question', () => {
    const s = new DrillSession(fakeExercise(notesAnswer(60, 62)).ex, opts());
    s.start();
    s.hear(note(60));
    s.hear(note(62));
    s.advance();
    expect(s.matched).toBe(0);
  });

  it('matches chord answers from chroma and ignores single notes', () => {
    const s = new DrillSession(fakeExercise({ kind: 'chord', pitchClasses: [0, 4, 7] }).ex, opts());
    s.start();
    expect(s.hear(RIGHT)).toBe('ignored');
    expect(s.hear(chordOf(0, 3, 7))).toBe('wrong');
    expect(s.hear(chordOf(0, 4, 7))).toBe('correct');
  });

  it('ignores a silent chord event', () => {
    const s = new DrillSession(fakeExercise({ kind: 'chord', pitchClasses: [0, 4, 7] }).ex, opts());
    s.start();
    expect(s.hear(chordOf())).toBe('ignored');
    expect(s.hear(chordOf(0, 4, 7))).toBe('correct');
    expect(s.log[0]).toMatchObject({ firstTryCorrect: true, misses: 0 });
  });

  it('ignores a replay of the note just matched', () => {
    const { ex, seenWeights } = fakeExercise(notesAnswer(60, 62));
    const s = new DrillSession(ex, opts());
    s.start();
    expect(s.hear(note(60))).toBe('progress');
    expect(s.hear(note(60))).toBe('ignored');
    expect(s.matched).toBe(1);
    expect(s.hear(note(62))).toBe('correct');
    expect(s.log[0]).toMatchObject({ firstTryCorrect: true, misses: 0 });
    s.advance();
    expect(seenWeights[1].size).toBe(0);
  });

  it('ignores chord events for note answers', () => {
    const s = new DrillSession(fakeExercise().ex, opts());
    s.start();
    expect(s.hear(chordOf(0, 4, 7))).toBe('ignored');
  });
});
