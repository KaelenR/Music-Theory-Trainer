import { toMidi, type Note } from '../music/note';
import type { StaffView } from './types';

export function accidentalOf(n: Note): '#' | 'b' | null {
  return n.alter === 1 ? '#' : n.alter === -1 ? 'b' : null;
}

export function toVexKey(n: Note): string {
  return `${n.step.toLowerCase()}${accidentalOf(n) ?? ''}/${n.octave}`;
}

export function staffForNote(n: Note): 'treble' | 'bass' {
  return toMidi(n) >= 60 ? 'treble' : 'bass';
}

export function splitByStaff(view: StaffView): { treble: Note[]; bass: Note[] } {
  if (view.clef === 'treble') return { treble: view.notes, bass: [] };
  if (view.clef === 'bass') return { treble: [], bass: view.notes };
  return {
    treble: view.notes.filter((n) => staffForNote(n) === 'treble'),
    bass: view.notes.filter((n) => staffForNote(n) === 'bass'),
  };
}
