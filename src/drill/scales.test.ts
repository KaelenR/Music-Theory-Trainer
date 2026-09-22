import { describe, expect, it } from 'vitest';
import { parseNote } from '../music/note';
import { seededRng } from './random';
import { createScales, DEFAULT_SCALES, scaleCandidates, type ScaleSettings } from './scales';

const settings = (o: Partial<ScaleSettings> = {}): ScaleSettings => ({ ...DEFAULT_SCALES, ...o });
const noWeights = new Map<string, number>();

describe('scaleCandidates', () => {
  it('covers the common keys for each chosen type', () => {
    expect(scaleCandidates(settings())).toHaveLength(9);
    expect(scaleCandidates(settings({ types: ['major', 'natural-minor'] }))).toHaveLength(18);
    expect(scaleCandidates(settings({ moreKeys: true }))).toHaveLength(14);
  });

  it('limits tonics when a list is given', () => {
    expect(scaleCandidates(settings({ tonics: ['C', 'G', 'F'] })).map((c) => c.label)).toEqual(['C major', 'G major', 'F major']);
    expect(scaleCandidates(settings({ tonics: ['Bb'], types: ['major', 'natural-minor'] }))).toHaveLength(2);
  });
});

describe('createScales', () => {
  it('throws with no types', () => {
    expect(() => createScales(settings({ types: [] }))).toThrow();
  });

  it('shows the notes with the key signature and expects them in order', () => {
    const pool = scaleCandidates(settings());
    const d = pool.find((c) => c.key.startsWith('D major'))!;
    expect(d.keySignature.vexKey).toBe('D');
    const ex = createScales(settings());
    const rng = seededRng(4);
    let q = ex.nextQuestion(noWeights, rng, null);
    while (!q.itemKey.startsWith('D major')) q = ex.nextQuestion(noWeights, rng, null);
    expect(q.display).toHaveLength(8);
    expect(q.display[2]).toEqual([parseNote('F#4')]);
    expect(q.answer).toEqual({ kind: 'notes', midis: [62, 64, 66, 67, 69, 71, 73, 74], anyOctave: false });
    expect(q.prompt).toBe('D major · up one octave');
  });

  it('shows only the key signature and accepts any octave when asked', () => {
    const ex = createScales(settings({ keySignatureOnly: true, direction: 'up-down' }));
    const q = ex.nextQuestion(noWeights, seededRng(1), null);
    expect(q.display).toEqual([]);
    expect(q.reveal).toHaveLength(15);
    expect(q.answer).toMatchObject({ kind: 'notes', anyOctave: true });
    expect(q.prompt).toMatch(/up and back down$/);
  });

  it('writes bass-clef scales an octave lower', () => {
    const ex = createScales(settings({ clef: 'bass' }));
    const q = ex.nextQuestion(noWeights, seededRng(1), null);
    expect(q.display[0][0].octave).toBe(3);
  });
});
