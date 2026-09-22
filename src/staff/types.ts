import type { KeySignature } from '../music/key';
import type { Note } from '../music/note';

export type StaffClef = 'treble' | 'bass' | 'grand';
export type Highlight = 'correct' | 'wrong' | 'answer' | null;

/** One notation position; its notes sound together. */
export interface StaffItem {
  notes: Note[];
  highlight?: Highlight;
}

export interface StaffView {
  clef: StaffClef;
  keySignature?: KeySignature;
  /** Drawn left to right. Empty draws only the clef (and key signature). */
  items: StaffItem[];
}
