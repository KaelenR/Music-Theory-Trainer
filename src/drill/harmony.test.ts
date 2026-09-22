import { describe, expect, it } from 'vitest';
import { seededRng } from './random';
import { createHarmony, DEFAULT_HARMONY, harmonyCandidates, type HarmonySettings } from './harmony';

const settings = (o: Partial<HarmonySettings> = {}): HarmonySettings => ({ ...DEFAULT_HARMONY, ...o });
const first = (s: HarmonySettings) => createHarmony(s).nextQuestion(new Map(), seededRng(1), null);

describe('harmony', () => {
  it('pairs each key with each chosen degree', () => {
    expect(harmonyCandidates(settings())).toHaveLength(12);
  });
  it('asks for a numeral in a named key and expects the chord', () => {
    const q = first(settings({ tonics: ['G'], degrees: [4] }));
    expect(q.itemKey).toBe('IV in G major');
    expect(q.prompt).toBe('IV in G major');
    expect(q.keySignature?.vexKey).toBe('G');
    expect(q.display).toEqual([]);
    expect(q.reveal[0]).toHaveLength(3);
    expect(q.answer).toEqual({ kind: 'chord', pitchClasses: [0, 4, 7] });
  });
  it('uses harmonic minor for V in minor keys', () => {
    const q = first(settings({ mode: 'minor', tonics: ['A'], degrees: [5] }));
    expect(q.prompt).toBe('V in A minor');
    expect(q.answer).toEqual({ kind: 'chord', pitchClasses: [4, 8, 11] });
    expect(q.keySignature?.vexKey).toBe('C');
  });
  it('can hide the key name', () => {
    expect(first(settings({ tonics: ['G'], degrees: [4], showKeyName: false })).prompt).toBe('IV');
  });
  it('throws with nothing to ask', () => {
    expect(() => createHarmony(settings({ degrees: [] }))).toThrow();
  });
});
