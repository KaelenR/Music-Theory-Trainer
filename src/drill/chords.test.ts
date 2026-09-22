import { describe, expect, it } from 'vitest';
import { noteName } from '../music/note';
import { seededRng } from './random';
import { chordCandidates, createChords, DEFAULT_CHORDS, type ChordSettings } from './chords';

const settings = (o: Partial<ChordSettings> = {}): ChordSettings => ({ ...DEFAULT_CHORDS, ...o });
const noWeights = new Map<string, number>();

describe('chordCandidates', () => {
  it('uses natural roots and the chosen qualities', () => {
    expect(chordCandidates(settings())).toHaveLength(14);
    expect(chordCandidates(settings({ accidentalRoots: true }))).toHaveLength(24);
    expect(chordCandidates(settings({ inversions: true }))).toHaveLength(42);
  });
  it('skips inversions when only the name is shown', () => {
    expect(chordCandidates(settings({ inversions: true, showName: true }))).toHaveLength(14);
  });
});

describe('createChords', () => {
  it('throws with no qualities', () => {
    expect(() => createChords(settings({ qualities: [] }))).toThrow();
  });

  it('shows the chord on the staff and expects its pitch classes', () => {
    const ex = createChords(settings({ qualities: ['maj'] }));
    const q = ex.nextQuestion(noWeights, seededRng(2), null);
    expect(q.display).toEqual(q.reveal);
    expect(q.display[0]).toHaveLength(3);
    expect(q.answer.kind).toBe('chord');
    expect(q.prompt).toBeUndefined();
  });

  it('can show only the chord name', () => {
    const ex = createChords(settings({ qualities: ['min7'], showName: true }));
    const q = ex.nextQuestion(noWeights, seededRng(2), null);
    expect(q.display).toEqual([]);
    expect(q.reveal[0]).toHaveLength(4);
    expect(q.prompt).toMatch(/m7$/);
  });

  it('spells C major in treble at octave 4', () => {
    const pool = chordCandidates(settings({ qualities: ['maj'] }));
    const c = pool.find((x) => x.key === 'C')!;
    expect(c.notes.map(noteName)).toEqual(['C4', 'E4', 'G4']);
  });
});
