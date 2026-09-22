import { DEFAULT_CHORDS, type ChordSettings } from '../drill/chords';
import type { ExerciseSettings } from '../drill/exercises';
import { DEFAULT_HARMONY, type HarmonySettings } from '../drill/harmony';
import { DEFAULT_INTERVALS, type IntervalSettings } from '../drill/intervals';
import { DEFAULT_NOTE_READING, type NoteReadingSettings } from '../drill/noteReading';
import { DEFAULT_SCALES, type ScaleSettings } from '../drill/scales';
import type { Answer } from '../drill/types';
import { chordPitchClasses } from '../music/chord';
import { diatonicTriad, type Mode } from '../music/harmony';
import { keySignatureFor } from '../music/key';
import { parseNote, pitchName, toMidi, type Note } from '../music/note';
import { scaleNotes, type ScaleDirection, type ScaleType } from '../music/scale';
import type { StaffClef, StaffView } from '../staff/types';
import type { KeyHighlight } from './types';

const parseAll = (names: string[]): Note[] => names.map(parseNote);

function scaleOrThrow(tonic: string, type: ScaleType, direction: ScaleDirection): Note[] {
  const notes = scaleNotes(parseNote(tonic), type, direction);
  if (!notes) throw new Error(`No ${type} scale on ${tonic}`);
  return notes;
}

function triadOrThrow(tonic: string, mode: Mode, degree: number): Note[] {
  const notes = diatonicTriad(parseNote(tonic), mode, degree);
  if (!notes) throw new Error(`No triad on degree ${degree} of ${tonic} ${mode}`);
  return notes;
}

/** Notes one after another. */
export function seq(clef: StaffClef, ...names: string[]): StaffView {
  return { clef, items: names.map((n) => ({ notes: [parseNote(n)] })) };
}

/** Groups of simultaneous notes, left to right. */
export function chords(clef: StaffClef, ...groups: string[][]): StaffView {
  return { clef, items: groups.map((g) => ({ notes: parseAll(g) })) };
}

export function scaleStaff(
  clef: StaffClef,
  tonic: string,
  type: ScaleType,
  opts: { direction?: ScaleDirection; keySignature?: boolean } = {},
): StaffView {
  const notes = scaleOrThrow(tonic, type, opts.direction ?? 'up');
  const keySignature = opts.keySignature ? keySignatureFor(parseNote(tonic), type) ?? undefined : undefined;
  return { clef, keySignature, items: notes.map((n) => ({ notes: [n] })) };
}

export function keySignatureStaff(clef: StaffClef, tonic: string, type: ScaleType): StaffView {
  const keySignature = keySignatureFor(parseNote(tonic), type);
  if (!keySignature) throw new Error(`No key signature for ${tonic} ${type}`);
  return { clef, keySignature, items: [] };
}

export function diatonicStaff(clef: StaffClef, tonic: string, mode: Mode, degrees: number[]): StaffView {
  const keySignature = keySignatureFor(parseNote(tonic), mode === 'major' ? 'major' : 'natural-minor') ?? undefined;
  return { clef, keySignature, items: degrees.map((d) => ({ notes: triadOrThrow(tonic, mode, d) })) };
}

export function playNotes(...names: string[]): Answer {
  return { kind: 'notes', midis: parseAll(names).map(toMidi), anyOctave: false };
}

export function playScale(
  tonic: string,
  type: ScaleType,
  opts: { direction?: ScaleDirection; anyOctave?: boolean } = {},
): Answer {
  return { kind: 'notes', midis: scaleOrThrow(tonic, type, opts.direction ?? 'up').map(toMidi), anyOctave: opts.anyOctave ?? false };
}

export function playChord(...names: string[]): Answer {
  return { kind: 'chord', pitchClasses: chordPitchClasses(parseAll(names)) };
}

export function playDiatonic(tonic: string, mode: Mode, degree: number): Answer {
  return { kind: 'chord', pitchClasses: chordPitchClasses(triadOrThrow(tonic, mode, degree)) };
}

export function keys(...names: string[]): KeyHighlight {
  const labels: Record<number, string> = {};
  const midis = parseAll(names).map((n) => {
    const m = toMidi(n);
    labels[m] = pitchName(n);
    return m;
  });
  return { midis, labels };
}

/** Checkpoint presets: the drill's defaults plus overrides. */
export const drill = {
  noteReading: (o: Partial<NoteReadingSettings> = {}): ExerciseSettings => ({ type: 'note-reading', ...structuredClone(DEFAULT_NOTE_READING), ...o }),
  intervals: (o: Partial<IntervalSettings> = {}): ExerciseSettings => ({ type: 'intervals', ...structuredClone(DEFAULT_INTERVALS), ...o }),
  chords: (o: Partial<ChordSettings> = {}): ExerciseSettings => ({ type: 'chords', ...structuredClone(DEFAULT_CHORDS), ...o }),
  scales: (o: Partial<ScaleSettings> = {}): ExerciseSettings => ({ type: 'scales', ...structuredClone(DEFAULT_SCALES), ...o }),
  harmony: (o: Partial<HarmonySettings> = {}): ExerciseSettings => ({ type: 'harmony', ...structuredClone(DEFAULT_HARMONY), ...o }),
};
