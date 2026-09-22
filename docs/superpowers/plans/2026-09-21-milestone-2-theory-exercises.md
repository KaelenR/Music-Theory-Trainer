# Milestone 2: Theory Exercises (Intervals, Chords, Scales) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add interval, chord and scale drills to the deployed note-reading app, including chord detection from the microphone and key-signature/sequence notation.

**Architecture:** Questions carry their own expected `Answer` (`notes` sequence or `chord` pitch classes); the `DrillSession` does all matching, so exercises only generate questions. Chords are heard through a 12-bin chroma vector computed from an 8192-point FFT, gated by a `ChordTracker` that shares its onset/silence logic (`OnsetDetector`) with the existing `NoteTracker`. The staff renderer gains note sequences, key signatures and measure-aware accidentals.

**Tech Stack:** Vite 8, Svelte 5 (runes), TypeScript 6, Vitest 5, VexFlow 5 (`vexflow/bravura`), pitchy 4, Web Audio `AnalyserNode`.

**Spec:** `docs/superpowers/specs/2026-09-21-piano-trainer-design.md` — this plan covers build-order stage 5 (§4.3 chord path, §5 intervals/chords/scales). Stage 4 (progress store, streaks, bests), stage 6 (stats, presets, backup) and stage 7 (sequences, badges) are out of scope.

## Global Constraints

- Repo: `C:\Users\Kaelen Raible\music_app\Music-Theory-Trainer` (Git Bash). Work on a feature branch; never push — the controller deploys.
- Chords are checked **by pitch class only** — any voicing/inversion/octave of the chord passes (spec §4.3).
- Chord pass rule: every expected pitch class ≥ `present` threshold relative to the strongest bin; every unexpected one < `absent` threshold (spec §4.3). Thresholds are constants tuned later on the real piano.
- Interval modes: melodic = the two notes played one at a time in order; harmonic = both pitch classes sounding together via the chord path (spec §5).
- Scales: each note played in order; each note turns green as it is played (spec §5).
- Loudness thresholds come only from calibration (`Levels.silenceRms`); never hard-code RMS values in app code. On the user's iPad a firm note arrives at rms ≈ 0.0003 (−71 dB), clarity ≈ 0.88.
- Existing behavior must keep working: note reading, calibration, retry/move-on, session lengths, weighting, wake lock, resume.
- Do not use TS constructor parameter properties. Files use CRLF on disk; use an editor, not `sed`, for multi-line edits.
- TypeScript 6.0.3 + svelte-check 4.7.6 quirk: write `let x = $state<T | null>(null)`, not `let x: T | null = $state(null)`.
- Every commit message ends with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` — use `git commit -m "<subject>" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.
- Before each commit: `npm test` (all pass) and `npm run check` (0 errors).

## File Structure

```
src/music/note.ts            + PITCH_CLASS_NAMES, pitchName()
src/music/interval.ts        NEW  interval table, transposeBy/transpose with correct spelling
src/music/chord.ts           NEW  chord qualities, chordNotes (inversions), chordName, chordPitchClasses
src/music/scale.ts           NEW  scale types, scaleNotes (up / up-down), scaleLabel
src/music/key.ts             NEW  key signatures (VexFlow key name + per-letter alterations)
src/staff/types.ts           StaffView → { clef, keySignature?, items: StaffItem[] }
src/staff/vexKeys.ts         accidentalsFor() (key + measure carry), splitByStaff(clef, notes)
src/staff/renderStaff.ts     sequences (quarter notes), key signatures, per-item highlights
src/drill/types.ts           Answer, Question{display, reveal, keySignature, prompt, answer}, Heard, HearResult
src/drill/answer.ts          NEW  matchNote, matchChord, heardPitchClasses, pitchClassNames, describeReveal
src/drill/session.ts         matching moved here; multi-note progress; chord events
src/drill/noteReading.ts     returns Questions with answers (no check())
src/drill/intervals.ts       NEW
src/drill/chords.ts          NEW
src/drill/scales.ts          NEW
src/drill/exercises.ts       NEW  ExerciseSettings union, createExercise, defaults, setupKey
src/drill/config.ts          DrillConfig uses ExerciseSettings
src/audio/onset.ts           NEW  OnsetDetector (extracted from NoteTracker)
src/audio/noteTracker.ts     uses OnsetDetector (behavior unchanged)
src/audio/chroma.ts          NEW  createChromaMap, chromaFromSpectrum
src/audio/chordTracker.ts    NEW  onset-gated, settled, averaged chroma events
src/audio/mic.ts             second analyser (8192) → AudioFrame.chroma; setTuningOffset
src/ui/Home.svelte           one button per exercise
src/ui/DrillSetup.svelte     generic: exercise options + shared session options
src/ui/options/*.svelte      NEW  per-exercise option panels + shared helpers
src/ui/Drill.svelte          generic drill: prompt, sequences, chords
src/ui/Calibrate.svelte      + live chroma bars and detected-chord log
src/App.svelte               setup screen carries the exercise type
src/app.css                  shared option-panel styles
```

---

### Task 1: Music theory model

**Files:**
- Modify: `src/music/note.ts`, `src/music/note.test.ts`
- Create: `src/music/interval.ts`, `src/music/chord.ts`, `src/music/scale.ts`, `src/music/key.ts`
- Test: `src/music/interval.test.ts`, `src/music/chord.test.ts`, `src/music/scale.test.ts`, `src/music/key.test.ts`

**Interfaces:**
- Consumes: `Note`, `Step`, `Alter`, `STEPS`, `toMidi`, `pitchClass`, `parseNote`, `noteName` from `note.ts`.
- Produces:
  - `PITCH_CLASS_NAMES: string[]` (12, display spelling), `pitchName(n: Note): string` (e.g. `"F♯"`)
  - `type IntervalName = 'm2'|'M2'|'m3'|'M3'|'P4'|'TT'|'P5'|'m6'|'M6'|'m7'|'M7'|'P8'`, `interface Interval { name; semitones; steps; label }`, `INTERVALS: Record<IntervalName, Interval>`, `INTERVAL_NAMES: IntervalName[]`
  - `transposeBy(n: Note, semitones: number, steps: number, direction: 'up'|'down'): Note | null` (null if a double accidental would be needed), `transpose(n, iv: Interval, direction = 'up'): Note | null`
  - `type ChordQuality = 'maj'|'min'|'dim'|'aug'|'dom7'|'maj7'|'min7'|'hdim7'|'dim7'`, `CHORD_QUALITIES: Record<ChordQuality, { suffix; label; tones: [number, number][] }>`, `CHORD_QUALITY_NAMES`, `chordNotes(root, quality, inversion = 0): Note[] | null`, `chordName(root, quality): string`, `chordPitchClasses(notes: Note[]): number[]`
  - `type ScaleType = 'major'|'natural-minor'|'harmonic-minor'|'melodic-minor'`, `type ScaleDirection = 'up'|'up-down'`, `SCALE_TYPES: Record<ScaleType, { label; steps: number[] }>`, `SCALE_TYPE_NAMES`, `scaleNotes(tonic, type, direction): Note[] | null`, `scaleLabel(tonic, type): string`
  - `interface KeySignature { vexKey: string; alters: Partial<Record<Step, Alter>> }`, `keySignatureFor(tonic: Note, type: ScaleType): KeySignature | null`

- [ ] **Step 1: Write the failing tests**

Append to `src/music/note.test.ts` (and add `PITCH_CLASS_NAMES, pitchName` to its import from `./note`):
```ts
describe('pitch names', () => {
  it('names pitch classes and notes without octave', () => {
    expect(PITCH_CLASS_NAMES).toHaveLength(12);
    expect(PITCH_CLASS_NAMES[6]).toBe('F♯');
    expect(pitchName(parseNote('F#4'))).toBe('F♯');
    expect(pitchName(parseNote('Bb3'))).toBe('B♭');
    expect(pitchName(parseNote('C5'))).toBe('C');
  });
});
```

`src/music/interval.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { noteName, parseNote } from './note';
import { INTERVAL_NAMES, INTERVALS, transpose } from './interval';

const up = (s: string, iv: keyof typeof INTERVALS) => {
  const r = transpose(parseNote(s), INTERVALS[iv], 'up');
  return r && noteName(r);
};
const down = (s: string, iv: keyof typeof INTERVALS) => {
  const r = transpose(parseNote(s), INTERVALS[iv], 'down');
  return r && noteName(r);
};

describe('transpose', () => {
  it('spells intervals by letter', () => {
    expect(up('C4', 'M3')).toBe('E4');
    expect(up('E4', 'm3')).toBe('G4');
    expect(up('F4', 'TT')).toBe('B4');
    expect(up('A4', 'P8')).toBe('A5');
    expect(up('B4', 'm2')).toBe('C5');
    expect(up('E4', 'M3')).toBe('G#4');
    expect(up('Bb3', 'P5')).toBe('F4');
  });
  it('goes down across octave boundaries', () => {
    expect(down('C4', 'm2')).toBe('B3');
    expect(down('D4', 'P5')).toBe('G3');
  });
  it('returns null when a double accidental would be needed', () => {
    expect(down('Gb4', 'M3')).toBeNull();
  });
  it('lists all twelve intervals in size order', () => {
    expect(INTERVAL_NAMES).toEqual(['m2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8']);
    expect(INTERVAL_NAMES.map((n) => INTERVALS[n].semitones)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});
```

`src/music/chord.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { noteName, parseNote } from './note';
import { chordName, chordNotes, chordPitchClasses } from './chord';

const names = (s: string, q: Parameters<typeof chordNotes>[1], inv = 0) =>
  chordNotes(parseNote(s), q, inv)?.map(noteName) ?? null;

describe('chordNotes', () => {
  it('builds correctly spelled chords', () => {
    expect(names('C4', 'maj')).toEqual(['C4', 'E4', 'G4']);
    expect(names('F#4', 'min')).toEqual(['F#4', 'A4', 'C#5']);
    expect(names('B3', 'dim')).toEqual(['B3', 'D4', 'F4']);
    expect(names('C4', 'aug')).toEqual(['C4', 'E4', 'G#4']);
    expect(names('Bb3', 'dom7')).toEqual(['Bb3', 'D4', 'F4', 'Ab4']);
    expect(names('C4', 'maj7')).toEqual(['C4', 'E4', 'G4', 'B4']);
    expect(names('D4', 'min7')).toEqual(['D4', 'F4', 'A4', 'C5']);
    expect(names('B3', 'hdim7')).toEqual(['B3', 'D4', 'F4', 'A4']);
    expect(names('B3', 'dim7')).toEqual(['B3', 'D4', 'F4', 'Ab4']);
  });
  it('inverts by raising the lowest notes an octave', () => {
    expect(names('C4', 'maj', 1)).toEqual(['E4', 'G4', 'C5']);
    expect(names('C4', 'maj', 2)).toEqual(['G4', 'C5', 'E5']);
    expect(names('G3', 'dom7', 3)).toEqual(['F4', 'G4', 'B4', 'D5']);
  });
  it('returns null for chords needing double accidentals', () => {
    expect(names('Cb4', 'dim7')).toBeNull();
  });
});

describe('chordName / chordPitchClasses', () => {
  it('names chords in lead-sheet style', () => {
    expect(chordName(parseNote('C4'), 'maj')).toBe('C');
    expect(chordName(parseNote('F#4'), 'min7')).toBe('F♯m7');
    expect(chordName(parseNote('Bb3'), 'dim')).toBe('B♭°');
  });
  it('lists sorted unique pitch classes', () => {
    expect(chordPitchClasses(chordNotes(parseNote('C4'), 'maj', 1)!)).toEqual([0, 4, 7]);
    expect(chordPitchClasses(chordNotes(parseNote('Bb3'), 'dom7')!)).toEqual([2, 5, 8, 10]);
  });
});
```

`src/music/scale.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { noteName, parseNote } from './note';
import { scaleLabel, scaleNotes } from './scale';

const names = (s: string, t: Parameters<typeof scaleNotes>[1], d: Parameters<typeof scaleNotes>[2] = 'up') =>
  scaleNotes(parseNote(s), t, d)?.map(noteName) ?? null;

describe('scaleNotes', () => {
  it('builds one octave up', () => {
    expect(names('D4', 'major')).toEqual(['D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5', 'D5']);
    expect(names('A4', 'natural-minor')).toEqual(['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5']);
    expect(names('A4', 'harmonic-minor')![6]).toBe('G#5');
    expect(names('Bb3', 'major')).toEqual(['Bb3', 'C4', 'D4', 'Eb4', 'F4', 'G4', 'A4', 'Bb4']);
  });
  it('comes back down, using natural minor on the way down for melodic minor', () => {
    const mel = names('A4', 'melodic-minor', 'up-down')!;
    expect(mel).toHaveLength(15);
    expect(mel.slice(5, 10)).toEqual(['F#5', 'G#5', 'A5', 'G5', 'F5']);
    expect(mel[14]).toBe('A4');
    const maj = names('C4', 'major', 'up-down')!;
    expect(maj[0]).toBe('C4');
    expect(maj[7]).toBe('C5');
    expect(maj[14]).toBe('C4');
  });
  it('labels scales', () => {
    expect(scaleLabel(parseNote('F#4'), 'harmonic-minor')).toBe('F♯ harmonic minor');
  });
});
```

`src/music/key.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseNote } from './note';
import { keySignatureFor } from './key';

describe('keySignatureFor', () => {
  it('gives sharps in order for sharp keys', () => {
    expect(keySignatureFor(parseNote('D4'), 'major')).toEqual({ vexKey: 'D', alters: { F: 1, C: 1 } });
  });
  it('gives flats in order for flat keys', () => {
    expect(keySignatureFor(parseNote('Bb3'), 'major')).toEqual({ vexKey: 'Bb', alters: { B: -1, E: -1 } });
  });
  it('uses the relative major for every minor scale type', () => {
    expect(keySignatureFor(parseNote('B3'), 'natural-minor')?.vexKey).toBe('D');
    expect(keySignatureFor(parseNote('A4'), 'harmonic-minor')).toEqual({ vexKey: 'C', alters: {} });
    expect(keySignatureFor(parseNote('D#4'), 'melodic-minor')?.vexKey).toBe('F#');
  });
  it('returns null for keys with no standard signature', () => {
    expect(keySignatureFor(parseNote('G#4'), 'major')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/music`
Expected: FAIL — `./interval`, `./chord`, `./scale`, `./key` cannot be resolved; `pitchName` not exported.

- [ ] **Step 3: Implement**

Add to `src/music/note.ts` (after `displayName`):
```ts
export const PITCH_CLASS_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

/** Note name without octave, with musical symbols (e.g. "F♯"). */
export function pitchName(n: Note): string {
  const acc = n.alter === 1 ? '♯' : n.alter === -1 ? '♭' : '';
  return `${n.step}${acc}`;
}
```

`src/music/interval.ts`:
```ts
import { STEPS, toMidi, type Alter, type Note } from './note';

export type IntervalName = 'm2' | 'M2' | 'm3' | 'M3' | 'P4' | 'TT' | 'P5' | 'm6' | 'M6' | 'm7' | 'M7' | 'P8';

export interface Interval {
  name: IntervalName;
  semitones: number;
  /** Letter-name distance (a 3rd is 2 steps). */
  steps: number;
  label: string;
}

export const INTERVALS: Record<IntervalName, Interval> = {
  m2: { name: 'm2', semitones: 1, steps: 1, label: 'minor 2nd' },
  M2: { name: 'M2', semitones: 2, steps: 1, label: 'major 2nd' },
  m3: { name: 'm3', semitones: 3, steps: 2, label: 'minor 3rd' },
  M3: { name: 'M3', semitones: 4, steps: 2, label: 'major 3rd' },
  P4: { name: 'P4', semitones: 5, steps: 3, label: 'perfect 4th' },
  TT: { name: 'TT', semitones: 6, steps: 3, label: 'tritone' },
  P5: { name: 'P5', semitones: 7, steps: 4, label: 'perfect 5th' },
  m6: { name: 'm6', semitones: 8, steps: 5, label: 'minor 6th' },
  M6: { name: 'M6', semitones: 9, steps: 5, label: 'major 6th' },
  m7: { name: 'm7', semitones: 10, steps: 6, label: 'minor 7th' },
  M7: { name: 'M7', semitones: 11, steps: 6, label: 'major 7th' },
  P8: { name: 'P8', semitones: 12, steps: 7, label: 'octave' },
};

export const INTERVAL_NAMES = Object.keys(INTERVALS) as IntervalName[];

/**
 * Move a note by a number of semitones and letter steps, keeping correct spelling.
 * Returns null when the result would need a double sharp or double flat.
 */
export function transposeBy(n: Note, semitones: number, steps: number, direction: 'up' | 'down'): Note | null {
  const sign = direction === 'up' ? 1 : -1;
  const index = STEPS.indexOf(n.step) + sign * steps;
  const step = STEPS[((index % 7) + 7) % 7];
  const octave = n.octave + Math.floor(index / 7);
  const alter = toMidi(n) + sign * semitones - toMidi({ step, alter: 0, octave });
  if (alter < -1 || alter > 1) return null;
  return { step, alter: alter as Alter, octave };
}

export function transpose(n: Note, iv: Interval, direction: 'up' | 'down' = 'up'): Note | null {
  return transposeBy(n, iv.semitones, iv.steps, direction);
}
```

`src/music/chord.ts`:
```ts
import { transposeBy } from './interval';
import { pitchClass, pitchName, toMidi, type Note } from './note';

export type ChordQuality = 'maj' | 'min' | 'dim' | 'aug' | 'dom7' | 'maj7' | 'min7' | 'hdim7' | 'dim7';

interface QualityInfo {
  suffix: string;
  label: string;
  /** Chord tones above the root as [semitones, letter steps]. */
  tones: [number, number][];
}

export const CHORD_QUALITIES: Record<ChordQuality, QualityInfo> = {
  maj: { suffix: '', label: 'major', tones: [[4, 2], [7, 4]] },
  min: { suffix: 'm', label: 'minor', tones: [[3, 2], [7, 4]] },
  dim: { suffix: '°', label: 'diminished', tones: [[3, 2], [6, 4]] },
  aug: { suffix: '+', label: 'augmented', tones: [[4, 2], [8, 4]] },
  dom7: { suffix: '7', label: 'dominant 7th', tones: [[4, 2], [7, 4], [10, 6]] },
  maj7: { suffix: 'maj7', label: 'major 7th', tones: [[4, 2], [7, 4], [11, 6]] },
  min7: { suffix: 'm7', label: 'minor 7th', tones: [[3, 2], [7, 4], [10, 6]] },
  hdim7: { suffix: 'ø7', label: 'half-diminished 7th', tones: [[3, 2], [6, 4], [10, 6]] },
  dim7: { suffix: '°7', label: 'diminished 7th', tones: [[3, 2], [6, 4], [9, 6]] },
};

export const CHORD_QUALITY_NAMES = Object.keys(CHORD_QUALITIES) as ChordQuality[];

/** Chord notes low to high. `inversion` raises that many of the lowest notes by an octave. */
export function chordNotes(root: Note, quality: ChordQuality, inversion = 0): Note[] | null {
  const upper = CHORD_QUALITIES[quality].tones.map(([semi, steps]) => transposeBy(root, semi, steps, 'up'));
  if (upper.some((n) => n === null)) return null;
  const notes = [root, ...(upper as Note[])];
  if (inversion < 0 || inversion >= notes.length) throw new Error(`Invalid inversion ${inversion}`);
  return notes
    .map((n, i) => (i < inversion ? { ...n, octave: n.octave + 1 } : n))
    .sort((a, b) => toMidi(a) - toMidi(b));
}

export function chordName(root: Note, quality: ChordQuality): string {
  return `${pitchName(root)}${CHORD_QUALITIES[quality].suffix}`;
}

export function chordPitchClasses(notes: Note[]): number[] {
  return [...new Set(notes.map((n) => pitchClass(toMidi(n))))].sort((a, b) => a - b);
}
```

`src/music/scale.ts`:
```ts
import { transposeBy } from './interval';
import { pitchName, type Note } from './note';

export type ScaleType = 'major' | 'natural-minor' | 'harmonic-minor' | 'melodic-minor';
export type ScaleDirection = 'up' | 'up-down';

export const SCALE_TYPES: Record<ScaleType, { label: string; steps: number[] }> = {
  major: { label: 'major', steps: [2, 2, 1, 2, 2, 2, 1] },
  'natural-minor': { label: 'natural minor', steps: [2, 1, 2, 2, 1, 2, 2] },
  'harmonic-minor': { label: 'harmonic minor', steps: [2, 1, 2, 2, 1, 3, 1] },
  'melodic-minor': { label: 'melodic minor', steps: [2, 1, 2, 2, 2, 2, 1] },
};

export const SCALE_TYPE_NAMES = Object.keys(SCALE_TYPES) as ScaleType[];

function ascending(tonic: Note, type: ScaleType): Note[] | null {
  const notes: Note[] = [tonic];
  let semitones = 0;
  for (let i = 0; i < 7; i++) {
    semitones += SCALE_TYPES[type].steps[i];
    const n = transposeBy(tonic, semitones, i + 1, 'up');
    if (!n) return null;
    notes.push(n);
  }
  return notes;
}

/** One octave from the tonic; 'up-down' returns 15 notes. Melodic minor descends as natural minor. */
export function scaleNotes(tonic: Note, type: ScaleType, direction: ScaleDirection): Note[] | null {
  const up = ascending(tonic, type);
  if (!up) return null;
  if (direction === 'up') return up;
  const down = type === 'melodic-minor' ? ascending(tonic, 'natural-minor') : up;
  if (!down) return null;
  return [...up, ...down.slice(0, -1).reverse()];
}

export function scaleLabel(tonic: Note, type: ScaleType): string {
  return `${pitchName(tonic)} ${SCALE_TYPES[type].label}`;
}
```

`src/music/key.ts`:
```ts
import { transposeBy } from './interval';
import type { Alter, Note, Step } from './note';
import type { ScaleType } from './scale';

/** Major keys with a standard signature: positive = sharps, negative = flats. */
const MAJOR_KEYS: Record<string, number> = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7,
  F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7,
};
const SHARP_ORDER: Step[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER: Step[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

export interface KeySignature {
  /** Key name VexFlow understands for `addKeySignature` (the major key with this signature). */
  vexKey: string;
  alters: Partial<Record<Step, Alter>>;
}

function keyName(n: Note): string {
  return `${n.step}${n.alter === 1 ? '#' : n.alter === -1 ? 'b' : ''}`;
}

export function keySignatureFor(tonic: Note, type: ScaleType): KeySignature | null {
  const major = type === 'major' ? tonic : transposeBy(tonic, 3, 2, 'up');
  if (!major) return null;
  const vexKey = keyName(major);
  const count = MAJOR_KEYS[vexKey];
  if (count === undefined) return null;
  const alters: Partial<Record<Step, Alter>> = {};
  if (count > 0) for (const s of SHARP_ORDER.slice(0, count)) alters[s] = 1;
  if (count < 0) for (const s of FLAT_ORDER.slice(0, -count)) alters[s] = -1;
  return { vexKey, alters };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/music` → all PASS. Then `npm test` and `npm run check` (0 errors).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: intervals, chords, scales and key signatures in the music model" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Staff renderer — sequences, key signatures, accidentals

**Files:**
- Modify: `src/staff/types.ts`, `src/staff/vexKeys.ts`, `src/staff/vexKeys.test.ts`, `src/staff/renderStaff.ts`, `src/ui/Drill.svelte` (small adaptation only)

**Interfaces:**
- Consumes: `KeySignature` (Task 1), `Note`, `Step`, `Alter`, `toMidi`.
- Produces:
  - `interface StaffItem { notes: Note[]; highlight?: Highlight }`
  - `interface StaffView { clef: StaffClef; keySignature?: KeySignature; items: StaffItem[] }` (items drawn left to right; each item's notes sound together; `items: []` draws only clef + key)
  - `type AccidentalCode = '#' | 'b' | 'n'`
  - `accidentalsFor(groups: Note[][], keyAlters?: Partial<Record<Step, Alter>>): (AccidentalCode | null)[][]`
  - `splitByStaff(clef: StaffClef, notes: Note[]): { treble: Note[]; bass: Note[] }`
  - `renderStaff(el, view, pixelWidth, maxPixelHeight?)` — same signature as today.
  - `accidentalOf` is removed.

- [ ] **Step 1: Write the failing tests**

Replace `src/staff/vexKeys.test.ts` with:
```ts
import { describe, expect, it } from 'vitest';
import { parseNote } from '../music/note';
import { accidentalsFor, splitByStaff, staffForNote, toVexKey } from './vexKeys';

const seq = (...names: string[]) => names.map((n) => [parseNote(n)]);

describe('toVexKey', () => {
  it('formats keys for VexFlow', () => {
    expect(toVexKey(parseNote('C4'))).toBe('c/4');
    expect(toVexKey(parseNote('C#4'))).toBe('c#/4');
    expect(toVexKey(parseNote('Bb3'))).toBe('bb/3');
  });
});

describe('accidentalsFor', () => {
  it('draws accidentals only where they differ from the key and the measure so far', () => {
    expect(accidentalsFor(seq('D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5', 'D5'), { F: 1, C: 1 }))
      .toEqual([[null], [null], [null], [null], [null], [null], [null], [null]]);
    expect(accidentalsFor(seq('F#4', 'G4'))).toEqual([['#'], [null]]);
  });
  it('draws naturals against the key signature', () => {
    expect(accidentalsFor(seq('B4', 'Bb4'), { B: -1 })).toEqual([['n'], ['b']]);
  });
  it('carries accidentals through the measure and cancels them with naturals', () => {
    const melodicA = seq('A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G#5', 'A5', 'G5', 'F5', 'E5');
    const accs = accidentalsFor(melodicA).map((g) => g[0]);
    expect(accs.slice(5, 10)).toEqual(['#', '#', null, 'n', 'n']);
  });
  it('handles chords note by note', () => {
    expect(accidentalsFor([[parseNote('C4'), parseNote('E4'), parseNote('G#4')]])).toEqual([[null, null, '#']]);
  });
});

describe('staffForNote', () => {
  it('splits at middle C', () => {
    expect(staffForNote(parseNote('C4'))).toBe('treble');
    expect(staffForNote(parseNote('B3'))).toBe('bass');
  });
});

describe('splitByStaff', () => {
  const notes = [parseNote('E2'), parseNote('G4')];
  it('puts every note on the single clef for treble/bass views', () => {
    expect(splitByStaff('treble', notes)).toEqual({ treble: notes, bass: [] });
    expect(splitByStaff('bass', notes)).toEqual({ treble: [], bass: notes });
  });
  it('splits by middle C for grand staff', () => {
    expect(splitByStaff('grand', notes)).toEqual({ treble: [notes[1]], bass: [notes[0]] });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/staff`
Expected: FAIL — `accidentalsFor` is not exported; `splitByStaff` signature differs.

- [ ] **Step 3: Implement types and helpers**

Replace `src/staff/types.ts`:
```ts
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
```

Replace `src/staff/vexKeys.ts`:
```ts
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
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/staff` → PASS.

- [ ] **Step 5: Rewrite the renderer**

Replace `src/staff/renderStaff.ts`:
```ts
import {
  Accidental, Formatter, GhostNote, Renderer, Stave, StaveConnector, StaveNote, Voice,
  type RenderContext,
} from 'vexflow/bravura';
import { toMidi, type Note } from '../music/note';
import type { Highlight, StaffClef, StaffView } from './types';
import { accidentalsFor, staffForNote, toVexKey, type AccidentalCode } from './vexKeys';

const SINGLE_ITEM_WIDTH = 260;
const SEQUENCE_BASE_WIDTH = 110;
const WIDTH_PER_ITEM = 38;
const WIDTH_PER_KEY_ACCIDENTAL = 9;

const COLORS: Record<Exclude<Highlight, null>, string> = {
  correct: '#1a9e4b',
  wrong: '#d03b3b',
  answer: '#2f6fd6',
};

// VexFlow's bravura entry registers its fonts asynchronously; wait before first draw.
export const staffReady: Promise<unknown> = Promise.all([
  document.fonts.load('30px Bravura'),
  document.fonts.load('12px Academico'),
]).catch(() => undefined);

interface Placed {
  note: Note;
  accidental: AccidentalCode | null;
}

function logicalWidth(view: StaffView): number {
  const keyAccidentals = view.keySignature ? Object.keys(view.keySignature.alters).length : 0;
  const n = view.items.length;
  const notesWidth = n <= 1 ? SINGLE_ITEM_WIDTH : SEQUENCE_BASE_WIDTH + WIDTH_PER_ITEM * n;
  return notesWidth + keyAccidentals * WIDTH_PER_KEY_ACCIDENTAL;
}

function placeOn(clef: StaffClef, note: Note): 'treble' | 'bass' {
  return clef === 'grand' ? staffForNote(note) : clef;
}

function buildNote(
  placed: Placed[],
  clef: 'treble' | 'bass',
  duration: string,
  highlight: Highlight | undefined,
): StaveNote | GhostNote {
  if (placed.length === 0) return new GhostNote(duration);
  const sorted = [...placed].sort((a, b) => toMidi(a.note) - toMidi(b.note));
  const sn = new StaveNote({ keys: sorted.map((p) => toVexKey(p.note)), duration, clef });
  sorted.forEach((p, i) => {
    if (p.accidental) sn.addModifier(new Accidental(p.accidental), i);
  });
  if (highlight) sn.setStyle({ fillStyle: COLORS[highlight], strokeStyle: COLORS[highlight] });
  return sn;
}

function voiceFor(view: StaffView, staff: 'treble' | 'bass', stave: Stave): Voice {
  const duration = view.items.length > 1 ? 'q' : 'w';
  const accidentals = accidentalsFor(view.items.map((i) => i.notes), view.keySignature?.alters);
  const tickables = view.items.map((item, i) =>
    buildNote(
      item.notes
        .map((note, j) => ({ note, accidental: accidentals[i][j] }))
        .filter((p) => placeOn(view.clef, p.note) === staff),
      staff,
      duration,
      item.highlight,
    ),
  );
  const voice = new Voice({ numBeats: 4, beatValue: 4 });
  voice.setMode(Voice.Mode.SOFT);
  voice.addTickables(tickables.length > 0 ? tickables : [new GhostNote('w')]);
  voice.setStave(stave);
  return voice;
}

function stave(ctx: RenderContext, clef: 'treble' | 'bass', y: number, width: number, view: StaffView): Stave {
  const s = new Stave(20, y, width - 30).addClef(clef);
  if (view.keySignature) s.addKeySignature(view.keySignature.vexKey);
  s.setContext(ctx);
  return s;
}

export function renderStaff(
  el: HTMLElement,
  view: StaffView,
  pixelWidth: number,
  maxPixelHeight?: number,
): void {
  el.innerHTML = '';
  const width = logicalWidth(view);
  const height = view.clef === 'grand' ? 280 : 170;
  const scale =
    maxPixelHeight != null
      ? Math.min(pixelWidth / width, maxPixelHeight / height)
      : pixelWidth / width;
  const renderer = new Renderer(el as HTMLDivElement, Renderer.Backends.SVG);
  renderer.resize(width * scale, height * scale);
  const ctx = renderer.getContext();
  ctx.scale(scale, scale);

  if (view.clef === 'grand') {
    const treble = stave(ctx, 'treble', 30, width, view);
    const bass = stave(ctx, 'bass', 140, width, view);
    Stave.formatBegModifiers([treble, bass]);
    treble.draw();
    bass.draw();
    new StaveConnector(treble, bass).setType('brace').setContext(ctx).draw();
    new StaveConnector(treble, bass).setType('singleLeft').setContext(ctx).draw();
    new StaveConnector(treble, bass).setType('singleRight').setContext(ctx).draw();
    const tv = voiceFor(view, 'treble', treble);
    const bv = voiceFor(view, 'bass', bass);
    new Formatter()
      .joinVoices([tv])
      .joinVoices([bv])
      .format([tv, bv], treble.getNoteEndX() - treble.getNoteStartX() - 10);
    tv.draw(ctx, treble);
    bv.draw(ctx, bass);
  } else {
    const s = stave(ctx, view.clef, 40, width, view);
    s.draw();
    const v = voiceFor(view, view.clef, s);
    new Formatter().joinVoices([v]).formatToStave([v], s);
    v.draw(ctx, s);
  }
}
```
If `voice.setStave` or `Voice.Mode.SOFT` differ in `node_modules/vexflow/build/types/src/voice.d.ts`, make the minimal equivalent change and note it in the report.

- [ ] **Step 6: Adapt the drill screen to the new `StaffView`**

In `src/ui/Drill.svelte`:
1. In `showQuestion()`, replace `view = { clef: q.clef, notes: q.notes, highlight: null };` with:
```ts
    view = { clef: q.clef, items: [{ notes: q.notes }] };
```
2. Add below `showQuestion()`:
```ts
  function withHighlight(v: StaffView, highlight: Highlight): StaffView {
    return { ...v, items: v.items.map((item) => ({ ...item, highlight })) };
  }
```
and change the import to `import type { Highlight, StaffView } from '../staff/types';`.
3. Replace each `view = { ...view, highlight: X }` (four places) with `view = withHighlight(view, X)`.

(Task 6 rewrites this file; keep this adaptation minimal.)

- [ ] **Step 7: Verify and commit**

Run: `npm test`, `npm run check` (0 errors), `npm run build`.
```bash
git add -A
git commit -m "feat: staff sequences, key signatures and measure-aware accidentals" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Answer model and session matching

**Files:**
- Modify: `src/drill/types.ts`, `src/drill/session.ts`, `src/drill/session.test.ts`, `src/drill/noteReading.ts`, `src/drill/noteReading.test.ts`, `src/ui/Drill.svelte` (small adaptation only)
- Create: `src/drill/answer.ts`
- Test: `src/drill/answer.test.ts`

**Interfaces:**
- Consumes: `KeySignature` (Task 1), `PITCH_CLASS_NAMES`, `displayName`, `pitchClass`, `toMidi`.
- Produces:
  - `type Answer = { kind: 'notes'; midis: number[]; anyOctave: boolean } | { kind: 'chord'; pitchClasses: number[] }`
  - `interface Question { itemKey; clef; display: Note[][]; reveal: Note[][]; keySignature?: KeySignature; prompt?: string; answer: Answer }`
  - `type Heard = { kind: 'note'; midi: number; time: number } | { kind: 'chord'; chroma: ArrayLike<number>; time: number }`
  - `type HearResult = 'progress' | 'correct' | 'wrong' | 'ignored'`
  - `interface Exercise { nextQuestion(weights, rng, previous): Question }` (no `check`)
  - `HeardNote` and `CheckResult` are removed.
  - answer.ts: `matchNote(answer, matched, midi): 'progress'|'correct'|'wrong'`, `CHORD_THRESHOLDS = { present: 0.35, absent: 0.6 }`, `matchChord(pitchClasses, chroma, t?)`, `heardPitchClasses(chroma, t?)`, `pitchClassNames(pcs)`, `describeReveal(q)`
  - `DrillSession.hear(h: Heard): HearResult`, `DrillSession.matched: number` (notes of the current answer already played)

Semantics: note events only count for `notes` answers and chord events only for `chord` answers (others → `'ignored'`). A correct note that is not the last → `'progress'` (matched +1). A wrong note keeps the position; retry mode stays `asking`, move-on reveals. Everything else (weights, logging, lengths, stats) is unchanged.

- [ ] **Step 1: Write the failing tests**

`src/drill/answer.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseNote } from '../music/note';
import { describeReveal, heardPitchClasses, matchChord, matchNote, pitchClassNames } from './answer';
import type { Question } from './types';

const chroma = (entries: Record<number, number>) => Array.from({ length: 12 }, (_, pc) => entries[pc] ?? 0);

describe('matchNote', () => {
  const answer = { kind: 'notes' as const, midis: [60, 64, 67], anyOctave: false };
  it('reports progress, completion and mistakes', () => {
    expect(matchNote(answer, 0, 60)).toBe('progress');
    expect(matchNote(answer, 1, 64)).toBe('progress');
    expect(matchNote(answer, 2, 67)).toBe('correct');
    expect(matchNote(answer, 1, 65)).toBe('wrong');
    expect(matchNote(answer, 0, 72)).toBe('wrong');
  });
  it('compares pitch classes when any octave is allowed', () => {
    expect(matchNote({ ...answer, anyOctave: true }, 0, 48)).toBe('progress');
  });
});

describe('matchChord', () => {
  it('passes when every chord tone is present and nothing else is strong', () => {
    expect(matchChord([0, 4, 7], chroma({ 0: 1, 4: 0.8, 7: 0.9, 11: 0.2 }))).toBe(true);
  });
  it('fails when a chord tone is missing', () => {
    expect(matchChord([0, 4, 7], chroma({ 0: 1, 4: 0.1, 7: 0.9 }))).toBe(false);
  });
  it('fails when an unexpected pitch class is strong', () => {
    expect(matchChord([0, 4, 7], chroma({ 0: 1, 3: 0.9, 4: 0.8, 7: 0.9 }))).toBe(false);
  });
  it('fails on silence', () => {
    expect(matchChord([0, 4, 7], chroma({}))).toBe(false);
  });
});

describe('heardPitchClasses / pitchClassNames', () => {
  it('lists the clearly present pitch classes', () => {
    expect(heardPitchClasses(chroma({ 0: 1, 4: 0.8, 8: 0.9, 2: 0.1 }))).toEqual([0, 4, 8]);
    expect(pitchClassNames([0, 4, 8])).toBe('C E A♭');
  });
});

describe('describeReveal', () => {
  it('lists the answer notes, joining simultaneous notes with +', () => {
    const q: Question = {
      itemKey: 'x', clef: 'treble', display: [], answer: { kind: 'chord', pitchClasses: [0, 4] },
      reveal: [[parseNote('C4')], [parseNote('E4'), parseNote('G4')]],
    };
    expect(describeReveal(q)).toBe('C4 E4+G4');
  });
});
```

In `src/drill/session.test.ts`:
1. Replace everything above `describe('DrillSession', () => {` with:
```ts
import { describe, expect, it } from 'vitest';
import { DrillSession, type SessionOptions } from './session';
import type { Answer, Exercise, Heard, Question } from './types';

const notesAnswer = (...midis: number[]): Answer => ({ kind: 'notes', midis, anyOctave: false });

function fakeExercise(answer: Answer = notesAnswer(60), sameKey = false) {
  let i = 0;
  const seenWeights: Map<string, number>[] = [];
  const ex: Exercise = {
    nextQuestion(weights) {
      seenWeights.push(new Map(weights));
      const q: Question = { itemKey: sameKey ? 'same' : `q${i++}`, clef: 'treble', display: [], reveal: [], answer };
      return q;
    },
  };
  return { ex, seenWeights };
}

const note = (midi: number): Heard => ({ kind: 'note', midi, time: 0 });
const chordOf = (...pcs: number[]): Heard => ({
  kind: 'chord',
  chroma: Array.from({ length: 12 }, (_, pc) => (pcs.includes(pc) ? 1 : 0)),
  time: 0,
});
const RIGHT = note(60);
const WRONG = note(61);
const opts = (o: Partial<SessionOptions> = {}): SessionOptions => ({ length: 10, missMode: 'retry', weighting: true, ...o });
```
2. Replace the whole test `it('reduces an item weight after a later first-try correct answer', ...)` with:
```ts
  it('reduces an item weight after a later first-try correct answer', () => {
    const { ex, seenWeights } = fakeExercise(notesAnswer(60), true);
    const s = new DrillSession(ex, opts({ missMode: 'move-on', length: 'endless' }));
    s.start();
    s.hear(WRONG);
    s.advance();
    s.hear(WRONG);
    s.advance();
    expect(seenWeights[2].get('same')).toBe(2);
    s.hear(RIGHT);
    s.advance();
    expect(seenWeights[3].get('same')).toBe(1);
  });
```
3. Append inside `describe('DrillSession', ...)` (before its closing `});`):
```ts
  it('tracks progress through a multi-note answer', () => {
    const s = new DrillSession(fakeExercise(notesAnswer(60, 62, 64)).ex, opts());
    s.start();
    expect(s.hear(note(60))).toBe('progress');
    expect(s.matched).toBe(1);
    expect(s.hear(note(62))).toBe('progress');
    expect(s.hear(note(64))).toBe('correct');
    expect(s.log[0]).toMatchObject({ firstTryCorrect: true, misses: 0 });
  });

  it('keeps the position after a wrong note mid-sequence in retry mode', () => {
    const s = new DrillSession(fakeExercise(notesAnswer(60, 62)).ex, opts({ missMode: 'retry' }));
    s.start();
    s.hear(note(60));
    expect(s.hear(note(65))).toBe('wrong');
    expect(s.matched).toBe(1);
    expect(s.hear(note(62))).toBe('correct');
    expect(s.log[0]).toMatchObject({ firstTryCorrect: false, misses: 1 });
  });

  it('resets progress for the next question', () => {
    const s = new DrillSession(fakeExercise(notesAnswer(60, 62)).ex, opts());
    s.start();
    s.hear(note(60));
    s.hear(note(62));
    s.advance();
    expect(s.matched).toBe(0);
  });

  it('matches chord answers from chroma and ignores single notes', () => {
    const s = new DrillSession(fakeExercise({ kind: 'chord', pitchClasses: [0, 4, 7] }).ex, opts());
    s.start();
    expect(s.hear(RIGHT)).toBe('ignored');
    expect(s.hear(chordOf(0, 3, 7))).toBe('wrong');
    expect(s.hear(chordOf(0, 4, 7))).toBe('correct');
  });

  it('ignores chord events for note answers', () => {
    const s = new DrillSession(fakeExercise().ex, opts());
    s.start();
    expect(s.hear(chordOf(0, 4, 7))).toBe('ignored');
  });
```

In `src/drill/noteReading.test.ts`:
1. In `it('asks single notes on the configured clef', ...)`, replace its three `expect` lines with:
```ts
    expect(q.display).toHaveLength(1);
    expect(q.display[0]).toHaveLength(1);
    expect(q.reveal).toEqual(q.display);
    expect(q.clef).toBe('grand');
    expect(q.itemKey).toBe(noteName(q.display[0][0]));
```
2. Replace the tests `checks exact pitch by default` and `accepts any octave when enabled` with:
```ts
  it('asks for the exact note by default', () => {
    const ex = createNoteReading(settings({ low: 'C4', high: 'C4' }));
    const q = ex.nextQuestion(noWeights, seededRng(1), null);
    expect(q.display).toEqual([[parseNote('C4')]]);
    expect(q.answer).toEqual({ kind: 'notes', midis: [60], anyOctave: false });
  });

  it('passes any-octave through to the answer', () => {
    const ex = createNoteReading(settings({ low: 'C4', high: 'C4', anyOctave: true }));
    expect(ex.nextQuestion(noWeights, seededRng(1), null).answer).toEqual({ kind: 'notes', midis: [60], anyOctave: true });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/drill`
Expected: FAIL — `./answer` missing; `Answer`/`Heard` types missing; `matched` undefined.

- [ ] **Step 3: Implement**

Replace `src/drill/types.ts`:
```ts
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
```

`src/drill/answer.ts`:
```ts
import { displayName, PITCH_CLASS_NAMES, pitchClass } from '../music/note';
import type { Answer, Question } from './types';

type NotesAnswer = Extract<Answer, { kind: 'notes' }>;

export function matchNote(answer: NotesAnswer, matched: number, midi: number): 'progress' | 'correct' | 'wrong' {
  const expected = answer.midis[matched];
  const ok = answer.anyOctave ? pitchClass(midi) === pitchClass(expected) : midi === expected;
  if (!ok) return 'wrong';
  return matched + 1 === answer.midis.length ? 'correct' : 'progress';
}

export interface ChordThresholds {
  /** An expected pitch class must reach this fraction of the strongest one. */
  present: number;
  /** An unexpected pitch class must stay below this fraction. */
  absent: number;
}

/** Starting values; tune against the real piano using the Calibrate screen's chroma bars. */
export const CHORD_THRESHOLDS: ChordThresholds = { present: 0.35, absent: 0.6 };

function relative(chroma: ArrayLike<number>): number[] | null {
  let max = 0;
  for (let pc = 0; pc < 12; pc++) max = Math.max(max, chroma[pc]);
  if (!(max > 0)) return null;
  return Array.from({ length: 12 }, (_, pc) => chroma[pc] / max);
}

export function matchChord(pitchClasses: number[], chroma: ArrayLike<number>, t = CHORD_THRESHOLDS): boolean {
  const rel = relative(chroma);
  if (!rel) return false;
  return rel.every((v, pc) => (pitchClasses.includes(pc) ? v >= t.present : v < t.absent));
}

export function heardPitchClasses(chroma: ArrayLike<number>, t = CHORD_THRESHOLDS): number[] {
  const rel = relative(chroma);
  if (!rel) return [];
  return rel.flatMap((v, pc) => (v >= t.present ? [pc] : []));
}

export function pitchClassNames(pcs: number[]): string {
  return pcs.map((pc) => PITCH_CLASS_NAMES[pc]).join(' ');
}

export function describeReveal(q: Question): string {
  return q.reveal.map((group) => group.map(displayName).join('+')).join(' ');
}
```

In `src/drill/session.ts`:
1. Change the import to:
```ts
import { matchChord, matchNote } from './answer';
import type { Rng } from './random';
import type { Exercise, Heard, HearResult, MissMode, Question, QuestionLogEntry, SessionLength } from './types';
```
2. Add a field `private matchedCount = 0;` next to `currentMisses`, and a getter after the constructor:
```ts
  /** Notes of the current answer already played correctly. */
  get matched(): number {
    return this.matchedCount;
  }
```
3. Replace the whole `hear` method with:
```ts
  hear(h: Heard): HearResult {
    if (this.state !== 'asking' || !this.current) return 'ignored';
    const answer = this.current.answer;
    let step: 'progress' | 'correct' | 'wrong';
    if (h.kind === 'note') {
      if (answer.kind !== 'notes') return 'ignored';
      step = matchNote(answer, this.matchedCount, h.midi);
    } else {
      if (answer.kind !== 'chord') return 'ignored';
      step = matchChord(answer.pitchClasses, h.chroma) ? 'correct' : 'wrong';
    }

    if (step === 'progress') {
      this.matchedCount++;
      return 'progress';
    }

    const key = this.current.itemKey;
    if (step === 'correct') {
      this.matchedCount = answer.kind === 'notes' ? answer.midis.length : 0;
      if (this.currentMisses === 0) {
        const w = this.missWeights.get(key) ?? 0;
        if (w > 0) this.missWeights.set(key, w - 1);
      }
      this.record();
      this.state = 'answered';
      return 'correct';
    }

    this.currentMisses++;
    this.missWeights.set(key, (this.missWeights.get(key) ?? 0) + 1);
    if (this.opts.missMode === 'move-on') {
      this.record();
      this.state = 'revealing';
    }
    return 'wrong';
  }
```
4. In `ask()`, add `this.matchedCount = 0;` next to `this.currentMisses = 0;`.

In `src/drill/noteReading.ts`: change the import line to `import { noteName, parseNote, STEPS, toMidi, type Alter, type Note } from '../music/note';` and replace the object returned by `createNoteReading` with:
```ts
  return {
    nextQuestion(weights, rng, previous) {
      const choices = previous && pool.length > 1 ? pool.filter((n) => noteName(n) !== previous.itemKey) : pool;
      const note = weightedPick(choices, (n) => 1 + 3 * (weights.get(noteName(n)) ?? 0), rng);
      return {
        itemKey: noteName(note),
        clef: s.clef,
        display: [[note]],
        reveal: [[note]],
        answer: { kind: 'notes', midis: [toMidi(note)], anyOctave: s.anyOctave },
      };
    },
  };
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/drill` → PASS.

- [ ] **Step 5: Adapt the drill screen**

In `src/ui/Drill.svelte`:
1. Add `import { describeReveal } from '../drill/answer';`.
2. In `showQuestion()`, replace the `view = ...` line with:
```ts
    view = { clef: q.clef, keySignature: q.keySignature, items: q.display.map((notes) => ({ notes })) };
```
3. In `onNote`, replace `const result = session.hear({ midi, time });` with `const result = session.hear({ kind: 'note', midi, time });` and add right after the `if (result === 'ignored' ...) return;` line:
```ts
    if (result === 'progress') return;
```
4. Replace `` message = `You played ${played}. Answer: ${displayName(q.notes[0])}`; `` with `` message = `You played ${played}. Answer: ${describeReveal(q)}`; ``.

(Task 6 rewrites this file; keep this adaptation minimal.)

- [ ] **Step 6: Verify and commit**

Run: `npm test`, `npm run check` (0 errors), `npm run build`.
```bash
git add -A
git commit -m "feat: answers on questions; session matches note sequences and chords" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Chord hearing — onset detector, chroma, chord tracker, mic

**Files:**
- Create: `src/audio/onset.ts`, `src/audio/chroma.ts`, `src/audio/chordTracker.ts`
- Modify: `src/audio/noteTracker.ts`, `src/audio/mic.ts`
- Test: `src/audio/onset.test.ts`, `src/audio/chroma.test.ts`, `src/audio/chordTracker.test.ts` (existing `noteTracker.test.ts` must pass unchanged)

**Interfaces:**
- Consumes: `DEFAULT_LEVELS` (calibration.ts), `pitchClass`, `midiToFreq`, `matchChord` (Task 3, tests only).
- Produces:
  - `interface OnsetOptions { silenceRms; onsetRatio; rearmMs }`, `type OnsetState = 'silent'|'onset'|'sustain'`, `class OnsetDetector { constructor(opts); push(rms, time): OnsetState; markEmitted(rms, time): void; setSilenceRms(rms): void }`
  - `CHROMA_FFT_SIZE = 8192`, `createChromaMap(sampleRate, fftSize, a4 = 440, minHz = 60, maxHz = 2000): Int8Array`, `chromaFromSpectrum(db: ArrayLike<number>, map: Int8Array): Float32Array`
  - `interface ChromaFrame { time; rms; chroma: ArrayLike<number> }`, `interface ChordEvent { chroma: Float32Array; time }`, `interface ChordTrackerOptions extends OnsetOptions { settleMs; averageFrames }`, `DEFAULT_CHORD_TRACKER_OPTIONS`, `class ChordTracker { constructor(opts?); push(f): ChordEvent | null; reset(); setSilenceRms(rms) }`
  - `interface AudioFrame extends PitchFrame { chroma: Float32Array }`; `Mic.onFrame: ((f: AudioFrame) => void) | null`; `Mic.setTuningOffset(cents): void`

OnsetDetector semantics (identical to today's NoteTracker): rms < silenceRms → `'silent'` and trough resets; otherwise a rise above `trough × onsetRatio` rebases the trough and is `'onset'` only if at least `rearmMs` since the last `markEmitted`, else `'sustain'`; otherwise trough = min(trough, rms) and `'sustain'`.

ChordTracker semantics: silence resets. The first sound after silence, or an honored onset, arms the tracker. After `settleMs` (hammer noise dies down) it averages `averageFrames` chroma frames, emits one `ChordEvent`, then stays quiet until re-armed.

- [ ] **Step 1: Write the failing tests**

`src/audio/onset.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { OnsetDetector } from './onset';

const make = () => new OnsetDetector({ silenceRms: 0.01, onsetRatio: 1.5, rearmMs: 100 });

describe('OnsetDetector', () => {
  it('reports silence below the cutoff', () => {
    expect(make().push(0.001, 0)).toBe('silent');
  });
  it('treats the first sound as sustain and a later jump as an onset', () => {
    const d = make();
    expect(d.push(0.1, 0)).toBe('sustain');
    expect(d.push(0.05, 16)).toBe('sustain');
    expect(d.push(0.2, 32)).toBe('onset');
  });
  it('suppresses onsets inside the re-arm window after an emission', () => {
    const d = make();
    d.push(0.1, 0);
    d.markEmitted(0.1, 10);
    expect(d.push(0.3, 50)).toBe('sustain');
    expect(d.push(0.1, 200)).toBe('sustain');
    expect(d.push(0.3, 216)).toBe('onset');
  });
  it('re-arms after silence', () => {
    const d = make();
    d.push(0.1, 0);
    d.push(0.001, 16);
    expect(d.push(0.1, 32)).toBe('sustain');
    expect(d.push(0.3, 48)).toBe('onset');
  });
});
```

`src/audio/chroma.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { matchChord } from '../drill/answer';
import { midiToFreq } from '../music/note';
import { chromaFromSpectrum, createChromaMap } from './chroma';

const SR = 48000;
const N = 8192;
const BIN_HZ = SR / N;

/** A dB spectrum with piano-like partials (amplitude 1/h) for each MIDI note, tuned to `a4`. */
function spectrumAt(a4: number, ...midis: number[]): Float32Array {
  const db = new Float32Array(N / 2).fill(-140);
  for (const m of midis) {
    for (let h = 1; h <= 8; h++) {
      const i = Math.round((midiToFreq(m, a4) * h) / BIN_HZ);
      if (i >= db.length) continue;
      db[i] = 20 * Math.log10(10 ** (db[i] / 20) + 1 / h);
    }
  }
  return db;
}
const spectrum = (...midis: number[]) => spectrumAt(440, ...midis);

describe('chroma', () => {
  const map = createChromaMap(SR, N);

  it('puts a single note in its pitch class', () => {
    const c = chromaFromSpectrum(spectrum(60), map);
    expect(Array.from(c).indexOf(Math.max(...c))).toBe(0);
  });

  it('recognizes a C major triad and rejects C minor', () => {
    const c = chromaFromSpectrum(spectrum(60, 64, 67), map);
    expect(matchChord([0, 4, 7], c)).toBe(true);
    expect(matchChord([0, 3, 7], c)).toBe(false);
  });

  it('does not mistake one note plus its overtones for a chord or fifth', () => {
    const c = chromaFromSpectrum(spectrum(60), map);
    expect(matchChord([0, 4, 7], c)).toBe(false);
    expect(matchChord([0, 7], c)).toBe(false);
  });

  it('follows the tuning reference', () => {
    // A piano 40 cents sharp sits between semitones for an A440 map but lines up with a tuned map.
    const a4 = 440 * 2 ** (40 / 1200);
    const sharpPiano = spectrumAt(a4, 60, 64, 67);
    expect(matchChord([0, 4, 7], chromaFromSpectrum(sharpPiano, createChromaMap(SR, N, a4)))).toBe(true);
    const untuned = chromaFromSpectrum(sharpPiano, map);
    expect(untuned.reduce((a, b) => a + b, 0)).toBeLessThan(
      chromaFromSpectrum(sharpPiano, createChromaMap(SR, N, a4)).reduce((a, b) => a + b, 0),
    );
  });
});
```

`src/audio/chordTracker.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { ChordTracker, type ChordEvent, type ChromaFrame } from './chordTracker';

const C_MAJOR = Array.from({ length: 12 }, (_, pc) => ([0, 4, 7].includes(pc) ? 1 : 0));
const fr = (time: number, rms = 0.1, chroma: number[] = C_MAJOR): ChromaFrame => ({ time, rms, chroma });
const make = () => new ChordTracker({ silenceRms: 0.01, settleMs: 120, averageFrames: 3 });

function run(t: ChordTracker, frames: ChromaFrame[]): ChordEvent[] {
  return frames.map((f) => t.push(f)).filter((e): e is ChordEvent => e !== null);
}
const every16 = (from: number, to: number, rms = 0.1) =>
  Array.from({ length: Math.floor((to - from) / 16) + 1 }, (_, i) => fr(from + i * 16, rms));

describe('ChordTracker', () => {
  it('emits once, after settling and averaging', () => {
    const events = run(make(), every16(0, 400));
    expect(events).toHaveLength(1);
    expect(events[0].time).toBe(160);
    expect(Array.from(events[0].chroma)).toEqual(C_MAJOR);
  });

  it('averages the chroma frames after settling', () => {
    const t = make();
    const frames = [fr(0), fr(128, 0.1, C_MAJOR.map((v) => v * 2)), fr(144), fr(160)];
    const [e] = run(t, frames);
    expect(e.chroma[0]).toBeCloseTo(4 / 3, 5);
  });

  it('emits again after a re-strike', () => {
    const events = run(make(), [...every16(0, 384), fr(400, 0.05), ...every16(416, 640, 0.2)]);
    expect(events.map((e) => e.time)).toEqual([160, 576]);
  });

  it('resets on silence', () => {
    const events = run(make(), [...every16(0, 208), fr(224, 0.001), ...every16(240, 480)]);
    expect(events.map((e) => e.time)).toEqual([160, 400]);
  });

  it('stays quiet in silence', () => {
    expect(run(make(), every16(0, 400, 0.001))).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/audio`
Expected: FAIL — `./onset`, `./chroma`, `./chordTracker` missing.

- [ ] **Step 3: Implement**

`src/audio/onset.ts`:
```ts
export interface OnsetOptions {
  silenceRms: number;
  onsetRatio: number;
  rearmMs: number;
}

export type OnsetState = 'silent' | 'onset' | 'sustain';

/**
 * Loudness gate shared by the note and chord trackers. An onset is a rise above the quietest
 * level since the last event (the trough), so a key struck while another still rings counts.
 */
export class OnsetDetector {
  private opts: OnsetOptions;
  private trough = Infinity;
  private lastEmitTime = -Infinity;

  constructor(opts: OnsetOptions) {
    this.opts = { ...opts };
  }

  setSilenceRms(rms: number): void {
    this.opts.silenceRms = rms;
  }

  push(rms: number, time: number): OnsetState {
    if (rms < this.opts.silenceRms) {
      this.trough = Infinity;
      return 'silent';
    }
    if (this.trough !== Infinity && rms > this.trough * this.opts.onsetRatio) {
      this.trough = rms;
      return time - this.lastEmitTime >= this.opts.rearmMs ? 'onset' : 'sustain';
    }
    this.trough = Math.min(this.trough, rms);
    return 'sustain';
  }

  /** Call when the consumer emits an event: rebases the trough and starts the re-arm window. */
  markEmitted(rms: number, time: number): void {
    this.trough = rms;
    this.lastEmitTime = time;
  }
}
```

In `src/audio/noteTracker.ts`, route loudness through `OnsetDetector` (behavior must not change):
1. Add `import { OnsetDetector } from './onset';`.
2. Replace the fields `private lastEmitTime = -Infinity;` and `private trough = Infinity;` with `private onset: OnsetDetector;`, and in the constructor add after `this.opts = ...`:
```ts
    this.onset = new OnsetDetector(this.opts);
```
3. `setSilenceRms` becomes:
```ts
  setSilenceRms(rms: number): void {
    this.opts.silenceRms = rms;
    this.onset.setSilenceRms(rms);
  }
```
4. Replace the start of `push` (from `const o = this.opts;` through the `if (onset) {...} else {...}` block) with:
```ts
    const o = this.opts;
    const state = this.onset.push(f.rms, f.time);
    if (state === 'silent') {
      this.reset();
      return null;
    }
    if (state === 'onset') this.reset();
```
5. In the emission block replace `this.lastEmitTime = f.time;` and `this.trough = f.rms;` with `this.onset.markEmitted(f.rms, f.time);`.

`src/audio/chroma.ts`:
```ts
import { pitchClass } from '../music/note';

/** 8192 points ≈ 5.9 Hz bins at 48 kHz: fine enough to separate semitones from about C3 up. */
export const CHROMA_FFT_SIZE = 8192;
/** Bins further than this from a semitone center (in semitones) are ignored as ambiguous. */
const MAX_DEVIATION = 0.35;

/** Precomputed pitch class for each FFT bin (-1 = ignored). Rebuild when the tuning changes. */
export function createChromaMap(sampleRate: number, fftSize: number, a4 = 440, minHz = 60, maxHz = 2000): Int8Array {
  const map = new Int8Array(fftSize / 2).fill(-1);
  const binHz = sampleRate / fftSize;
  for (let i = 1; i < map.length; i++) {
    const hz = i * binHz;
    if (hz < minHz || hz > maxHz) continue;
    const midi = 69 + 12 * Math.log2(hz / a4);
    const nearest = Math.round(midi);
    if (Math.abs(midi - nearest) <= MAX_DEVIATION) map[i] = pitchClass(nearest);
  }
  return map;
}

/** Sum of linear magnitudes per pitch class from a dB spectrum (AnalyserNode.getFloatFrequencyData). */
export function chromaFromSpectrum(db: ArrayLike<number>, map: Int8Array): Float32Array {
  const out = new Float32Array(12);
  for (let i = 0; i < map.length; i++) {
    const pc = map[i];
    if (pc >= 0) out[pc] += 10 ** (db[i] / 20);
  }
  return out;
}
```

`src/audio/chordTracker.ts`:
```ts
import { DEFAULT_LEVELS } from './calibration';
import { OnsetDetector, type OnsetOptions } from './onset';

export interface ChromaFrame {
  time: number;
  rms: number;
  chroma: ArrayLike<number>;
}

export interface ChordEvent {
  chroma: Float32Array;
  time: number;
}

export interface ChordTrackerOptions extends OnsetOptions {
  /** Wait this long after the attack before listening, so hammer noise doesn't count. */
  settleMs: number;
  averageFrames: number;
}

export const DEFAULT_CHORD_TRACKER_OPTIONS: ChordTrackerOptions = {
  silenceRms: DEFAULT_LEVELS.silenceRms,
  onsetRatio: 1.5,
  rearmMs: 100,
  settleMs: 120,
  averageFrames: 3,
};

export class ChordTracker {
  private opts: ChordTrackerOptions;
  private onset: OnsetDetector;
  private armedAt: number | null = null;
  private emitted = false;
  private sum = new Float32Array(12);
  private count = 0;

  constructor(opts: Partial<ChordTrackerOptions> = {}) {
    this.opts = { ...DEFAULT_CHORD_TRACKER_OPTIONS, ...opts };
    this.onset = new OnsetDetector(this.opts);
  }

  setSilenceRms(rms: number): void {
    this.opts.silenceRms = rms;
    this.onset.setSilenceRms(rms);
  }

  reset(): void {
    this.armedAt = null;
    this.emitted = false;
    this.sum.fill(0);
    this.count = 0;
  }

  push(f: ChromaFrame): ChordEvent | null {
    const state = this.onset.push(f.rms, f.time);
    if (state === 'silent') {
      this.reset();
      return null;
    }
    if (state === 'onset' || (this.armedAt === null && !this.emitted)) {
      this.reset();
      this.armedAt = f.time;
    }
    if (this.emitted || this.armedAt === null || f.time - this.armedAt < this.opts.settleMs) return null;

    for (let pc = 0; pc < 12; pc++) this.sum[pc] += f.chroma[pc];
    this.count++;
    if (this.count < this.opts.averageFrames) return null;

    this.emitted = true;
    this.onset.markEmitted(f.rms, f.time);
    const n = this.count;
    return { chroma: this.sum.map((v) => v / n), time: f.time };
  }
}
```

In `src/audio/mic.ts`:
1. Add imports `import { CHROMA_FFT_SIZE, chromaFromSpectrum, createChromaMap } from './chroma';` and export:
```ts
export interface AudioFrame extends PitchFrame {
  chroma: Float32Array;
}
```
2. `onFrame` becomes `onFrame: ((f: AudioFrame) => void) | null = null;`.
3. Add fields `private chromaAnalyser: AnalyserNode;`, `private spectrum: Float32Array<ArrayBuffer>;`, `private chromaMap: Int8Array;`. The constructor takes a fourth parameter `chromaAnalyser: AnalyserNode` and sets:
```ts
    this.chromaAnalyser = chromaAnalyser;
    this.spectrum = new Float32Array(chromaAnalyser.frequencyBinCount);
    this.chromaMap = createChromaMap(ctx.sampleRate, CHROMA_FFT_SIZE);
```
4. In `open()`, after `source.connect(analyser);`:
```ts
    const chromaAnalyser = ctx.createAnalyser();
    chromaAnalyser.fftSize = CHROMA_FFT_SIZE;
    chromaAnalyser.smoothingTimeConstant = 0;
    source.connect(chromaAnalyser);
    return new Mic(ctx, stream, analyser, chromaAnalyser);
```
(replacing the old `return`).
5. Add:
```ts
  /** Align chroma bins with the calibrated tuning. */
  setTuningOffset(cents: number): void {
    this.chromaMap = createChromaMap(this.ctx.sampleRate, CHROMA_FFT_SIZE, 440 * 2 ** (cents / 1200));
  }
```
6. In the `start()` loop, before `this.onFrame?.(...)`:
```ts
      this.chromaAnalyser.getFloatFrequencyData(this.spectrum);
      const chroma = chromaFromSpectrum(this.spectrum, this.chromaMap);
```
and emit `{ time: performance.now(), freq, clarity, rms, chroma }`.

- [ ] **Step 4: Verify and commit**

Run: `npx vitest run src/audio` (all PASS, including every existing `noteTracker.test.ts` case unchanged), `npm test`, `npm run check` (0 errors).
```bash
git add -A
git commit -m "feat: chroma-based chord hearing with a shared onset detector" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Interval, chord and scale exercises

**Files:**
- Create: `src/drill/intervals.ts`, `src/drill/chords.ts`, `src/drill/scales.ts`, `src/drill/exercises.ts`
- Modify: `src/drill/config.ts`
- Test: `src/drill/intervals.test.ts`, `src/drill/chords.test.ts`, `src/drill/scales.test.ts`, `src/drill/exercises.test.ts`

**Interfaces:**
- Consumes: Task 1 music model, Task 3 `Exercise`/`Question`, `weightedPick`, `NoteReadingSettings`/`createNoteReading`/`DEFAULT_NOTE_READING`.
- Produces:
  - `IntervalSettings { clef: StaffClef; low: string; high: string; intervals: IntervalName[]; direction: 'up'|'down'|'both'; harmonic: boolean; showTarget: boolean }`, `DEFAULT_INTERVALS`, `INTERVAL_CLEF_RANGES`, `intervalCandidates(s)`, `createIntervals(s): Exercise`
  - `ChordSettings { clef: StaffClef; qualities: ChordQuality[]; inversions: boolean; accidentalRoots: boolean; showName: boolean }`, `DEFAULT_CHORDS`, `chordCandidates(s)`, `createChords(s): Exercise`
  - `ScaleSettings { clef: 'treble'|'bass'; types: ScaleType[]; moreKeys: boolean; direction: ScaleDirection; keySignatureOnly: boolean }`, `DEFAULT_SCALES`, `scaleCandidates(s)`, `createScales(s): Exercise`
  - `type ExerciseType = 'note-reading'|'intervals'|'chords'|'scales'`, `type ExerciseSettings` (discriminated union on `type`), `EXERCISE_TYPES: ExerciseType[]`, `EXERCISE_LABELS: Record<ExerciseType, string>`, `defaultSettings(type)`, `createExercise(s)`, `setupKey(type)`
  - config.ts: `DrillConfig { exercise: ExerciseSettings; session: SessionOptions }`, `DEFAULT_SESSION`, `defaultConfig(type): DrillConfig`, `DEFAULT_DRILL_CONFIG` (note reading)

Every exercise throws `Error` when its pool is empty (the setup screen uses this to disable Start), never repeats the previous item when it has a choice, and weights items by `1 + 3 × misses`.

- [ ] **Step 1: Write the failing tests**

`src/drill/intervals.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseNote } from '../music/note';
import { seededRng } from './random';
import { createIntervals, DEFAULT_INTERVALS, intervalCandidates, type IntervalSettings } from './intervals';

const settings = (o: Partial<IntervalSettings> = {}): IntervalSettings => ({ ...DEFAULT_INTERVALS, ...o });
const noWeights = new Map<string, number>();

describe('intervalCandidates', () => {
  it('pairs each natural root in range with each interval and direction', () => {
    expect(intervalCandidates(settings({ low: 'C4', high: 'C5', intervals: ['M3'] }))).toHaveLength(8);
    expect(intervalCandidates(settings({ low: 'C4', high: 'C5', intervals: ['M3', 'P5'], direction: 'both' }))).toHaveLength(32);
  });
});

describe('createIntervals', () => {
  it('throws with nothing to ask', () => {
    expect(() => createIntervals(settings({ intervals: [] }))).toThrow();
  });

  it('asks a melodic interval: root shown, both notes to play in order', () => {
    const ex = createIntervals(settings({ low: 'C4', high: 'C4', intervals: ['M3'] }));
    const q = ex.nextQuestion(noWeights, seededRng(1), null);
    expect(q.itemKey).toBe('C4 M3↑');
    expect(q.display).toEqual([[parseNote('C4')]]);
    expect(q.reveal).toEqual([[parseNote('C4')], [parseNote('E4')]]);
    expect(q.prompt).toBe('major 3rd up');
    expect(q.answer).toEqual({ kind: 'notes', midis: [60, 64], anyOctave: false });
  });

  it('asks a harmonic interval as a two-note chord', () => {
    const ex = createIntervals(settings({ low: 'C4', high: 'C4', intervals: ['P5'], harmonic: true }));
    const q = ex.nextQuestion(noWeights, seededRng(1), null);
    expect(q.reveal).toEqual([[parseNote('C4'), parseNote('G4')]]);
    expect(q.answer).toEqual({ kind: 'chord', pitchClasses: [0, 7] });
  });

  it('shows both notes when reading intervals', () => {
    const ex = createIntervals(settings({ low: 'C4', high: 'C4', intervals: ['m3'], showTarget: true }));
    const q = ex.nextQuestion(noWeights, seededRng(1), null);
    expect(q.display).toEqual(q.reveal);
  });

  it('goes down when asked', () => {
    const ex = createIntervals(settings({ low: 'C4', high: 'C4', intervals: ['m2'], direction: 'down' }));
    expect(ex.nextQuestion(noWeights, seededRng(1), null).answer).toEqual({ kind: 'notes', midis: [60, 59], anyOctave: false });
  });

  it('never repeats the previous item', () => {
    const ex = createIntervals(settings({ low: 'C4', high: 'D4', intervals: ['M3'] }));
    const rng = seededRng(5);
    let prev = ex.nextQuestion(noWeights, rng, null);
    for (let i = 0; i < 10; i++) {
      const q = ex.nextQuestion(noWeights, rng, prev);
      expect(q.itemKey).not.toBe(prev.itemKey);
      prev = q;
    }
  });
});
```

`src/drill/chords.test.ts`:
```ts
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
```

`src/drill/scales.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseNote } from '../music/note';
import { seededRng } from './random';
import { createScales, DEFAULT_SCALES, scaleCandidates, type ScaleSettings } from './scales';

const settings = (o: Partial<ScaleSettings> = {}): ScaleSettings => ({ ...DEFAULT_SCALES, ...o });
const noWeights = new Map<string, number>();

describe('scaleCandidates', () => {
  it('covers the common keys for each chosen type', () => {
    expect(scaleCandidates(settings())).toHaveLength(9);
    expect(scaleCandidates(settings({ types: ['major', 'natural-minor'] }))).toHaveLength(18);
    expect(scaleCandidates(settings({ moreKeys: true }))).toHaveLength(14);
  });
});

describe('createScales', () => {
  it('throws with no types', () => {
    expect(() => createScales(settings({ types: [] }))).toThrow();
  });

  it('shows the notes with the key signature and expects them in order', () => {
    const pool = scaleCandidates(settings());
    const d = pool.find((c) => c.key.startsWith('D major'))!;
    expect(d.keySignature.vexKey).toBe('D');
    const ex = createScales(settings());
    const rng = seededRng(4);
    let q = ex.nextQuestion(noWeights, rng, null);
    while (!q.itemKey.startsWith('D major')) q = ex.nextQuestion(noWeights, rng, null);
    expect(q.display).toHaveLength(8);
    expect(q.display[2]).toEqual([parseNote('F#4')]);
    expect(q.answer).toEqual({ kind: 'notes', midis: [62, 64, 66, 67, 69, 71, 73, 74], anyOctave: false });
    expect(q.prompt).toBe('D major · up one octave');
  });

  it('shows only the key signature and accepts any octave when asked', () => {
    const ex = createScales(settings({ keySignatureOnly: true, direction: 'up-down' }));
    const q = ex.nextQuestion(noWeights, seededRng(1), null);
    expect(q.display).toEqual([]);
    expect(q.reveal).toHaveLength(15);
    expect(q.answer).toMatchObject({ kind: 'notes', anyOctave: true });
    expect(q.prompt).toMatch(/up and back down$/);
  });

  it('writes bass-clef scales an octave lower', () => {
    const ex = createScales(settings({ clef: 'bass' }));
    const q = ex.nextQuestion(noWeights, seededRng(1), null);
    expect(q.display[0][0].octave).toBe(3);
  });
});
```

`src/drill/exercises.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { seededRng } from './random';
import { createExercise, defaultSettings, EXERCISE_TYPES, setupKey } from './exercises';

describe('exercises', () => {
  it('creates a working exercise for every type with its defaults', () => {
    for (const type of EXERCISE_TYPES) {
      const q = createExercise(defaultSettings(type)).nextQuestion(new Map(), seededRng(1), null);
      expect(q.reveal.length).toBeGreaterThan(0);
    }
  });
  it('keeps the original storage key for note reading', () => {
    expect(setupKey('note-reading')).toBe('noteReadingSetup');
    expect(setupKey('chords')).toBe('chordsSetup');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/drill`
Expected: FAIL — new modules missing.

- [ ] **Step 3: Implement**

`src/drill/intervals.ts`:
```ts
import { INTERVALS, transpose, type IntervalName } from '../music/interval';
import { noteName, parseNote, pitchClass, STEPS, toMidi, type Note } from '../music/note';
import type { StaffClef } from '../staff/types';
import { weightedPick } from './random';
import type { Exercise, Question } from './types';

export type IntervalDirection = 'up' | 'down' | 'both';

export interface IntervalSettings {
  clef: StaffClef;
  /** Range for the starting (root) note. */
  low: string;
  high: string;
  intervals: IntervalName[];
  direction: IntervalDirection;
  /** Play both notes together instead of one after the other. */
  harmonic: boolean;
  /** Show both notes (reading practice) instead of naming the interval. */
  showTarget: boolean;
}

export const INTERVAL_CLEF_RANGES: Record<StaffClef, { low: string; high: string }> = {
  treble: { low: 'C4', high: 'C5' },
  bass: { low: 'C3', high: 'C4' },
  grand: { low: 'C3', high: 'C5' },
};

export const DEFAULT_INTERVALS: IntervalSettings = {
  clef: 'treble',
  ...INTERVAL_CLEF_RANGES.treble,
  intervals: ['m3', 'M3', 'P4', 'P5'],
  direction: 'up',
  harmonic: false,
  showTarget: false,
};

export interface IntervalCandidate {
  key: string;
  root: Note;
  target: Note;
  name: IntervalName;
  up: boolean;
}

export function intervalCandidates(s: IntervalSettings): IntervalCandidate[] {
  const lo = toMidi(parseNote(s.low));
  const hi = toMidi(parseNote(s.high));
  const directions = s.direction === 'both' ? [true, false] : [s.direction === 'up'];
  const out: IntervalCandidate[] = [];
  for (let octave = 0; octave <= 8; octave++) {
    for (const step of STEPS) {
      const root: Note = { step, alter: 0, octave };
      const m = toMidi(root);
      if (m < lo || m > hi) continue;
      for (const name of s.intervals) {
        for (const up of directions) {
          const target = transpose(root, INTERVALS[name], up ? 'up' : 'down');
          if (target) out.push({ key: `${noteName(root)} ${name}${up ? '↑' : '↓'}`, root, target, name, up });
        }
      }
    }
  }
  return out;
}

export function createIntervals(s: IntervalSettings): Exercise {
  const pool = intervalCandidates(s);
  if (pool.length === 0) throw new Error('No intervals match these settings');
  return {
    nextQuestion(weights, rng, previous): Question {
      const choices = previous && pool.length > 1 ? pool.filter((c) => c.key !== previous.itemKey) : pool;
      const c = weightedPick(choices, (x) => 1 + 3 * (weights.get(x.key) ?? 0), rng);
      const both = s.harmonic ? [[c.root, c.target]] : [[c.root], [c.target]];
      const label = `${INTERVALS[c.name].label} ${c.up ? 'up' : 'down'}`;
      return {
        itemKey: c.key,
        clef: s.clef,
        display: s.showTarget ? both : [[c.root]],
        reveal: both,
        prompt: s.showTarget
          ? (s.harmonic ? 'Play both notes together' : 'Play both notes in order')
          : `${label}${s.harmonic ? ' · together' : ''}`,
        answer: s.harmonic
          ? {
              kind: 'chord',
              pitchClasses: [...new Set([pitchClass(toMidi(c.root)), pitchClass(toMidi(c.target))])].sort((a, b) => a - b),
            }
          : { kind: 'notes', midis: [toMidi(c.root), toMidi(c.target)], anyOctave: false },
      };
    },
  };
}
```

`src/drill/chords.ts`:
```ts
import { CHORD_QUALITIES, chordName, chordNotes, chordPitchClasses, type ChordQuality } from '../music/chord';
import { parseNote, type Note } from '../music/note';
import type { StaffClef } from '../staff/types';
import { weightedPick } from './random';
import type { Exercise, Question } from './types';

export interface ChordSettings {
  clef: StaffClef;
  qualities: ChordQuality[];
  inversions: boolean;
  /** Add B♭, E♭, A♭, D♭ and F♯ roots. */
  accidentalRoots: boolean;
  /** Show only the chord symbol (e.g. "F♯m7") instead of notes on the staff. */
  showName: boolean;
}

export const DEFAULT_CHORDS: ChordSettings = {
  clef: 'treble',
  qualities: ['maj', 'min'],
  inversions: false,
  accidentalRoots: false,
  showName: false,
};

const NATURAL_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ACCIDENTAL_ROOTS = ['Bb', 'Eb', 'Ab', 'Db', 'F#'];
const ROOT_OCTAVE: Record<StaffClef, number> = { treble: 4, bass: 3, grand: 3 };
const INVERSION_NAMES = ['', '1st inversion', '2nd inversion', '3rd inversion'];

export interface ChordCandidate {
  key: string;
  root: Note;
  quality: ChordQuality;
  notes: Note[];
}

export function chordCandidates(s: ChordSettings): ChordCandidate[] {
  const roots = [...NATURAL_ROOTS, ...(s.accidentalRoots ? ACCIDENTAL_ROOTS : [])].map((r) =>
    parseNote(`${r}${ROOT_OCTAVE[s.clef]}`),
  );
  const out: ChordCandidate[] = [];
  for (const root of roots) {
    for (const quality of s.qualities) {
      const size = CHORD_QUALITIES[quality].tones.length + 1;
      const inversions = s.inversions && !s.showName ? size : 1;
      for (let inv = 0; inv < inversions; inv++) {
        const notes = chordNotes(root, quality, inv);
        if (!notes) continue;
        const name = chordName(root, quality);
        out.push({ key: inv ? `${name} (${INVERSION_NAMES[inv]})` : name, root, quality, notes });
      }
    }
  }
  return out;
}

export function createChords(s: ChordSettings): Exercise {
  const pool = chordCandidates(s);
  if (pool.length === 0) throw new Error('No chords match these settings');
  return {
    nextQuestion(weights, rng, previous): Question {
      const choices = previous && pool.length > 1 ? pool.filter((c) => c.key !== previous.itemKey) : pool;
      const c = weightedPick(choices, (x) => 1 + 3 * (weights.get(x.key) ?? 0), rng);
      return {
        itemKey: c.key,
        clef: s.clef,
        display: s.showName ? [] : [c.notes],
        reveal: [c.notes],
        prompt: s.showName ? chordName(c.root, c.quality) : undefined,
        answer: { kind: 'chord', pitchClasses: chordPitchClasses(c.notes) },
      };
    },
  };
}
```

`src/drill/scales.ts`:
```ts
import { keySignatureFor, type KeySignature } from '../music/key';
import { parseNote, toMidi, type Note } from '../music/note';
import { scaleLabel, scaleNotes, type ScaleDirection, type ScaleType } from '../music/scale';
import { weightedPick } from './random';
import type { Exercise, Question } from './types';

export interface ScaleSettings {
  clef: 'treble' | 'bass';
  types: ScaleType[];
  /** Add A♭, D♭, G♭, F♯ and C♯ tonics. */
  moreKeys: boolean;
  direction: ScaleDirection;
  /** Show only the key signature; the player works out the notes (any octave). */
  keySignatureOnly: boolean;
}

export const DEFAULT_SCALES: ScaleSettings = {
  clef: 'treble',
  types: ['major'],
  moreKeys: false,
  direction: 'up',
  keySignatureOnly: false,
};

const COMMON_TONICS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Bb', 'Eb'];
const MORE_TONICS = ['Ab', 'Db', 'Gb', 'F#', 'C#'];
const TONIC_OCTAVE = { treble: 4, bass: 3 };

export interface ScaleCandidate {
  key: string;
  label: string;
  notes: Note[];
  keySignature: KeySignature;
}

export function scaleCandidates(s: ScaleSettings): ScaleCandidate[] {
  const tonics = [...COMMON_TONICS, ...(s.moreKeys ? MORE_TONICS : [])].map((t) => parseNote(`${t}${TONIC_OCTAVE[s.clef]}`));
  const out: ScaleCandidate[] = [];
  for (const tonic of tonics) {
    for (const type of s.types) {
      const notes = scaleNotes(tonic, type, s.direction);
      const keySignature = keySignatureFor(tonic, type);
      if (!notes || !keySignature) continue;
      const label = scaleLabel(tonic, type);
      out.push({ key: `${label} ${s.direction}`, label, notes, keySignature });
    }
  }
  return out;
}

export function createScales(s: ScaleSettings): Exercise {
  const pool = scaleCandidates(s);
  if (pool.length === 0) throw new Error('No scales match these settings');
  return {
    nextQuestion(weights, rng, previous): Question {
      const choices = previous && pool.length > 1 ? pool.filter((c) => c.key !== previous.itemKey) : pool;
      const c = weightedPick(choices, (x) => 1 + 3 * (weights.get(x.key) ?? 0), rng);
      const sequence = c.notes.map((n) => [n]);
      return {
        itemKey: c.key,
        clef: s.clef,
        display: s.keySignatureOnly ? [] : sequence,
        reveal: sequence,
        keySignature: c.keySignature,
        prompt: `${c.label} · ${s.direction === 'up' ? 'up one octave' : 'up and back down'}`,
        answer: { kind: 'notes', midis: c.notes.map(toMidi), anyOctave: s.keySignatureOnly },
      };
    },
  };
}
```

`src/drill/exercises.ts`:
```ts
import { createChords, DEFAULT_CHORDS, type ChordSettings } from './chords';
import { createIntervals, DEFAULT_INTERVALS, type IntervalSettings } from './intervals';
import { createNoteReading, DEFAULT_NOTE_READING, type NoteReadingSettings } from './noteReading';
import { createScales, DEFAULT_SCALES, type ScaleSettings } from './scales';
import type { Exercise } from './types';

export type ExerciseType = 'note-reading' | 'intervals' | 'chords' | 'scales';

export type ExerciseSettings =
  | ({ type: 'note-reading' } & NoteReadingSettings)
  | ({ type: 'intervals' } & IntervalSettings)
  | ({ type: 'chords' } & ChordSettings)
  | ({ type: 'scales' } & ScaleSettings);

export const EXERCISE_TYPES: ExerciseType[] = ['note-reading', 'intervals', 'chords', 'scales'];

export const EXERCISE_LABELS: Record<ExerciseType, string> = {
  'note-reading': 'Note reading',
  intervals: 'Intervals',
  chords: 'Chords',
  scales: 'Scales',
};

export function defaultSettings(type: ExerciseType): ExerciseSettings {
  switch (type) {
    case 'note-reading':
      return { type, ...structuredClone(DEFAULT_NOTE_READING) };
    case 'intervals':
      return { type, ...structuredClone(DEFAULT_INTERVALS) };
    case 'chords':
      return { type, ...structuredClone(DEFAULT_CHORDS) };
    case 'scales':
      return { type, ...structuredClone(DEFAULT_SCALES) };
  }
}

export function createExercise(s: ExerciseSettings): Exercise {
  switch (s.type) {
    case 'note-reading':
      return createNoteReading(s);
    case 'intervals':
      return createIntervals(s);
    case 'chords':
      return createChords(s);
    case 'scales':
      return createScales(s);
  }
}

/** IndexedDB key for a type's last-used setup. Note reading keeps its original key so saved setups survive. */
export function setupKey(type: ExerciseType): string {
  return type === 'note-reading' ? 'noteReadingSetup' : `${type}Setup`;
}
```

Replace `src/drill/config.ts`:
```ts
import { defaultSettings, type ExerciseSettings, type ExerciseType } from './exercises';
import type { SessionOptions } from './session';

export interface DrillConfig {
  exercise: ExerciseSettings;
  session: SessionOptions;
}

export const DEFAULT_SESSION: SessionOptions = { length: 20, missMode: 'retry', weighting: true };

export function defaultConfig(type: ExerciseType): DrillConfig {
  return { exercise: defaultSettings(type), session: { ...DEFAULT_SESSION } };
}

export const DEFAULT_DRILL_CONFIG: DrillConfig = defaultConfig('note-reading');
```

`src/ui/DrillSetup.svelte` will no longer type-check after this change (its `config.exercise` is now a union). Keep it compiling with the minimal change: in its `onMount`, merge as `exercise: { ...DEFAULT_DRILL_CONFIG.exercise, ...saved.exercise, type: 'note-reading' }`, and wherever it reads `config.exercise.low/high/clef/accidentals/anyOctave` or passes it to `candidateNotes`, narrow first with a local `const ex = config.exercise as Extract<ExerciseSettings, { type: 'note-reading' }>;` (bindings may use `(config.exercise as ...)`-free forms by binding to a `$derived` alias if needed). If this becomes awkward, it is acceptable to leave the note-reading-specific markup in place with casts: Task 6 replaces this file entirely. `Drill.svelte` must switch `createNoteReading(config.exercise)` to `createExercise(config.exercise)` (import from `../drill/exercises`).

- [ ] **Step 4: Verify and commit**

Run: `npx vitest run src/drill` → PASS; `npm test`; `npm run check` (0 errors); `npm run build`.
```bash
git add -A
git commit -m "feat: interval, chord and scale exercises behind one exercise factory" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: UI — exercise menu, setup panels, generic drill, chord diagnostics

**Files:**
- Modify: `src/App.svelte`, `src/ui/Home.svelte`, `src/app.css`, `src/ui/Calibrate.svelte`
- Replace: `src/ui/DrillSetup.svelte`, `src/ui/Drill.svelte`
- Create: `src/ui/options/choices.ts`, `src/ui/options/NoteReadingOptions.svelte`, `src/ui/options/IntervalOptions.svelte`, `src/ui/options/ChordOptions.svelte`, `src/ui/options/ScaleOptions.svelte`

**Interfaces:**
- Consumes: everything above. Setting keys from `setupKey(type)`.
- Produces: Home lists all four exercises; each opens its setup screen; the drill handles notes, sequences and chords; Calibrate shows live chroma bars and a detected-chord log.

- [ ] **Step 1: Shared styles and option helpers**

Append to `src/app.css` (moved from DrillSetup so option panels share them):
```css
.setup section { margin: 1.25rem 0; }
.setup h2 { font-size: 1rem; color: var(--muted); margin: 0 0 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
.seg { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.seg button.selected { background: var(--fg); color: #fff; border-color: var(--fg); }
.setup label { margin-right: 1rem; }
label.check { display: inline-flex; align-items: center; gap: 0.4rem; margin-top: 0.75rem; }
input[type='checkbox'] { width: 24px; height: 24px; min-height: 0; }
.muted { color: var(--muted); }
```

`src/ui/options/choices.ts`:
```ts
import { STEPS } from '../../music/note';
import type { StaffClef } from '../../staff/types';

/** Natural notes C2–C7 for range pickers (detection is unreliable below about A1). */
export const RANGE_NOTES: string[] = [];
for (let o = 2; o <= 6; o++) for (const s of STEPS) RANGE_NOTES.push(`${s}${o}`);
RANGE_NOTES.push('C7');

export const CLEF_CHOICES: { value: StaffClef; label: string }[] = [
  { value: 'treble', label: 'Treble' },
  { value: 'bass', label: 'Bass' },
  { value: 'grand', label: 'Grand staff' },
];

/** Add or remove a value from a multi-select list. */
export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
```

- [ ] **Step 2: Option panels**

Each panel takes the exercise settings as a bindable prop and edits it in place.

`src/ui/options/NoteReadingOptions.svelte`:
```svelte
<script lang="ts">
  import { candidateNotes, CLEF_DEFAULT_RANGES, type NoteReadingSettings } from '../../drill/noteReading';
  import { parseNote, toMidi } from '../../music/note';
  import type { StaffClef } from '../../staff/types';
  import { CLEF_CHOICES, RANGE_NOTES } from './choices';

  let { settings = $bindable() }: { settings: NoteReadingSettings } = $props();

  const poolSize = $derived(
    toMidi(parseNote(settings.low)) <= toMidi(parseNote(settings.high)) ? candidateNotes(settings).length : 0,
  );

  function setClef(c: StaffClef) {
    settings.clef = c;
    settings.low = CLEF_DEFAULT_RANGES[c].low;
    settings.high = CLEF_DEFAULT_RANGES[c].high;
  }
</script>

<section>
  <h2>Clef</h2>
  <div class="seg">
    {#each CLEF_CHOICES as c}
      <button class:selected={settings.clef === c.value} onclick={() => setClef(c.value)}>{c.label}</button>
    {/each}
  </div>
</section>

<section>
  <h2>Range</h2>
  <label>From <select bind:value={settings.low}>{#each RANGE_NOTES as n}<option value={n}>{n}</option>{/each}</select></label>
  <label>to <select bind:value={settings.high}>{#each RANGE_NOTES as n}<option value={n}>{n}</option>{/each}</select></label>
  <span class="muted">{poolSize} notes</span>
  <label class="check"><input type="checkbox" bind:checked={settings.accidentals} /> Sharps &amp; flats</label>
  <label class="check"><input type="checkbox" bind:checked={settings.anyOctave} /> Accept any octave</label>
</section>
```

`src/ui/options/IntervalOptions.svelte`:
```svelte
<script lang="ts">
  import { INTERVAL_CLEF_RANGES, intervalCandidates, type IntervalDirection, type IntervalSettings } from '../../drill/intervals';
  import { INTERVAL_NAMES, INTERVALS } from '../../music/interval';
  import { parseNote, toMidi } from '../../music/note';
  import type { StaffClef } from '../../staff/types';
  import { CLEF_CHOICES, RANGE_NOTES, toggle } from './choices';

  let { settings = $bindable() }: { settings: IntervalSettings } = $props();

  const DIRECTIONS: { value: IntervalDirection; label: string }[] = [
    { value: 'up', label: 'Up' },
    { value: 'down', label: 'Down' },
    { value: 'both', label: 'Both' },
  ];

  const poolSize = $derived(
    toMidi(parseNote(settings.low)) <= toMidi(parseNote(settings.high)) ? intervalCandidates(settings).length : 0,
  );

  function setClef(c: StaffClef) {
    settings.clef = c;
    settings.low = INTERVAL_CLEF_RANGES[c].low;
    settings.high = INTERVAL_CLEF_RANGES[c].high;
  }
</script>

<section>
  <h2>Intervals</h2>
  <div class="seg">
    {#each INTERVAL_NAMES as name}
      <button class:selected={settings.intervals.includes(name)} onclick={() => (settings.intervals = toggle(settings.intervals, name))}>
        {INTERVALS[name].label}
      </button>
    {/each}
  </div>
</section>

<section>
  <h2>Direction</h2>
  <div class="seg">
    {#each DIRECTIONS as d}
      <button class:selected={settings.direction === d.value} onclick={() => (settings.direction = d.value)}>{d.label}</button>
    {/each}
  </div>
  <label class="check"><input type="checkbox" bind:checked={settings.harmonic} /> Play both notes together</label>
  <label class="check"><input type="checkbox" bind:checked={settings.showTarget} /> Show both notes (reading practice)</label>
</section>

<section>
  <h2>Clef &amp; starting notes</h2>
  <div class="seg">
    {#each CLEF_CHOICES as c}
      <button class:selected={settings.clef === c.value} onclick={() => setClef(c.value)}>{c.label}</button>
    {/each}
  </div>
  <label>From <select bind:value={settings.low}>{#each RANGE_NOTES as n}<option value={n}>{n}</option>{/each}</select></label>
  <label>to <select bind:value={settings.high}>{#each RANGE_NOTES as n}<option value={n}>{n}</option>{/each}</select></label>
  <span class="muted">{poolSize} intervals</span>
</section>
```

`src/ui/options/ChordOptions.svelte`:
```svelte
<script lang="ts">
  import { chordCandidates, type ChordSettings } from '../../drill/chords';
  import { CHORD_QUALITIES, CHORD_QUALITY_NAMES } from '../../music/chord';
  import { CLEF_CHOICES, toggle } from './choices';

  let { settings = $bindable() }: { settings: ChordSettings } = $props();

  const poolSize = $derived(chordCandidates(settings).length);
</script>

<section>
  <h2>Chord types</h2>
  <div class="seg">
    {#each CHORD_QUALITY_NAMES as q}
      <button class:selected={settings.qualities.includes(q)} onclick={() => (settings.qualities = toggle(settings.qualities, q))}>
        {CHORD_QUALITIES[q].label}
      </button>
    {/each}
  </div>
  <span class="muted">{poolSize} chords</span>
</section>

<section>
  <h2>Show</h2>
  <div class="seg">
    <button class:selected={!settings.showName} onclick={() => (settings.showName = false)}>Notes on the staff</button>
    <button class:selected={settings.showName} onclick={() => (settings.showName = true)}>Chord name only</button>
  </div>
  <label class="check"><input type="checkbox" bind:checked={settings.accidentalRoots} /> Include B♭, E♭, A♭, D♭, F♯ roots</label>
  <label class="check"><input type="checkbox" bind:checked={settings.inversions} disabled={settings.showName} /> Inversions</label>
</section>

<section>
  <h2>Clef</h2>
  <div class="seg">
    {#each CLEF_CHOICES as c}
      <button class:selected={settings.clef === c.value} onclick={() => (settings.clef = c.value)}>{c.label}</button>
    {/each}
  </div>
</section>
```

`src/ui/options/ScaleOptions.svelte`:
```svelte
<script lang="ts">
  import { scaleCandidates, type ScaleSettings } from '../../drill/scales';
  import { SCALE_TYPE_NAMES, SCALE_TYPES } from '../../music/scale';
  import { toggle } from './choices';

  let { settings = $bindable() }: { settings: ScaleSettings } = $props();

  const poolSize = $derived(scaleCandidates(settings).length);
</script>

<section>
  <h2>Scale types</h2>
  <div class="seg">
    {#each SCALE_TYPE_NAMES as t}
      <button class:selected={settings.types.includes(t)} onclick={() => (settings.types = toggle(settings.types, t))}>
        {SCALE_TYPES[t].label}
      </button>
    {/each}
  </div>
  <label class="check"><input type="checkbox" bind:checked={settings.moreKeys} /> More keys (A♭, D♭, G♭, F♯, C♯)</label>
  <span class="muted">{poolSize} scales</span>
</section>

<section>
  <h2>Play</h2>
  <div class="seg">
    <button class:selected={settings.direction === 'up'} onclick={() => (settings.direction = 'up')}>Up one octave</button>
    <button class:selected={settings.direction === 'up-down'} onclick={() => (settings.direction = 'up-down')}>Up and back down</button>
  </div>
</section>

<section>
  <h2>Show</h2>
  <div class="seg">
    <button class:selected={!settings.keySignatureOnly} onclick={() => (settings.keySignatureOnly = false)}>Notes</button>
    <button class:selected={settings.keySignatureOnly} onclick={() => (settings.keySignatureOnly = true)}>Key signature only</button>
  </div>
  <div class="seg" style="margin-top: 0.75rem">
    <button class:selected={settings.clef === 'treble'} onclick={() => (settings.clef = 'treble')}>Treble</button>
    <button class:selected={settings.clef === 'bass'} onclick={() => (settings.clef = 'bass')}>Bass</button>
  </div>
</section>
```

- [ ] **Step 3: Generic setup screen**

Replace `src/ui/DrillSetup.svelte`:
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { defaultConfig, type DrillConfig } from '../drill/config';
  import { createExercise, EXERCISE_LABELS, setupKey, type ExerciseSettings, type ExerciseType } from '../drill/exercises';
  import type { MissMode, SessionLength } from '../drill/types';
  import { getSetting, setSetting } from '../progress/db';
  import ChordOptions from './options/ChordOptions.svelte';
  import IntervalOptions from './options/IntervalOptions.svelte';
  import NoteReadingOptions from './options/NoteReadingOptions.svelte';
  import ScaleOptions from './options/ScaleOptions.svelte';

  let { type, onStart, onBack }: { type: ExerciseType; onStart: (c: DrillConfig) => void; onBack: () => void } = $props();

  // The screen is remounted per exercise type, so reading `type` once is intended.
  let config = $state<DrillConfig>(defaultConfig(type));
  onMount(async () => {
    const saved = await getSetting<DrillConfig | null>(setupKey(type), null);
    if (!saved) return;
    const d = defaultConfig(type);
    config = {
      exercise: { ...d.exercise, ...saved.exercise, type } as ExerciseSettings,
      session: { ...d.session, ...saved.session },
    };
  });

  const LENGTHS: { value: SessionLength; label: string }[] = [
    { value: 10, label: '10' },
    { value: 20, label: '20' },
    { value: 50, label: '50' },
    { value: 'endless', label: 'Endless' },
  ];
  const MISS_MODES: { value: MissMode; label: string }[] = [
    { value: 'retry', label: 'Retry until correct' },
    { value: 'move-on', label: 'Show answer & move on' },
  ];

  const startable = $derived.by(() => {
    try {
      createExercise($state.snapshot(config.exercise) as ExerciseSettings);
      return true;
    } catch {
      return false;
    }
  });

  function start() {
    const snap = $state.snapshot(config) as DrillConfig;
    onStart(snap);
    void setSetting(setupKey(type), snap).catch(() => undefined);
  }
</script>

<main class="screen setup">
  <button onclick={onBack}>← Back</button>
  <h1>{EXERCISE_LABELS[type]}</h1>

  {#if config.exercise.type === 'note-reading'}
    <NoteReadingOptions bind:settings={config.exercise} />
  {:else if config.exercise.type === 'intervals'}
    <IntervalOptions bind:settings={config.exercise} />
  {:else if config.exercise.type === 'chords'}
    <ChordOptions bind:settings={config.exercise} />
  {:else}
    <ScaleOptions bind:settings={config.exercise} />
  {/if}

  <section>
    <h2>Length</h2>
    <div class="seg">
      {#each LENGTHS as l}
        <button class:selected={config.session.length === l.value} onclick={() => (config.session.length = l.value)}>{l.label}</button>
      {/each}
    </div>
  </section>

  <section>
    <h2>On a wrong answer</h2>
    <div class="seg">
      {#each MISS_MODES as m}
        <button class:selected={config.session.missMode === m.value} onclick={() => (config.session.missMode = m.value)}>{m.label}</button>
      {/each}
    </div>
    <label class="check"><input type="checkbox" bind:checked={config.session.weighting} /> Repeat what I miss more often</label>
  </section>

  <button class="primary big" disabled={!startable} onclick={start}>Start</button>
</main>
```
If svelte-check rejects `bind:settings={config.exercise}` on the narrowed union, keep the same structure but give each option panel `settings` typed as the union member (e.g. `Extract<ExerciseSettings, { type: 'intervals' }>`), or bind through a typed `$derived` alias; record the choice in the report.

- [ ] **Step 4: Home and App**

Replace `src/ui/Home.svelte`:
```svelte
<script lang="ts">
  import { EXERCISE_LABELS, EXERCISE_TYPES, type ExerciseType } from '../drill/exercises';

  let { tuningOffset, onDrill, onCalibrate }: {
    tuningOffset: number;
    onDrill: (type: ExerciseType) => void;
    onCalibrate: () => void;
  } = $props();
</script>

<main class="screen home">
  <h1>Piano Trainer</h1>
  <div class="exercises">
    {#each EXERCISE_TYPES as t}
      <button class="primary big" onclick={() => onDrill(t)}>{EXERCISE_LABELS[t]}</button>
    {/each}
  </div>
  <div class="actions">
    <button onclick={onCalibrate}>Calibrate &amp; mic test</button>
  </div>
  <p class="tuning">Tuning: {tuningOffset === 0 ? 'A440' : `${tuningOffset > 0 ? '+' : ''}${tuningOffset} cents`}</p>
  <p class="build">Build {__BUILD__}</p>
</main>

<style>
  .exercises { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; max-width: 640px; }
  .actions { margin-top: 1.5rem; }
  .tuning { color: var(--muted); }
  .build { color: var(--muted); font-size: 0.8rem; }
</style>
```

In `src/App.svelte`:
1. Add `import type { ExerciseType } from './drill/exercises';`.
2. Change the setup screen variant to `| { name: 'setup'; type: ExerciseType }`.
3. Home: `onDrill={(type) => (screen = { name: 'setup', type })}`.
4. Setup branch:
```svelte
{:else if screen.name === 'setup'}
  {@const s = screen}
  {#key s.type}
    <DrillSetup type={s.type} onStart={drill} onBack={home} />
  {/key}
```

- [ ] **Step 5: Generic drill screen**

Replace `src/ui/Drill.svelte`:
```svelte
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Staff from './Staff.svelte';
  import { meterPercent, type Levels } from '../audio/calibration';
  import { ChordTracker } from '../audio/chordTracker';
  import { Mic, type AudioFrame } from '../audio/mic';
  import { micErrorMessage } from '../audio/micErrors';
  import { NoteTracker } from '../audio/noteTracker';
  import { describeReveal, heardPitchClasses, pitchClassNames } from '../drill/answer';
  import type { DrillConfig } from '../drill/config';
  import { createExercise } from '../drill/exercises';
  import { DrillSession, type SessionStats } from '../drill/session';
  import type { Heard, Question } from '../drill/types';
  import { displayName, fromMidi, type Note } from '../music/note';
  import type { Highlight, StaffView } from '../staff/types';

  let { config, tuningOffset, levels, onFinish, onExit }: {
    config: DrillConfig;
    tuningOffset: number;
    levels: Levels;
    onFinish: (stats: SessionStats) => void;
    onExit: () => void;
  } = $props();

  const SILENCE_HINT_MS = 5000;
  const CORRECT_MS = 450;
  // Spec calls for showing the answer "~1 s" before moving on in move-on mode.
  const REVEAL_MS = 1000;
  const WRONG_FLASH_MS = 500;

  // Config, tuning and levels are fixed for the lifetime of a drill.
  const session = new DrillSession(createExercise(config.exercise), config.session);
  const silenceRms = levels.silenceRms;
  const tracker = new NoteTracker({ tuningOffsetCents: tuningOffset, silenceRms });
  const chordTracker = new ChordTracker({ silenceRms });
  const lengthLabel = config.session.length === 'endless' ? '' : ` / ${config.session.length}`;

  let mic: Mic | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastSound = 0;
  let starting = false;
  let destroyed = false;
  let wakeLock: WakeLockSentinel | null = null;

  let started = $state(false);
  let suspended = $state(false);
  let error = $state('');
  // Typed via $state<T | null>(...) to avoid a TS 6 + svelte-check 4.7.6 narrowing bug.
  let view = $state<StaffView | null>(null);
  let prompt = $state('');
  let feedback: 'correct' | 'wrong' | null = $state(null);
  let message = $state('');
  let correct = $state(0);
  let answered = $state(0);
  let level = $state(0);
  let silentHint = $state(false);

  /** Staff for a question; the first `greenCount` items are marked correct, the rest get `highlight`. */
  function staffView(q: Question, items: Note[][], highlight: Highlight = null, greenCount = 0): StaffView {
    return {
      clef: q.clef,
      keySignature: q.keySignature,
      items: items.map((notes, i) => ({ notes, highlight: i < greenCount ? 'correct' : highlight })),
    };
  }

  function showQuestion() {
    const q = session.current!;
    view = staffView(q, q.display);
    prompt = q.prompt ?? '';
    feedback = null;
    message = '';
  }

  function syncScore() {
    const s = session.stats();
    correct = s.correct;
    answered = s.asked;
  }

  function onFrame(f: AudioFrame) {
    level = f.rms;
    if (f.rms >= silenceRms) {
      lastSound = f.time;
      silentHint = false;
    } else if (session.state === 'asking' && f.time - lastSound > SILENCE_HINT_MS) {
      silentHint = true;
    }
    const noteEvent = tracker.push(f);
    if (noteEvent) onHeard({ kind: 'note', midi: noteEvent.midi, time: noteEvent.time });
    const chordEvent = chordTracker.push(f);
    if (chordEvent) onHeard({ kind: 'chord', chroma: chordEvent.chroma, time: chordEvent.time });
  }

  function heardText(h: Heard): string {
    if (h.kind === 'note') return displayName(fromMidi(h.midi));
    return pitchClassNames(heardPitchClasses(h.chroma)) || 'nothing clear';
  }

  function onHeard(h: Heard) {
    const q = session.current;
    const result = session.hear(h);
    if (result === 'ignored' || !q) return;
    syncScore();

    if (result === 'progress') {
      view = staffView(q, q.display, null, session.matched);
      feedback = null;
      message = '';
      return;
    }

    clearTimeout(timer);
    if (result === 'correct') {
      feedback = 'correct';
      message = '';
      view = staffView(q, q.reveal, 'correct');
      timer = setTimeout(next, CORRECT_MS);
    } else if (session.state === 'revealing') {
      feedback = 'wrong';
      message = `You played ${heardText(h)}. Answer: ${describeReveal(q)}`;
      view = staffView(q, q.reveal, 'answer');
      timer = setTimeout(next, REVEAL_MS);
    } else {
      feedback = 'wrong';
      message = `You played ${heardText(h)}. Try again.`;
      view = staffView(q, q.display, 'wrong', session.matched);
      timer = setTimeout(() => {
        if (session.state === 'asking') {
          feedback = null;
          view = staffView(q, q.display, null, session.matched);
        }
      }, WRONG_FLASH_MS);
    }
  }

  async function lockScreen() {
    try {
      wakeLock = (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      wakeLock = null;
    }
  }

  function attach(m: Mic) {
    mic = m;
    mic.setTuningOffset(tuningOffset);
    mic.onFrame = onFrame;
    mic.onInterrupted = () => {
      if (started) suspended = true;
    };
  }

  async function start() {
    if (starting || started) return;
    starting = true;
    error = '';
    let m: Mic;
    try {
      m = await Mic.open();
    } catch (e) {
      error = micErrorMessage(e);
      starting = false;
      return;
    }
    if (destroyed) {
      void m.close();
      return;
    }
    attach(m);
    session.start();
    showQuestion();
    lastSound = performance.now();
    m.start();
    started = true;
    starting = false;
    await lockScreen();
  }

  function next() {
    session.advance();
    if (session.state === 'done') {
      finish();
      return;
    }
    showQuestion();
  }

  function finish() {
    clearTimeout(timer);
    session.finish();
    void wakeLock?.release();
    wakeLock = null;
    void mic?.close();
    mic = null;
    const stats = session.stats();
    if (stats.asked === 0) onExit();
    else onFinish(stats);
  }

  function onVisibility() {
    if (document.visibilityState !== 'visible') return;
    if (started && session.state !== 'done') void lockScreen();
    if (mic && !mic.healthy) suspended = true;
  }

  async function resume() {
    try {
      await mic?.resume();
    } catch {
      // handled by the health check below
    }
    if (!mic?.healthy) {
      try {
        void mic?.close();
        const m = await Mic.open();
        attach(m);
        m.start();
      } catch (e) {
        error = micErrorMessage(e);
        return;
      }
    }
    tracker.reset();
    chordTracker.reset();
    lastSound = performance.now();
    suspended = false;
  }

  onMount(() => document.addEventListener('visibilitychange', onVisibility));
  onDestroy(() => {
    destroyed = true;
    document.removeEventListener('visibilitychange', onVisibility);
    clearTimeout(timer);
    void wakeLock?.release();
    wakeLock = null;
    void mic?.close();
  });
</script>

<div class="drill" class:correct={feedback === 'correct'} class:wrong={feedback === 'wrong'}>
  <header>
    <button onclick={finish}>✕ End</button>
    <span class="score">{correct} correct · {answered}{lengthLabel}</span>
    <div class="level"><div style="width: {meterPercent(level, levels)}%"></div></div>
  </header>

  {#if !started}
    <div class="center">
      <button class="primary big" onclick={start}>Tap to start</button>
      {#if error}<p class="error">{error}</p>{/if}
    </div>
  {:else}
    {#if prompt}<p class="prompt">{prompt}</p>{/if}
    {#if view}<Staff {view} />{/if}
    <p class="message">{message}</p>
    {#if silentHint}<p class="hint">Can't hear the piano. Check that the mic isn't covered.</p>{/if}
  {/if}

  {#if suspended}
    <div class="overlay">
      <button class="primary big" onclick={resume}>Tap to resume</button>
      {#if error}<p class="error">{error}</p>{/if}
    </div>
  {/if}
</div>

<style>
  .drill { min-height: 100vh; padding: 1rem 1.5rem; transition: background 150ms; }
  .drill.correct { background: #e8f7ee; }
  .drill.wrong { background: #fbeaea; }
  header { display: flex; align-items: center; gap: 1.5rem; }
  .score { font-size: 1.4rem; font-weight: 600; }
  .level { flex: 1; max-width: 200px; height: 10px; background: #e5e7eb; border-radius: 5px; overflow: hidden; margin-left: auto; }
  .level div { height: 100%; background: var(--correct); }
  .center { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; }
  .prompt { text-align: center; font-size: 2rem; font-weight: 600; margin: 1rem 0 0; }
  .message { text-align: center; font-size: 1.5rem; min-height: 2rem; }
  .hint { text-align: center; color: var(--muted); }
  .overlay { position: fixed; inset: 0; background: rgba(251, 250, 247, 0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; }
</style>
```
Before replacing, diff the current file's resume/visibility/wake-lock logic against this version and keep any behavior the current file has that this one lacks (report anything you carried over).

- [ ] **Step 6: Chord diagnostics on the Calibrate screen**

In `src/ui/Calibrate.svelte`:
1. Imports: change the tracker/mic imports to also bring in `import { ChordTracker } from '../audio/chordTracker';`, `import type { AudioFrame } from '../audio/mic';` (keep `Mic`), `import { heardPitchClasses, pitchClassNames } from '../drill/answer';`, and add `PITCH_CLASS_NAMES` to the `../music/note` import.
2. `let frame = $state<AudioFrame | null>(null);`, add `const chordTracker = new ChordTracker();` and `let chords: string[] = $state([]);`.
3. In `startMic()`, after `tracker.setSilenceRms(levels.silenceRms);` add `chordTracker.setSilenceRms(levels.silenceRms);` and `mic.setTuningOffset(tuningOffset);`. In `onFrame`, after the note tracker line add:
```ts
      const chord = chordTracker.push(f);
      if (chord) chords = [pitchClassNames(heardPitchClasses(chord.chroma)) || '?', ...chords].slice(0, 6);
```
4. In `finishCalibration()`, after `tracker.setSilenceRms(measured.silenceRms);` add `chordTracker.setSilenceRms(measured.silenceRms);` and `mic?.setTuningOffset(offset);`.
5. Add a derived chroma display:
```ts
  const chromaBars = $derived.by(() => {
    if (!frame || frame.rms < levels.silenceRms) return new Array(12).fill(0);
    const max = Math.max(...frame.chroma);
    return max > 0 ? Array.from(frame.chroma, (v) => (v / max) * 100) : new Array(12).fill(0);
  });
```
6. In the markup, after the `Detected notes:` paragraph:
```svelte
    <div class="chroma">
      {#each PITCH_CLASS_NAMES as name, pc}
        <div class="bar"><div class="fill" style="height: {chromaBars[pc]}%"></div><span>{name}</span></div>
      {/each}
    </div>
    <p>Detected chords: {chords.join(' · ') || '(play a chord)'}</p>
```
7. Styles:
```css
  .chroma { display: grid; grid-template-columns: repeat(12, 1fr); gap: 4px; height: 120px; margin: 1rem 0; }
  .bar { display: flex; flex-direction: column; justify-content: flex-end; align-items: center; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
  .fill { width: 100%; background: var(--accent); }
  .bar span { font-size: 0.75rem; padding: 2px 0; }
```

- [ ] **Step 7: Verify and commit**

Run: `npm test`, `npm run check` (0 errors; warnings only of the existing `state_referenced_locally` kind), `npm run build`. Leave no dev/preview server running.
```bash
git add -A
git commit -m "feat: interval, chord and scale drills in the UI, with chord diagnostics" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Controller verification (not the implementer):** serve the build, fake the mic with oscillators at the user's level (≈ −71 dB) plus room noise, and drive: note reading still 10/10; an interval drill (melodic: two tones in order; harmonic: two simultaneous tones); a chord drill (three simultaneous triangle oscillators, right chord → correct, wrong chord → "You played …"); a scale drill (eight tones in order, notes turning green one by one; key signature drawn); the Calibrate chroma bars and chord log.

---

### Task 7: Final review and deploy (controller)

- [ ] Whole-branch review; one fix wave if needed.
- [ ] Merge to `main` (fast-forward), push, watch the Pages deploy, confirm the live build label.
- [ ] Ask the user to reopen the app until the new build shows, recalibrate, then try each exercise; for chords, report what the Calibrate chroma bars show if detection misbehaves (thresholds: `CHORD_THRESHOLDS` in `src/drill/answer.ts`).
