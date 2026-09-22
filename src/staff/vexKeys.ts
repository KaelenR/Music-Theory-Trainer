import { toMidi, type Alter, type Note, type Step } from '../music/note';
import type { StaffClef } from './types';

export type AccidentalCode = '#' | 'b' | 'n';

export function toVexKey(n: Note): string {
  const acc = n.alter === 1 ? '#' : n.alter === -1 ? 'b' : '';
  return `${n.step.toLowerCase()}${acc}/${n.octave}`;
}

/**
 * Accidentals to draw for groups of notes read left to right in one measure: a note needs one
 * only when its alteration differs from what the key signature or an earlier accidental on the
 * same line/space already implies.
 */
export function accidentalsFor(
  groups: Note[][],
  keyAlters: Partial<Record<Step, Alter>> = {},
): (AccidentalCode | null)[][] {
  const inEffect = new Map<string, Alter>();
  return groups.map((group) =>
    group.map((n) => {
      const position = `${n.step}${n.octave}`;
      const current = inEffect.get(position) ?? keyAlters[n.step] ?? 0;
      if (n.alter === current) return null;
      inEffect.set(position, n.alter);
      return n.alter === 1 ? '#' : n.alter === -1 ? 'b' : 'n';
    }),
  );
}

export function staffForNote(n: Note): 'treble' | 'bass' {
  return toMidi(n) >= 60 ? 'treble' : 'bass';
}

export function splitByStaff(clef: StaffClef, notes: Note[]): { treble: Note[]; bass: Note[] } {
  if (clef === 'treble') return { treble: notes, bass: [] };
  if (clef === 'bass') return { treble: [], bass: notes };
  return {
    treble: notes.filter((n) => staffForNote(n) === 'treble'),
    bass: notes.filter((n) => staffForNote(n) === 'bass'),
  };
}
