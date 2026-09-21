import type { Note } from '../music/note';

export type StaffClef = 'treble' | 'bass' | 'grand';
export type Highlight = 'correct' | 'wrong' | 'answer' | null;

export interface StaffView {
  clef: StaffClef;
  notes: Note[];
  highlight?: Highlight;
}
