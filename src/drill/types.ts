import type { Note } from '../music/note';
import type { StaffClef } from '../staff/types';
import type { Rng } from './random';

export interface Question {
  itemKey: string;
  notes: Note[];
  clef: StaffClef;
}

export interface HeardNote {
  midi: number;
  time: number;
}

export type CheckResult = 'correct' | 'wrong';

export interface Exercise {
  nextQuestion(weights: ReadonlyMap<string, number>, rng: Rng, previous: Question | null): Question;
  check(q: Question, heard: HeardNote): CheckResult;
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
