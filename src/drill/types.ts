import type { KeySignature } from '../music/key';
import type { Note } from '../music/note';
import type { StaffClef } from '../staff/types';
import type { Rng } from './random';

/** What the player must play: notes one at a time in order, or pitch classes sounding together. */
export type Answer =
  | { kind: 'notes'; midis: number[]; anyOctave: boolean }
  | { kind: 'chord'; pitchClasses: number[] };

export interface Question {
  itemKey: string;
  clef: StaffClef;
  /** Drawn while asking, in playing order; each entry sounds together. Empty = staff only. */
  display: Note[][];
  /** Drawn once answered or revealed; may include notes hidden while asking. */
  reveal: Note[][];
  keySignature?: KeySignature;
  /** Text shown above the staff, e.g. "major 3rd up" or "F♯m7". */
  prompt?: string;
  answer: Answer;
}

export type Heard =
  | { kind: 'note'; midi: number; time: number }
  | { kind: 'chord'; chroma: ArrayLike<number>; time: number };

export type HearResult = 'progress' | 'correct' | 'wrong' | 'ignored';

export interface Exercise {
  nextQuestion(weights: ReadonlyMap<string, number>, rng: Rng, previous: Question | null): Question;
}

export type MissMode = 'retry' | 'move-on';
export type SessionLength = 10 | 20 | 50 | 'endless';

export interface QuestionLogEntry {
  itemKey: string;
  firstTryCorrect: boolean;
  misses: number;
  responseMs: number;
  askedAt: number;
}
