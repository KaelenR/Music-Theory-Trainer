import { describe, expect, it } from 'vitest';
import { playChord, playNotes } from './build';
import { TryItSession } from './tryItSession';
import type { Heard } from '../drill/types';
import type { TryStep } from './types';

const note = (midi: number): Heard => ({ kind: 'note', midi, time: 0 });
const chord = (...pcs: number[]): Heard => ({ kind: 'chord', chroma: Array.from({ length: 12 }, (_, pc) => (pcs.includes(pc) ? 1 : 0)), time: 0 });
const step = (answer: TryStep['answer']): TryStep => ({ prompt: 'p', answer, hint: 'h' });

describe('TryItSession', () => {
  it('walks through note steps with progress and retries', () => {
    const s = new TryItSession([step(playNotes('C4', 'E4')), step(playChord('C4', 'E4', 'G4'))]);
    expect(s.hear(note(60))).toBe('progress');
    expect(s.matched).toBe(1);
    expect(s.hear(note(65))).toBe('wrong');
    expect(s.missed).toBe(true);
    expect(s.hear(note(64))).toBe('correct');
    expect(s.state).toBe('correct');
    expect(s.hear(note(64))).toBe('ignored');
    s.next();
    expect(s.index).toBe(1);
    expect(s.missed).toBe(false);
    expect(s.hear(note(60))).toBe('ignored');
    expect(s.hear(chord(0, 4, 7))).toBe('correct');
    s.next();
    expect(s.state).toBe('done');
    expect(s.current).toBeNull();
  });
  it('ignores silent chord frames', () => {
    const s = new TryItSession([step(playChord('C4', 'E4', 'G4'))]);
    expect(s.hear(chord())).toBe('ignored');
  });
  it('is done immediately with no steps', () => {
    expect(new TryItSession([]).state).toBe('done');
  });
});
