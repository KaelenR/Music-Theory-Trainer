import type { ExerciseSettings } from '../drill/exercises';
import type { Answer } from '../drill/types';
import type { StaffView } from '../staff/types';

export interface KeyHighlight {
  midis: number[];
  /** Note names to print on keys, by MIDI number (keeps the lesson's spelling, e.g. B♭ not A♯). */
  labels?: Record<number, string>;
}

export interface Card {
  /** Short paragraphs separated by blank lines; **bold** is the only markup. */
  text: string;
  staff?: StaffView;
  keys?: KeyHighlight;
}

export interface TryStep {
  prompt: string;
  answer: Answer;
  staff?: StaffView;
  /** Target keys; shown after a miss. */
  keys?: KeyHighlight;
  hint: string;
}

export interface Lesson {
  /** Stable kebab-case id; keys saved progress. */
  id: string;
  title: string;
  cards: Card[];
  tryIt: TryStep[];
  /** Checkpoint drill preset. */
  drill: ExerciseSettings;
}

export interface Unit {
  id: string;
  title: string;
  lessons: Lesson[];
}
