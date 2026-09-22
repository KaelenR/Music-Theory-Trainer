import { describe, expect, it } from 'vitest';
import { parseNote } from '../music/note';
import { seededRng } from './random';
import { createIntervals, DEFAULT_INTERVALS, intervalCandidates, type IntervalSettings } from './intervals';

const settings = (o: Partial<IntervalSettings> = {}): IntervalSettings => ({ ...DEFAULT_INTERVALS, ...o });
const noWeights = new Map<string, number>();

describe('intervalCandidates', () => {
  it('pairs each natural root in range with each interval and direction', () => {
    expect(intervalCandidates(settings({ low: 'C4', high: 'C5', intervals: ['M3'] }))).toHaveLength(8);
    expect(intervalCandidates(settings({ low: 'C4', high: 'C5', intervals: ['M3', 'P5'], direction: 'both' }))).toHaveLength(32);
  });
});

describe('createIntervals', () => {
  it('throws with nothing to ask', () => {
    expect(() => createIntervals(settings({ intervals: [] }))).toThrow();
  });

  it('asks a melodic interval: root shown, both notes to play in order', () => {
    const ex = createIntervals(settings({ low: 'C4', high: 'C4', intervals: ['M3'] }));
    const q = ex.nextQuestion(noWeights, seededRng(1), null);
    expect(q.itemKey).toBe('C4 M3↑');
    expect(q.display).toEqual([[parseNote('C4')]]);
    expect(q.reveal).toEqual([[parseNote('C4')], [parseNote('E4')]]);
    expect(q.prompt).toBe('major 3rd up');
    expect(q.answer).toEqual({ kind: 'notes', midis: [60, 64], anyOctave: false });
  });

  it('leaves out the octave when harmonic, since pitch classes cannot confirm it', () => {
    expect(() => createIntervals(settings({ intervals: ['P8'], harmonic: true }))).toThrow();
    const ex = createIntervals(settings({ low: 'C4', high: 'C4', intervals: ['P8'] }));
    expect(ex.nextQuestion(noWeights, seededRng(1), null).answer).toEqual({ kind: 'notes', midis: [60, 72], anyOctave: false });
  });

  it('asks a harmonic interval as a two-note chord', () => {
    const ex = createIntervals(settings({ low: 'C4', high: 'C4', intervals: ['P5'], harmonic: true }));
    const q = ex.nextQuestion(noWeights, seededRng(1), null);
    expect(q.reveal).toEqual([[parseNote('C4'), parseNote('G4')]]);
    expect(q.answer).toEqual({ kind: 'chord', pitchClasses: [0, 7] });
  });

  it('shows both notes when reading intervals', () => {
    const ex = createIntervals(settings({ low: 'C4', high: 'C4', intervals: ['m3'], showTarget: true }));
    const q = ex.nextQuestion(noWeights, seededRng(1), null);
    expect(q.display).toEqual(q.reveal);
  });

  it('goes down when asked', () => {
    const ex = createIntervals(settings({ low: 'C4', high: 'C4', intervals: ['m2'], direction: 'down' }));
    expect(ex.nextQuestion(noWeights, seededRng(1), null).answer).toEqual({ kind: 'notes', midis: [60, 59], anyOctave: false });
  });

  it('never repeats the previous item', () => {
    const ex = createIntervals(settings({ low: 'C4', high: 'D4', intervals: ['M3'] }));
    const rng = seededRng(5);
    let prev = ex.nextQuestion(noWeights, rng, null);
    for (let i = 0; i < 10; i++) {
      const q = ex.nextQuestion(noWeights, rng, prev);
      expect(q.itemKey).not.toBe(prev.itemKey);
      prev = q;
    }
  });
});
