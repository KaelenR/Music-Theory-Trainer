# Milestone 3: Learning Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A guided path of 29 lessons (concept cards → try-it at the piano → 10-question checkpoint, pass at 8) plus a reference library, and a new Harmony (Roman numeral) drill.

**Architecture:** Lessons are typed data (`src/learn/content/*.ts`) built with small helpers over the existing music model; `src/learn/curriculum.ts` is the only place that orders and groups them. One generic Lesson screen renders cards (text + staff + keyboard diagram), runs a `TryItSession` over the existing note/chord trackers, then hands a preset `DrillConfig` to the existing Drill screen. Lesson progress lives in a new IndexedDB object store.

**Tech Stack:** Vite 8, Svelte 5 (runes), TypeScript 6, Vitest 5, VexFlow 5, idb 8, fake-indexeddb (tests).

**Spec:** `docs/superpowers/specs/2026-09-21-learning-suite-design.md` (builds on `docs/superpowers/specs/2026-09-21-piano-trainer-design.md`).

## Global Constraints

- Repo: `C:\Users\Kaelen Raible\music_app\Music-Theory-Trainer` (Git Bash), branch `milestone-3-learn`. Never push — the controller deploys.
- All practice is played on the piano; nothing is locked; pass = `correct >= 8` of 10 (`PASS_SCORE`, `CHECKPOINT_LENGTH` constants).
- Checkpoint session options: `length: 10`, `missMode: 'move-on'`, `weighting: true`.
- Lesson order/grouping only in `src/learn/curriculum.ts`. Lesson ids are stable kebab-case strings (they key saved progress).
- Mic: AudioContext only inside a tap handler; mic closed when leaving a screen; loudness thresholds only from `Levels` (never hard-coded RMS).
- IndexedDB writes must be plain objects. The DB upgrade must preserve the existing `kv` store and its data.
- Existing behavior (all drills, calibration, results, setup persistence) must keep working. Adding optional fields must not change existing saved setups.
- Do not use TS constructor parameter properties. Under TS 6.0.3 + svelte-check 4.7.6 write `let x = $state<T | null>(null)`.
- Files are CRLF on disk: use an editor, not `sed`, for multi-line edits.
- Every commit ends with the trailer — use `git commit -m "<subject>" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.
- Before each commit: `npm test` (all pass), `npm run check` (0 errors; existing `state_referenced_locally` warnings are acceptable), `npm run build`.

---

### Task 1: Harmony in the music model; scale tonics

**Files:**
- Create: `src/music/harmony.ts`, `src/music/harmony.test.ts`
- Modify: `src/drill/scales.ts`, `src/drill/scales.test.ts`

**Interfaces:**
- Produces: `type Mode = 'major' | 'minor'`; `romanNumeral(mode, degree): string`; `diatonicQuality(mode, degree): ChordQuality`; `diatonicTriad(tonic: Note, mode: Mode, degree: number): Note[] | null` (degree 1–7, root position; minor keys take V and vii° from harmonic minor). `ScaleSettings.tonics?: string[]`.

- [ ] **Step 1: Failing tests**

`src/music/harmony.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { noteName, parseNote } from './note';
import { diatonicQuality, diatonicTriad, romanNumeral } from './harmony';

const triad = (tonic: string, mode: 'major' | 'minor', degree: number) =>
  diatonicTriad(parseNote(tonic), mode, degree)?.map(noteName) ?? null;

describe('romanNumeral', () => {
  it('names major-key degrees', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((d) => romanNumeral('major', d))).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
  });
  it('names minor-key degrees with a major V', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((d) => romanNumeral('minor', d))).toEqual(['i', 'ii°', 'III', 'iv', 'V', 'VI', 'vii°']);
  });
  it('rejects degrees outside 1–7', () => {
    expect(() => romanNumeral('major', 8)).toThrow();
  });
});

describe('diatonicTriad', () => {
  it('builds major-key triads from the scale', () => {
    expect(triad('C4', 'major', 4)).toEqual(['F4', 'A4', 'C5']);
    expect(triad('G4', 'major', 5)).toEqual(['D5', 'F#5', 'A5']);
    expect(triad('C4', 'major', 7)).toEqual(['B4', 'D5', 'F5']);
    expect(triad('F4', 'major', 2)).toEqual(['G4', 'Bb4', 'D5']);
  });
  it('uses natural minor except for V and vii°', () => {
    expect(triad('A4', 'minor', 1)).toEqual(['A4', 'C5', 'E5']);
    expect(triad('A4', 'minor', 3)).toEqual(['C5', 'E5', 'G5']);
    expect(triad('A4', 'minor', 5)).toEqual(['E5', 'G#5', 'B5']);
    expect(triad('A4', 'minor', 7)).toEqual(['G#5', 'B5', 'D6']);
    expect(triad('D4', 'minor', 4)).toEqual(['G4', 'Bb4', 'D5']);
  });
  it('matches the quality table', () => {
    expect(diatonicQuality('major', 2)).toBe('min');
    expect(diatonicQuality('minor', 2)).toBe('dim');
  });
});
```

Append to `src/drill/scales.test.ts` inside `describe('scaleCandidates', ...)`:
```ts
  it('limits tonics when a list is given', () => {
    expect(scaleCandidates(settings({ tonics: ['C', 'G', 'F'] })).map((c) => c.label)).toEqual(['C major', 'G major', 'F major']);
    expect(scaleCandidates(settings({ tonics: ['Bb'], types: ['major', 'natural-minor'] }))).toHaveLength(2);
  });
```

- [ ] **Step 2: Run** `npx vitest run src/music/harmony.test.ts src/drill/scales.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`src/music/harmony.ts`:
```ts
import { chordNotes, type ChordQuality } from './chord';
import type { Note } from './note';
import { scaleNotes } from './scale';

export type Mode = 'major' | 'minor';

const QUALITIES: Record<Mode, ChordQuality[]> = {
  major: ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'],
  minor: ['min', 'dim', 'maj', 'min', 'maj', 'maj', 'dim'],
};

const NUMERALS: Record<Mode, string[]> = {
  major: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
  minor: ['i', 'ii°', 'III', 'iv', 'V', 'VI', 'vii°'],
};

function checkDegree(degree: number): void {
  if (!Number.isInteger(degree) || degree < 1 || degree > 7) throw new Error(`Invalid scale degree ${degree}`);
}

export function romanNumeral(mode: Mode, degree: number): string {
  checkDegree(degree);
  return NUMERALS[mode][degree - 1];
}

export function diatonicQuality(mode: Mode, degree: number): ChordQuality {
  checkDegree(degree);
  return QUALITIES[mode][degree - 1];
}

/** Root-position triad on a scale degree. Minor keys take V and vii° from harmonic minor (raised 7th). */
export function diatonicTriad(tonic: Note, mode: Mode, degree: number): Note[] | null {
  checkDegree(degree);
  const type = mode === 'major' ? 'major' : degree === 5 || degree === 7 ? 'harmonic-minor' : 'natural-minor';
  const scale = scaleNotes(tonic, type, 'up');
  if (!scale) return null;
  return chordNotes(scale[degree - 1], diatonicQuality(mode, degree));
}
```

In `src/drill/scales.ts`: add to `ScaleSettings`:
```ts
  /** Exact tonics to use (e.g. ['C', 'G', 'F']); overrides moreKeys. Used by lesson presets. */
  tonics?: string[];
```
and in `scaleCandidates` replace the `const tonics = ...` line with:
```ts
  const names = s.tonics ?? [...COMMON_TONICS, ...(s.moreKeys ? MORE_TONICS : [])];
  const tonics = names.map((t) => parseNote(`${t}${TONIC_OCTAVE[s.clef]}`));
```

- [ ] **Step 4: Verify and commit**
```bash
git add -A
git commit -m "feat: diatonic triads and Roman numerals; scale tonic presets" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Harmony drill

**Files:**
- Create: `src/drill/harmony.ts`, `src/drill/harmony.test.ts`, `src/ui/options/HarmonyOptions.svelte`
- Modify: `src/drill/exercises.ts`, `src/ui/DrillSetup.svelte`

**Interfaces:**
- Consumes: Task 1.
- Produces: `HarmonySettings { clef: 'treble'|'bass'; mode: Mode; tonics: string[]; degrees: number[]; showKeyName: boolean }`, `DEFAULT_HARMONY`, `HARMONY_TONICS: Record<Mode, string[]>`, `DEFAULT_HARMONY_TONICS: Record<Mode, string[]>`, `harmonyCandidates(s)`, `createHarmony(s): Exercise`. `ExerciseType` gains `'harmony'` (label "Harmony"), included in `EXERCISE_TYPES`, `defaultSettings`, `createExercise`.

- [ ] **Step 1: Failing tests** — `src/drill/harmony.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { seededRng } from './random';
import { createHarmony, DEFAULT_HARMONY, harmonyCandidates, type HarmonySettings } from './harmony';

const settings = (o: Partial<HarmonySettings> = {}): HarmonySettings => ({ ...DEFAULT_HARMONY, ...o });
const first = (s: HarmonySettings) => createHarmony(s).nextQuestion(new Map(), seededRng(1), null);

describe('harmony', () => {
  it('pairs each key with each chosen degree', () => {
    expect(harmonyCandidates(settings())).toHaveLength(12);
  });
  it('asks for a numeral in a named key and expects the chord', () => {
    const q = first(settings({ tonics: ['G'], degrees: [4] }));
    expect(q.itemKey).toBe('IV in G major');
    expect(q.prompt).toBe('IV in G major');
    expect(q.keySignature?.vexKey).toBe('G');
    expect(q.display).toEqual([]);
    expect(q.reveal[0]).toHaveLength(3);
    expect(q.answer).toEqual({ kind: 'chord', pitchClasses: [0, 4, 7] });
  });
  it('uses harmonic minor for V in minor keys', () => {
    const q = first(settings({ mode: 'minor', tonics: ['A'], degrees: [5] }));
    expect(q.prompt).toBe('V in A minor');
    expect(q.answer).toEqual({ kind: 'chord', pitchClasses: [4, 8, 11] });
    expect(q.keySignature?.vexKey).toBe('C');
  });
  it('can hide the key name', () => {
    expect(first(settings({ tonics: ['G'], degrees: [4], showKeyName: false })).prompt).toBe('IV');
  });
  it('throws with nothing to ask', () => {
    expect(() => createHarmony(settings({ degrees: [] }))).toThrow();
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/drill/harmony.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`src/drill/harmony.ts`:
```ts
import { chordPitchClasses } from '../music/chord';
import { diatonicTriad, romanNumeral, type Mode } from '../music/harmony';
import { keySignatureFor, type KeySignature } from '../music/key';
import { parseNote, pitchName, type Note } from '../music/note';
import { weightedPick } from './random';
import type { Exercise, Question } from './types';

export interface HarmonySettings {
  clef: 'treble' | 'bass';
  mode: Mode;
  /** Key tonics, e.g. ['C', 'G']. */
  tonics: string[];
  /** Scale degrees 1–7. */
  degrees: number[];
  /** Show "in G major"; otherwise only the numeral and key signature. */
  showKeyName: boolean;
}

export const HARMONY_TONICS: Record<Mode, string[]> = {
  major: ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab'],
  minor: ['A', 'E', 'B', 'D', 'G', 'C', 'F'],
};

export const DEFAULT_HARMONY_TONICS: Record<Mode, string[]> = {
  major: ['C', 'G', 'D', 'F'],
  minor: ['A', 'E', 'D', 'G'],
};

export const DEFAULT_HARMONY: HarmonySettings = {
  clef: 'treble',
  mode: 'major',
  tonics: [...DEFAULT_HARMONY_TONICS.major],
  degrees: [1, 4, 5],
  showKeyName: true,
};

const TONIC_OCTAVE = { treble: 4, bass: 3 };

export interface HarmonyCandidate {
  key: string;
  numeral: string;
  notes: Note[];
  keySignature: KeySignature;
}

export function harmonyCandidates(s: HarmonySettings): HarmonyCandidate[] {
  const out: HarmonyCandidate[] = [];
  for (const t of s.tonics) {
    const tonic = parseNote(`${t}${TONIC_OCTAVE[s.clef]}`);
    const keySignature = keySignatureFor(tonic, s.mode === 'major' ? 'major' : 'natural-minor');
    if (!keySignature) continue;
    for (const degree of s.degrees) {
      const notes = diatonicTriad(tonic, s.mode, degree);
      if (!notes) continue;
      const numeral = romanNumeral(s.mode, degree);
      out.push({ key: `${numeral} in ${pitchName(tonic)} ${s.mode}`, numeral, notes, keySignature });
    }
  }
  return out;
}

export function createHarmony(s: HarmonySettings): Exercise {
  const pool = harmonyCandidates(s);
  if (pool.length === 0) throw new Error('No chords match these settings');
  return {
    nextQuestion(weights, rng, previous): Question {
      const choices = previous && pool.length > 1 ? pool.filter((c) => c.key !== previous.itemKey) : pool;
      const c = weightedPick(choices, (x) => 1 + 3 * (weights.get(x.key) ?? 0), rng);
      return {
        itemKey: c.key,
        clef: s.clef,
        display: [],
        reveal: [c.notes],
        keySignature: c.keySignature,
        prompt: s.showKeyName ? c.key : c.numeral,
        answer: { kind: 'chord', pitchClasses: chordPitchClasses(c.notes) },
      };
    },
  };
}
```

In `src/drill/exercises.ts`: import `createHarmony, DEFAULT_HARMONY, type HarmonySettings` from `./harmony`; add `'harmony'` to `ExerciseType`; add `| ({ type: 'harmony' } & HarmonySettings)` to `ExerciseSettings`; `EXERCISE_TYPES` becomes `['note-reading', 'intervals', 'chords', 'scales', 'harmony']`; `EXERCISE_LABELS.harmony = 'Harmony'`; `defaultSettings` case `'harmony': return { type, ...structuredClone(DEFAULT_HARMONY) };`; `createExercise` case `'harmony': return createHarmony(s);`.

`src/ui/options/HarmonyOptions.svelte`:
```svelte
<script lang="ts">
  import { DEFAULT_HARMONY_TONICS, HARMONY_TONICS, harmonyCandidates, type HarmonySettings } from '../../drill/harmony';
  import { romanNumeral, type Mode } from '../../music/harmony';
  import { parseNote, pitchName } from '../../music/note';
  import { toggle } from './choices';

  let { settings = $bindable() }: { settings: HarmonySettings } = $props();

  const DEGREES = [1, 2, 3, 4, 5, 6, 7];
  const poolSize = $derived(harmonyCandidates(settings).length);
  const keyLabel = (t: string) => pitchName(parseNote(`${t}4`));

  function setMode(m: Mode) {
    settings.mode = m;
    settings.tonics = [...DEFAULT_HARMONY_TONICS[m]];
  }
</script>

<section>
  <h2>Key type</h2>
  <div class="seg">
    <button class:selected={settings.mode === 'major'} onclick={() => setMode('major')}>Major keys</button>
    <button class:selected={settings.mode === 'minor'} onclick={() => setMode('minor')}>Minor keys</button>
  </div>
</section>

<section>
  <h2>Keys</h2>
  <div class="seg">
    {#each HARMONY_TONICS[settings.mode] as t}
      <button class:selected={settings.tonics.includes(t)} onclick={() => (settings.tonics = toggle(settings.tonics, t))}>
        {keyLabel(t)} {settings.mode}
      </button>
    {/each}
  </div>
</section>

<section>
  <h2>Chords</h2>
  <div class="seg">
    {#each DEGREES as d}
      <button class:selected={settings.degrees.includes(d)} onclick={() => (settings.degrees = toggle(settings.degrees, d))}>
        {romanNumeral(settings.mode, d)}
      </button>
    {/each}
  </div>
  <span class="muted">{poolSize} chords</span>
</section>

<section>
  <h2>Show</h2>
  <div class="seg">
    <button class:selected={settings.showKeyName} onclick={() => (settings.showKeyName = true)}>Numeral + key name</button>
    <button class:selected={!settings.showKeyName} onclick={() => (settings.showKeyName = false)}>Numeral + key signature only</button>
  </div>
  <div class="seg" style="margin-top: 0.75rem">
    <button class:selected={settings.clef === 'treble'} onclick={() => (settings.clef = 'treble')}>Treble</button>
    <button class:selected={settings.clef === 'bass'} onclick={() => (settings.clef = 'bass')}>Bass</button>
  </div>
</section>
```

In `src/ui/DrillSetup.svelte`: import `HarmonyOptions`, and replace the final `{:else}` + `<ScaleOptions …/>` of the options chain with:
```svelte
  {:else if config.exercise.type === 'scales'}
    <ScaleOptions bind:settings={config.exercise} />
  {:else}
    <HarmonyOptions bind:settings={config.exercise} />
```

- [ ] **Step 4: Verify and commit**
```bash
git add -A
git commit -m "feat: harmony drill (Roman numerals in major and minor keys)" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Keyboard diagram

**Files:**
- Create: `src/ui/keyboardLayout.ts`, `src/ui/keyboardLayout.test.ts`, `src/ui/Keyboard.svelte`

**Interfaces:**
- Produces: `interface KeyRect { midi; x; width; black }`, `WHITE_WIDTH = 24`, `BLACK_WIDTH = 14`, `isBlack(midi)`, `keyboardRange(midis: number[]): { low; high }` (C-to-B octaves covering the keys, min one octave, default C4–B4), `keyboardLayout(low, high): { keys: KeyRect[]; width }` (white keys first, then black, for draw order). Component `Keyboard` props: `highlight?: number[]`, `marks?: Record<number, 'correct' | 'wrong'>`, `labels?: Record<number, string>`, `range?: { low: number; high: number }`.

- [ ] **Step 1: Failing tests** — `src/ui/keyboardLayout.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { BLACK_WIDTH, isBlack, keyboardLayout, keyboardRange, WHITE_WIDTH } from './keyboardLayout';

describe('keyboardRange', () => {
  it('pads to whole C-to-B octaves', () => {
    expect(keyboardRange([60, 64])).toEqual({ low: 60, high: 71 });
    expect(keyboardRange([59, 62])).toEqual({ low: 48, high: 71 });
    expect(keyboardRange([72])).toEqual({ low: 72, high: 83 });
  });
  it('defaults to the middle-C octave', () => {
    expect(keyboardRange([])).toEqual({ low: 60, high: 71 });
  });
});

describe('keyboardLayout', () => {
  it('lays out one octave', () => {
    const { keys, width } = keyboardLayout(60, 71);
    expect(width).toBe(7 * WHITE_WIDTH);
    expect(keys).toHaveLength(12);
    expect(keys.slice(0, 7).every((k) => !k.black)).toBe(true);
    const cSharp = keys.find((k) => k.midi === 61)!;
    expect(cSharp).toMatchObject({ black: true, x: WHITE_WIDTH - BLACK_WIDTH / 2, width: BLACK_WIDTH });
    expect(keys.find((k) => k.midi === 64)!.x).toBe(2 * WHITE_WIDTH);
  });
  it('knows black keys', () => {
    expect([60, 61, 63, 64, 66, 70, 71].map(isBlack)).toEqual([false, true, true, false, true, true, false]);
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement**

`src/ui/keyboardLayout.ts`:
```ts
import { pitchClass } from '../music/note';

export const WHITE_WIDTH = 24;
export const BLACK_WIDTH = 14;
const BLACK_PCS = new Set([1, 3, 6, 8, 10]);

export interface KeyRect {
  midi: number;
  x: number;
  width: number;
  black: boolean;
}

export function isBlack(midi: number): boolean {
  return BLACK_PCS.has(pitchClass(midi));
}

/** Whole octaves (C up to B) covering every key; at least one octave; C4–B4 when empty. */
export function keyboardRange(midis: number[]): { low: number; high: number } {
  if (midis.length === 0) return { low: 60, high: 71 };
  const lo = Math.min(...midis);
  const hi = Math.max(...midis);
  const low = lo - pitchClass(lo);
  const high = Math.max(hi + (11 - pitchClass(hi)), low + 11);
  return { low, high };
}

/** Key rectangles in draw order (white keys first so black keys paint on top). */
export function keyboardLayout(low: number, high: number): { keys: KeyRect[]; width: number } {
  const whites: KeyRect[] = [];
  const blacks: KeyRect[] = [];
  let whiteIndex = 0;
  for (let midi = low; midi <= high; midi++) {
    if (isBlack(midi)) {
      blacks.push({ midi, x: whiteIndex * WHITE_WIDTH - BLACK_WIDTH / 2, width: BLACK_WIDTH, black: true });
    } else {
      whites.push({ midi, x: whiteIndex * WHITE_WIDTH, width: WHITE_WIDTH, black: false });
      whiteIndex++;
    }
  }
  return { keys: [...whites, ...blacks], width: whiteIndex * WHITE_WIDTH };
}
```

`src/ui/Keyboard.svelte`:
```svelte
<script lang="ts">
  import { keyboardLayout, keyboardRange, type KeyRect } from './keyboardLayout';

  let { highlight = [], marks = {}, labels = {}, range }: {
    highlight?: number[];
    marks?: Record<number, 'correct' | 'wrong'>;
    labels?: Record<number, string>;
    range?: { low: number; high: number };
  } = $props();

  const WHITE_HEIGHT = 100;
  const BLACK_HEIGHT = 62;

  const r = $derived(range ?? keyboardRange([...highlight, ...Object.keys(marks).map(Number)]));
  const layout = $derived(keyboardLayout(r.low, r.high));

  function fill(k: KeyRect): string {
    const mark = marks[k.midi];
    if (mark === 'correct') return 'var(--correct)';
    if (mark === 'wrong') return 'var(--wrong)';
    if (highlight.includes(k.midi)) return 'var(--accent)';
    return k.black ? '#1f2a44' : '#ffffff';
  }

  function colored(k: KeyRect): boolean {
    return k.black || marks[k.midi] !== undefined || highlight.includes(k.midi);
  }
</script>

<svg class="keyboard" viewBox="-1 -1 {layout.width + 2} {WHITE_HEIGHT + 2}" role="img" aria-label="Piano keyboard">
  {#each layout.keys as k (k.midi)}
    <rect x={k.x} y="0" width={k.width} height={k.black ? BLACK_HEIGHT : WHITE_HEIGHT} rx="2" fill={fill(k)} stroke="#1f2a44" stroke-width="1" />
    {#if labels[k.midi]}
      <text
        x={k.x + k.width / 2}
        y={k.black ? BLACK_HEIGHT - 6 : WHITE_HEIGHT - 8}
        text-anchor="middle"
        font-size={k.black ? 7 : 10}
        fill={colored(k) ? '#ffffff' : '#1f2a44'}
      >{labels[k.midi]}</text>
    {/if}
  {/each}
</svg>

<style>
  .keyboard { display: block; width: 100%; max-width: 520px; height: auto; margin: 0.5rem auto; }
</style>
```

- [ ] **Step 4: Verify and commit**
```bash
git add -A
git commit -m "feat: on-screen keyboard diagram" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Learning core — types, helpers, progress store, try-it session

**Files:**
- Create: `src/learn/types.ts`, `src/learn/progress.ts`, `src/learn/path.ts`, `src/learn/path.test.ts`, `src/learn/richText.ts`, `src/learn/richText.test.ts`, `src/learn/build.ts`, `src/learn/build.test.ts`, `src/learn/tryItSession.ts`, `src/learn/tryItSession.test.ts`, `src/progress/lessonProgress.test.ts`
- Modify: `src/progress/db.ts`, `src/drill/answer.ts`, `src/drill/session.ts`

**Interfaces:**
- Produces:
  - types.ts: `KeyHighlight { midis: number[]; labels?: Record<number, string> }`, `Card { text; staff?; keys? }`, `TryStep { prompt; answer: Answer; staff?; keys?; hint }`, `Lesson { id; title; cards; tryIt; drill: ExerciseSettings }`, `Unit { id; title; lessons }`
  - progress.ts: `CHECKPOINT_LENGTH = 10`, `PASS_SCORE = 8`, `isPassing(correct): boolean`
  - path.ts: `allLessons(units)`, `findLesson(units, id): { lesson; unit } | null`, `nextLesson(units, passed: ReadonlySet<string>): Lesson | null`, `lessonAfter(units, id): Lesson | null`, `checkpointConfig(lesson): DrillConfig`
  - richText.ts: `interface Segment { text; bold }`, `parseRichText(text): Segment[][]` (paragraphs split on blank lines; `**bold**`)
  - build.ts: `seq(clef, ...names)`, `chords(clef, ...groups)`, `scaleStaff(clef, tonic, type, { direction?, keySignature? })`, `keySignatureStaff(clef, tonic, type)`, `diatonicStaff(clef, tonic, mode, degrees)`, `playNotes(...names)`, `playScale(tonic, type, { direction?, anyOctave? })`, `playChord(...names)`, `playDiatonic(tonic, mode, degree)`, `keys(...names)`, `drill.{noteReading,intervals,chords,scales,harmony}(overrides)`
  - db.ts: `LessonProgress { lessonId; bestScore; attempts; passedAt: number | null }`, `getAllLessonProgress(): Promise<LessonProgress[]>`, `recordLessonAttempt(lessonId, score, passed, now = Date.now()): Promise<LessonProgress>`; DB version 2 adds object store `lessonProgress` (keyPath `lessonId`).
  - answer.ts: `hasSound(chroma): boolean` (moved from session.ts, now exported)
  - tryItSession.ts: `class TryItSession { steps; index; matched; missed; state: 'asking'|'correct'|'done'; current; hear(h): HearResult; next() }`

- [ ] **Step 1: Failing tests**

`src/learn/richText.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseRichText } from './richText';

describe('parseRichText', () => {
  it('splits paragraphs on blank lines and marks bold', () => {
    expect(parseRichText('A **bold** word.\n\nSecond para.')).toEqual([
      [{ text: 'A ', bold: false }, { text: 'bold', bold: true }, { text: ' word.', bold: false }],
      [{ text: 'Second para.', bold: false }],
    ]);
  });
  it('treats stray asterisks as text', () => {
    expect(parseRichText('5 * 3')).toEqual([[{ text: '5 * 3', bold: false }]]);
  });
});
```

`src/learn/path.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { drill } from './build';
import { checkpointConfig, findLesson, lessonAfter, nextLesson, allLessons } from './path';
import type { Lesson, Unit } from './types';

const lesson = (id: string): Lesson => ({ id, title: id, cards: [{ text: id }], tryIt: [], drill: drill.noteReading() });
const units: Unit[] = [
  { id: 'u1', title: 'One', lessons: [lesson('a'), lesson('b')] },
  { id: 'u2', title: 'Two', lessons: [lesson('c')] },
];

describe('path helpers', () => {
  it('flattens lessons in order', () => {
    expect(allLessons(units).map((l) => l.id)).toEqual(['a', 'b', 'c']);
  });
  it('finds a lesson with its unit', () => {
    expect(findLesson(units, 'c')?.unit.id).toBe('u2');
    expect(findLesson(units, 'zzz')).toBeNull();
  });
  it('picks the first unpassed lesson', () => {
    expect(nextLesson(units, new Set())?.id).toBe('a');
    expect(nextLesson(units, new Set(['a']))?.id).toBe('b');
    expect(nextLesson(units, new Set(['a', 'b', 'c']))).toBeNull();
  });
  it('finds the following lesson across units', () => {
    expect(lessonAfter(units, 'b')?.id).toBe('c');
    expect(lessonAfter(units, 'c')).toBeNull();
  });
  it('builds a 10-question move-on checkpoint', () => {
    const c = checkpointConfig(lesson('a'));
    expect(c.session).toEqual({ length: 10, missMode: 'move-on', weighting: true });
    expect(c.exercise.type).toBe('note-reading');
  });
});
```

`src/learn/build.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { chords, diatonicStaff, keys, keySignatureStaff, playChord, playDiatonic, playNotes, playScale, scaleStaff, seq } from './build';

describe('lesson builders', () => {
  it('builds staff views', () => {
    expect(seq('treble', 'C4', 'E4').items).toHaveLength(2);
    expect(chords('treble', ['C4', 'E4', 'G4']).items[0].notes).toHaveLength(3);
    expect(scaleStaff('treble', 'D4', 'major', { keySignature: true }).keySignature?.vexKey).toBe('D');
    expect(scaleStaff('treble', 'D4', 'major').keySignature).toBeUndefined();
    expect(keySignatureStaff('treble', 'Eb4', 'major').items).toEqual([]);
    expect(diatonicStaff('treble', 'C4', 'major', [1, 4, 5]).items.map((i) => i.notes.length)).toEqual([3, 3, 3]);
  });
  it('builds answers', () => {
    expect(playNotes('C4', 'E4')).toEqual({ kind: 'notes', midis: [60, 64], anyOctave: false });
    expect(playScale('G4', 'major')).toEqual({ kind: 'notes', midis: [67, 69, 71, 72, 74, 76, 78, 79], anyOctave: false });
    expect(playChord('E4', 'G4', 'C5')).toEqual({ kind: 'chord', pitchClasses: [0, 4, 7] });
    expect(playDiatonic('A4', 'minor', 5)).toEqual({ kind: 'chord', pitchClasses: [4, 8, 11] });
  });
  it('labels keys with the spelling given', () => {
    expect(keys('Bb4', 'D5')).toEqual({ midis: [70, 74], labels: { 70: 'B♭', 74: 'D' } });
  });
});
```

`src/learn/tryItSession.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { playChord, playNotes } from './build';
import { TryItSession } from './tryItSession';
import type { Heard } from '../drill/types';
import type { TryStep } from './types';

const note = (midi: number): Heard => ({ kind: 'note', midi, time: 0 });
const chord = (...pcs: number[]): Heard => ({ kind: 'chord', chroma: Array.from({ length: 12 }, (_, pc) => (pcs.includes(pc) ? 1 : 0)), time: 0 });
const step = (answer: TryStep['answer']): TryStep => ({ prompt: 'p', answer, hint: 'h' });

describe('TryItSession', () => {
  it('walks through note steps with progress and retries', () => {
    const s = new TryItSession([step(playNotes('C4', 'E4')), step(playChord('C4', 'E4', 'G4'))]);
    expect(s.hear(note(60))).toBe('progress');
    expect(s.matched).toBe(1);
    expect(s.hear(note(65))).toBe('wrong');
    expect(s.missed).toBe(true);
    expect(s.hear(note(64))).toBe('correct');
    expect(s.state).toBe('correct');
    expect(s.hear(note(64))).toBe('ignored');
    s.next();
    expect(s.index).toBe(1);
    expect(s.missed).toBe(false);
    expect(s.hear(note(60))).toBe('ignored');
    expect(s.hear(chord(0, 4, 7))).toBe('correct');
    s.next();
    expect(s.state).toBe('done');
    expect(s.current).toBeNull();
  });
  it('ignores silent chord frames', () => {
    const s = new TryItSession([step(playChord('C4', 'E4', 'G4'))]);
    expect(s.hear(chord())).toBe('ignored');
  });
  it('is done immediately with no steps', () => {
    expect(new TryItSession([]).state).toBe('done');
  });
});
```

`src/progress/lessonProgress.test.ts`:
```ts
import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import { getAllLessonProgress, getSetting, recordLessonAttempt } from './db';

describe('lesson progress store', () => {
  it('upgrades a version-1 database without losing settings', async () => {
    const v1 = await openDB('piano-trainer', 1, { upgrade: (d) => void d.createObjectStore('kv') });
    await v1.put('kv', 5, 'tuningOffsetCents');
    v1.close();
    expect(await getSetting('tuningOffsetCents', 0)).toBe(5);
    expect(await getAllLessonProgress()).toEqual([]);
  });

  it('keeps the best score and first pass time', async () => {
    expect(await recordLessonAttempt('grand-staff', 6, false, 1000)).toEqual({ lessonId: 'grand-staff', bestScore: 6, attempts: 1, passedAt: null });
    expect(await recordLessonAttempt('grand-staff', 9, true, 2000)).toEqual({ lessonId: 'grand-staff', bestScore: 9, attempts: 2, passedAt: 2000 });
    expect(await recordLessonAttempt('grand-staff', 5, false, 3000)).toEqual({ lessonId: 'grand-staff', bestScore: 9, attempts: 3, passedAt: 2000 });
    expect(await getAllLessonProgress()).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/learn src/progress` → FAIL.

- [ ] **Step 3: Implement**

`src/learn/types.ts`:
```ts
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
```

`src/learn/progress.ts`:
```ts
export const CHECKPOINT_LENGTH = 10;
export const PASS_SCORE = 8;

export function isPassing(correct: number): boolean {
  return correct >= PASS_SCORE;
}
```

`src/learn/path.ts`:
```ts
import type { DrillConfig } from '../drill/config';
import { CHECKPOINT_LENGTH } from './progress';
import type { Lesson, Unit } from './types';

export function allLessons(units: Unit[]): Lesson[] {
  return units.flatMap((u) => u.lessons);
}

export function findLesson(units: Unit[], id: string): { lesson: Lesson; unit: Unit } | null {
  for (const unit of units) {
    const lesson = unit.lessons.find((l) => l.id === id);
    if (lesson) return { lesson, unit };
  }
  return null;
}

export function nextLesson(units: Unit[], passed: ReadonlySet<string>): Lesson | null {
  return allLessons(units).find((l) => !passed.has(l.id)) ?? null;
}

export function lessonAfter(units: Unit[], id: string): Lesson | null {
  const lessons = allLessons(units);
  const i = lessons.findIndex((l) => l.id === id);
  return i >= 0 && i + 1 < lessons.length ? lessons[i + 1] : null;
}

export function checkpointConfig(lesson: Lesson): DrillConfig {
  return {
    exercise: structuredClone(lesson.drill),
    session: { length: CHECKPOINT_LENGTH, missMode: 'move-on', weighting: true },
  };
}
```

`src/learn/richText.ts`:
```ts
export interface Segment {
  text: string;
  bold: boolean;
}

/** Paragraphs split on blank lines; `**bold**` spans. Plain text only — never HTML. */
export function parseRichText(text: string): Segment[][] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) =>
      p
        .split(/(\*\*[^*]+\*\*)/)
        .filter((s) => s.length > 0)
        .map((s) => (/^\*\*[^*]+\*\*$/.test(s) ? { text: s.slice(2, -2), bold: true } : { text: s, bold: false })),
    );
}
```

`src/learn/build.ts`:
```ts
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
```

`src/learn/tryItSession.ts`:
```ts
import { hasSound, matchChord, matchNote } from '../drill/answer';
import type { Heard, HearResult } from '../drill/types';
import type { TryStep } from './types';

export type TryState = 'asking' | 'correct' | 'done';

/** Guided practice: unlimited retries, no scoring. */
export class TryItSession {
  readonly steps: TryStep[];
  index = 0;
  /** Notes of the current answer already played. */
  matched = 0;
  /** True after a miss on the current step (the UI shows the hint). */
  missed = false;
  state: TryState;

  constructor(steps: TryStep[]) {
    this.steps = steps;
    this.state = steps.length > 0 ? 'asking' : 'done';
  }

  get current(): TryStep | null {
    return this.steps[this.index] ?? null;
  }

  hear(h: Heard): HearResult {
    const step = this.current;
    if (this.state !== 'asking' || !step) return 'ignored';
    const answer = step.answer;
    let result: HearResult;
    if (h.kind === 'note') {
      if (answer.kind !== 'notes') return 'ignored';
      result = matchNote(answer, this.matched, h.midi);
    } else {
      if (answer.kind !== 'chord' || !hasSound(h.chroma)) return 'ignored';
      result = matchChord(answer.pitchClasses, h.chroma) ? 'correct' : 'wrong';
    }
    if (result === 'progress') this.matched++;
    else if (result === 'correct') this.state = 'correct';
    else if (result === 'wrong') this.missed = true;
    return result;
  }

  /** Go to the next step — after a correct answer, or to skip. */
  next(): void {
    this.index++;
    this.matched = 0;
    this.missed = false;
    this.state = this.index < this.steps.length ? 'asking' : 'done';
  }
}
```

In `src/drill/answer.ts`, add an exported `hasSound(chroma: ArrayLike<number>): boolean` with exactly the body of the private `hasSound` currently in `src/drill/session.ts`; delete it from session.ts and import it from `./answer` there. (If `matchNote`'s return type does not include `'ignored'`, keep `TryItSession` compiling by typing `result` as `HearResult`.)

In `src/progress/db.ts`:
1. `const DB_VERSION = 2;` and the upgrade callback becomes:
```ts
    upgrade(d, oldVersion) {
      if (oldVersion < 1) d.createObjectStore('kv');
      if (oldVersion < 2) d.createObjectStore('lessonProgress', { keyPath: 'lessonId' });
    },
```
2. Append:
```ts
export interface LessonProgress {
  lessonId: string;
  bestScore: number;
  attempts: number;
  /** When the lesson was first passed (ms since epoch), or null. */
  passedAt: number | null;
}

export async function getAllLessonProgress(): Promise<LessonProgress[]> {
  try {
    return (await (await db()).getAll('lessonProgress')) as LessonProgress[];
  } catch {
    return [];
  }
}

export async function recordLessonAttempt(
  lessonId: string,
  score: number,
  passed: boolean,
  now: number = Date.now(),
): Promise<LessonProgress> {
  const d = await db();
  const prev = (await d.get('lessonProgress', lessonId)) as LessonProgress | undefined;
  const next: LessonProgress = {
    lessonId,
    bestScore: Math.max(prev?.bestScore ?? 0, score),
    attempts: (prev?.attempts ?? 0) + 1,
    passedAt: prev?.passedAt ?? (passed ? now : null),
  };
  await d.put('lessonProgress', next);
  return next;
}
```

- [ ] **Step 4: Verify and commit**
```bash
git add -A
git commit -m "feat: learning core (lesson types, builders, progress store, try-it session)" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Content — units 1–4, curriculum, content guards

**Files:**
- Create: `src/learn/content/unit1Reading.ts`, `src/learn/content/unit2Intervals.ts`, `src/learn/content/unit3MajorScales.ts`, `src/learn/content/unit4MinorScales.ts`, `src/learn/curriculum.ts`, `src/learn/content.test.ts`

**Interfaces:**
- Consumes: Task 4 builders/types. Produces: `UNITS: Unit[]` (units 1–4 now; Task 6 appends 5–7).

- [ ] **Step 1: Content guard tests** — `src/learn/content.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { createExercise } from '../drill/exercises';
import { seededRng } from '../drill/random';
import { pitchClass, toMidi } from '../music/note';
import { UNITS } from './curriculum';
import { allLessons } from './path';

const lessons = allLessons(UNITS);
const uniq = (xs: number[]) => [...new Set(xs)].sort((a, b) => a - b);

describe('curriculum content', () => {
  it('has unique kebab-case lesson ids', () => {
    const ids = lessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  for (const lesson of lessons) {
    describe(lesson.id, () => {
      it('has cards, 2–4 try-it steps and a working checkpoint drill', () => {
        expect(lesson.cards.length).toBeGreaterThan(0);
        expect(lesson.tryIt.length).toBeGreaterThanOrEqual(2);
        expect(lesson.tryIt.length).toBeLessThanOrEqual(4);
        const q = createExercise(lesson.drill).nextQuestion(new Map(), seededRng(1), null);
        expect(q.reveal.length).toBeGreaterThan(0);
      });

      lesson.tryIt.forEach((step, i) => {
        it(`try-it step ${i + 1} is consistent with its staff and keys`, () => {
          const staff = step.staff?.items.flatMap((item) => item.notes.map(toMidi)) ?? [];
          const answer = step.answer;
          if (answer.kind === 'notes') {
            const norm = (m: number) => (answer.anyOctave ? pitchClass(m) : m);
            expect(staff.map(norm)).toEqual(answer.midis.slice(0, staff.length).map(norm));
            if (step.keys) expect(uniq(step.keys.midis.map(norm))).toEqual(uniq(answer.midis.map(norm)));
          } else {
            for (const m of staff) expect(answer.pitchClasses).toContain(pitchClass(m));
            if (step.keys) expect(uniq(step.keys.midis.map(pitchClass))).toEqual(answer.pitchClasses);
          }
        });
      });
    });
  }
});
```

- [ ] **Step 2: Run** → FAIL (`./curriculum` missing).

- [ ] **Step 3: Content**

`src/learn/content/unit1Reading.ts`:
```ts
import { drill, keys, playNotes, seq } from '../build';
import type { Lesson } from '../types';

export const unit1: Lesson[] = [
  {
    id: 'grand-staff',
    title: 'The grand staff & middle C',
    cards: [
      {
        text: 'The **grand staff** joins two staves with a brace: the **treble** staff for higher notes (usually the right hand) and the **bass** staff for lower notes (usually the left hand).\n\n**Middle C** (C4) sits on its own short line exactly between them — just below the treble staff and just above the bass staff.',
        staff: seq('grand', 'C4'),
        keys: keys('C4'),
      },
      {
        text: 'Treble clef lines, bottom to top: **E G B D F**. Spaces: **F A C E**.\n\nThe treble clef curls around the G line (G4), which is why it is also called the **G clef**.',
        staff: seq('treble', 'E4', 'G4', 'B4', 'D5', 'F5'),
        keys: keys('E4', 'G4', 'B4', 'D5', 'F5'),
      },
      {
        text: 'Bass clef lines, bottom to top: **G B D F A**. Spaces: **A C E G**.\n\nThe two dots of the bass clef sit either side of the F line (F3), which is why it is also called the **F clef**.',
        staff: seq('bass', 'G2', 'B2', 'D3', 'F3', 'A3'),
        keys: keys('G2', 'B2', 'D3', 'F3', 'A3'),
      },
    ],
    tryIt: [
      { prompt: 'Play middle C.', answer: playNotes('C4'), staff: seq('grand', 'C4'), keys: keys('C4'), hint: 'Middle C is the C nearest the middle of the keyboard, usually right below the piano’s name.' },
      { prompt: 'Play the G that the treble clef curls around.', answer: playNotes('G4'), staff: seq('treble', 'G4'), keys: keys('G4'), hint: 'Second line from the bottom of the treble staff: the G just above middle C.' },
      { prompt: 'Play the F between the bass clef’s dots.', answer: playNotes('F3'), staff: seq('bass', 'F3'), keys: keys('F3'), hint: 'Fourth line from the bottom of the bass staff: the F just below middle C.' },
    ],
    drill: drill.noteReading({ clef: 'grand', low: 'C3', high: 'C5' }),
  },
  {
    id: 'ledger-above',
    title: 'Ledger lines above',
    cards: [
      {
        text: 'Notes above the staff get short **ledger lines** — little extensions of the staff.\n\nCount up from the top line (F5): the space above it is G5, the first ledger line is **A5**, then B5, then **C6** on the second ledger line.',
        staff: seq('treble', 'F5', 'G5', 'A5', 'B5', 'C6'),
        keys: keys('F5', 'G5', 'A5', 'B5', 'C6'),
      },
      {
        text: 'A shortcut: the ledger lines above the treble staff go up in 3rds — **A5, C6, E6, G6**. Learn those four landmarks and read the notes in between from them.',
        staff: seq('treble', 'A5', 'C6', 'E6', 'G6'),
      },
    ],
    tryIt: [
      { prompt: 'Play A5, on the first ledger line above the staff.', answer: playNotes('A5'), staff: seq('treble', 'A5'), keys: keys('A5'), hint: 'Count up from the top line F5: G5 is the space, A5 the first ledger line.' },
      { prompt: 'Play C6, on the second ledger line.', answer: playNotes('C6'), staff: seq('treble', 'C6'), keys: keys('C6'), hint: 'C6 is two octaves above middle C.' },
      { prompt: 'Play this note.', answer: playNotes('E6'), staff: seq('treble', 'E6'), keys: keys('E6'), hint: 'Three ledger lines: A5, C6, E6.' },
    ],
    drill: drill.noteReading({ clef: 'treble', low: 'A5', high: 'C7' }),
  },
  {
    id: 'ledger-below',
    title: 'Ledger lines below',
    cards: [
      {
        text: 'Below the bass staff, ledger lines work the same way going down. Under the bottom line (G2) the space is F2, the first ledger line is **E2**, then D2, then **C2** on the second ledger line.',
        staff: seq('bass', 'G2', 'F2', 'E2', 'D2', 'C2'),
        keys: keys('G2', 'F2', 'E2', 'D2', 'C2'),
      },
      {
        text: 'The landmarks below the bass staff go down in 3rds: **E2, C2**. C2 is exactly two octaves below middle C.',
        staff: seq('bass', 'E2', 'C2'),
      },
    ],
    tryIt: [
      { prompt: 'Play E2, on the first ledger line below the staff.', answer: playNotes('E2'), staff: seq('bass', 'E2'), keys: keys('E2'), hint: 'Count down from the bottom line G2: F2 is the space, E2 the first ledger line.' },
      { prompt: 'Play C2, on the second ledger line.', answer: playNotes('C2'), staff: seq('bass', 'C2'), keys: keys('C2'), hint: 'C2 is two octaves below middle C.' },
      { prompt: 'Play this note.', answer: playNotes('D2'), staff: seq('bass', 'D2'), keys: keys('D2'), hint: 'It sits in the space between the two ledger lines, between E2 and C2.' },
    ],
    drill: drill.noteReading({ clef: 'bass', low: 'C2', high: 'E2' }),
  },
  {
    id: 'accidentals',
    title: 'Accidentals & enharmonics',
    cards: [
      {
        text: 'A **sharp** (♯) raises a note a half step, a **flat** (♭) lowers it a half step, and a **natural** (♮) cancels either.\n\nAn accidental lasts until the end of the bar, but only for that line or space.',
        staff: seq('treble', 'F4', 'F#4', 'F4'),
        keys: keys('F4', 'F#4'),
      },
      {
        text: 'One key can have two names — **enharmonics**. C♯ and D♭ are the same black key; so are F♯/G♭, G♯/A♭ and A♯/B♭.\n\nWhite keys have them too: **E♯ = F**, **B♯ = C**, **F♭ = E**, **C♭ = B**.',
        staff: seq('treble', 'C#4', 'Db4'),
        keys: keys('C#4'),
      },
      {
        text: 'Which name you see depends on the key and the direction of the music: sharps are common going up, flats going down.',
        staff: seq('treble', 'C4', 'C#4', 'D4', 'Db4', 'C4'),
      },
    ],
    tryIt: [
      { prompt: 'Play F♯4.', answer: playNotes('F#4'), staff: seq('treble', 'F#4'), keys: keys('F#4'), hint: 'F♯ is the black key just to the right of F.' },
      { prompt: 'Play D♭4.', answer: playNotes('Db4'), staff: seq('treble', 'Db4'), keys: keys('Db4'), hint: 'D♭ is the black key just left of D — the same key as C♯.' },
      { prompt: 'Play E♯4.', answer: playNotes('E#4'), staff: seq('treble', 'E#4'), keys: keys('E#4'), hint: 'There is no black key between E and F, so E♯ is the F key.' },
    ],
    drill: drill.noteReading({ clef: 'treble', low: 'C4', high: 'G5', accidentals: true }),
  },
];
```

`src/learn/content/unit2Intervals.ts`:
```ts
import { chords, drill, keys, playChord, playNotes, seq } from '../build';
import type { Lesson } from '../types';

export const unit2: Lesson[] = [
  {
    id: 'half-whole-steps',
    title: 'Half steps & whole steps',
    cards: [
      {
        text: 'A **half step** is the distance from one key to the very next key, black or white. E–F and B–C are half steps with no black key between them.',
        staff: seq('treble', 'E4', 'F4'),
        keys: keys('E4', 'F4'),
      },
      {
        text: 'A **whole step** is two half steps: skip exactly one key. C–D, E–F♯ and B♭–C are all whole steps.',
        staff: seq('treble', 'C4', 'D4'),
        keys: keys('C4', 'D4'),
      },
      {
        text: 'In interval names a half step is a **minor 2nd (m2)** and a whole step is a **major 2nd (M2)**.',
      },
    ],
    tryIt: [
      { prompt: 'Play E4, then the note a half step up.', answer: playNotes('E4', 'F4'), staff: seq('treble', 'E4'), keys: keys('E4', 'F4'), hint: 'There is no black key between E and F, so a half step up from E is F.' },
      { prompt: 'Play A4, then the note a whole step up.', answer: playNotes('A4', 'B4'), staff: seq('treble', 'A4'), keys: keys('A4', 'B4'), hint: 'Skip exactly one key: A → (A♯) → B.' },
      { prompt: 'Play B4, then the note a whole step up.', answer: playNotes('B4', 'C#5'), staff: seq('treble', 'B4'), keys: keys('B4', 'C#5'), hint: 'B to C is only a half step, so a whole step up from B is C♯.' },
    ],
    drill: drill.intervals({ intervals: ['m2', 'M2'] }),
  },
  {
    id: 'interval-numbers',
    title: 'Interval numbers',
    cards: [
      {
        text: 'An interval’s **number** counts letter names, including both ends. C up to E is C-D-E, a **3rd**. C up to G is C-D-E-F-G, a **5th**.',
        staff: chords('treble', ['C4', 'E4'], ['C4', 'G4']),
      },
      {
        text: 'On the staff you can see it: **odd** numbers (3rd, 5th, 7th) go line to line or space to space; **even** numbers (2nd, 4th, 6th, octave) go line to space.',
        staff: chords('treble', ['E4', 'G4'], ['E4', 'A4']),
      },
      {
        text: 'Sharps and flats don’t change the number: C to E♭ and C to E are both 3rds, because the letters are the same.',
        staff: chords('treble', ['C4', 'Eb4'], ['C4', 'E4']),
      },
    ],
    tryIt: [
      { prompt: 'Play this 5th, one note after the other.', answer: playNotes('C4', 'G4'), staff: seq('treble', 'C4', 'G4'), hint: 'Five letter names from C: C D E F G.' },
      { prompt: 'Play this 3rd, one note after the other.', answer: playNotes('D4', 'F4'), staff: seq('treble', 'D4', 'F4'), hint: 'D-E-F is three letter names.' },
      { prompt: 'Play this 6th, one note after the other.', answer: playNotes('E4', 'C5'), staff: seq('treble', 'E4', 'C5'), hint: 'E F G A B C — six letter names.' },
    ],
    drill: drill.intervals({ intervals: ['m2', 'M2', 'm3', 'M3', 'P4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'], showTarget: true }),
  },
  {
    id: 'interval-quality',
    title: 'Major, minor & perfect',
    cards: [
      {
        text: 'An interval’s **quality** gives its exact size in half steps. 2nds, 3rds, 6ths and 7ths come in **major** and **minor**, and minor is one half step smaller.\n\nMinor 3rd = **3** half steps. Major 3rd = **4**.',
        staff: chords('treble', ['C4', 'Eb4'], ['C4', 'E4']),
        keys: keys('C4', 'Eb4', 'E4'),
      },
      {
        text: '4ths, 5ths and octaves are **perfect**: perfect 4th = **5** half steps, perfect 5th = **7**, octave = **12**.',
        staff: chords('treble', ['C4', 'F4'], ['C4', 'G4'], ['C4', 'C5']),
      },
      {
        text: 'A quick check: in a **major scale**, every interval from the tonic up is major or perfect — C–D M2, C–E M3, C–F P4, C–G P5, C–A M6, C–B M7.',
        staff: chords('treble', ['C4', 'E4'], ['C4', 'A4'], ['C4', 'B4']),
      },
    ],
    tryIt: [
      { prompt: 'Play C4, then a major 3rd up.', answer: playNotes('C4', 'E4'), staff: seq('treble', 'C4'), keys: keys('C4', 'E4'), hint: 'Count 4 half steps: C → C♯ → D → D♯ → E.' },
      { prompt: 'Play A4, then a minor 3rd up.', answer: playNotes('A4', 'C5'), staff: seq('treble', 'A4'), keys: keys('A4', 'C5'), hint: '3 half steps: A → A♯ → B → C.' },
      { prompt: 'Play D4, then a perfect 5th up.', answer: playNotes('D4', 'A4'), staff: seq('treble', 'D4'), keys: keys('D4', 'A4'), hint: '7 half steps — or the 5th note of D major: D E F♯ G A.' },
    ],
    drill: drill.intervals({ intervals: ['m3', 'M3', 'P4', 'P5'] }),
  },
  {
    id: 'sixths-sevenths-tritone',
    title: '6ths, 7ths & the tritone',
    cards: [
      {
        text: 'Big intervals are easiest measured from the octave down. A **major 7th** is a half step short of an octave (11 half steps); a **minor 7th** is a whole step short (10).',
        staff: chords('treble', ['C4', 'B4'], ['C4', 'Bb4']),
        keys: keys('C4', 'Bb4', 'B4'),
      },
      {
        text: 'A **major 6th** is 9 half steps (C–A); a **minor 6th** is 8 (C–A♭).',
        staff: chords('treble', ['C4', 'A4'], ['C4', 'Ab4']),
      },
      {
        text: 'The **tritone** is exactly half an octave: 6 half steps, or three whole steps — F–B, or C–F♯.',
        staff: chords('treble', ['F4', 'B4']),
        keys: keys('F4', 'B4'),
      },
    ],
    tryIt: [
      { prompt: 'Play C4, then a major 7th up.', answer: playNotes('C4', 'B4'), staff: seq('treble', 'C4'), keys: keys('C4', 'B4'), hint: 'One half step below the next C.' },
      { prompt: 'Play D4, then a minor 7th up.', answer: playNotes('D4', 'C5'), staff: seq('treble', 'D4'), keys: keys('D4', 'C5'), hint: 'A whole step below the octave D5.' },
      { prompt: 'Play F4, then a tritone up.', answer: playNotes('F4', 'B4'), staff: seq('treble', 'F4'), keys: keys('F4', 'B4'), hint: 'Three whole steps: F → G → A → B.' },
    ],
    drill: drill.intervals({ intervals: ['m6', 'M6', 'm7', 'M7', 'TT'] }),
  },
  {
    id: 'harmonic-intervals',
    title: 'Hearing both notes together',
    cards: [
      {
        text: 'A **harmonic** interval is two notes played together; a **melodic** interval is one after the other. On the staff, harmonic intervals are stacked.',
        staff: chords('treble', ['C4', 'E4'], ['C4'], ['E4']),
      },
      {
        text: 'Press both keys at the same instant and hold them. The app listens for both note names — any octave counts.',
        staff: chords('treble', ['C4', 'G4']),
        keys: keys('C4', 'G4'),
      },
    ],
    tryIt: [
      { prompt: 'Play C4 and E4 together.', answer: playChord('C4', 'E4'), staff: chords('treble', ['C4', 'E4']), keys: keys('C4', 'E4'), hint: 'Press both keys at exactly the same time and hold them.' },
      { prompt: 'Play a perfect 5th together, starting on D4.', answer: playChord('D4', 'A4'), staff: seq('treble', 'D4'), keys: keys('D4', 'A4'), hint: 'D and A — hold both.' },
      { prompt: 'Play a minor 3rd together, starting on A4.', answer: playChord('A4', 'C5'), staff: seq('treble', 'A4'), keys: keys('A4', 'C5'), hint: 'A and C.' },
    ],
    drill: drill.intervals({ intervals: ['m3', 'M3', 'P5'], harmonic: true }),
  },
];
```

`src/learn/content/unit3MajorScales.ts`:
```ts
import { drill, keys, keySignatureStaff, playScale, scaleStaff, seq } from '../build';
import type { Lesson } from '../types';

export const unit3: Lesson[] = [
  {
    id: 'major-scale-pattern',
    title: 'The major scale pattern',
    cards: [
      {
        text: 'Every major scale uses the same pattern of steps: **W W H W W W H** (W = whole step, H = half step).',
        staff: scaleStaff('treble', 'C4', 'major'),
        keys: keys('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'),
      },
      {
        text: 'C major uses only white keys because its two half steps fall exactly on **E–F** and **B–C**, where there are no black keys.',
        keys: keys('E4', 'F4', 'B4', 'C5'),
      },
      {
        text: 'Start anywhere else and the pattern forces sharps or flats. G major needs **F♯** to keep the half step at the top: F♯–G.',
        staff: scaleStaff('treble', 'G4', 'major'),
      },
    ],
    tryIt: [
      { prompt: 'Play the C major scale, up one octave.', answer: playScale('C4', 'major'), staff: scaleStaff('treble', 'C4', 'major'), hint: 'White keys only, C to C.' },
      { prompt: 'Play G major, up one octave.', answer: playScale('G4', 'major'), staff: scaleStaff('treble', 'G4', 'major'), hint: 'All white keys except F♯.' },
      { prompt: 'Play F major, up one octave.', answer: playScale('F4', 'major'), staff: scaleStaff('treble', 'F4', 'major'), hint: 'All white keys except B♭.' },
    ],
    drill: drill.scales({ tonics: ['C', 'G', 'F'] }),
  },
  {
    id: 'sharp-keys',
    title: 'Key signatures: sharps',
    cards: [
      {
        text: 'A **key signature** lists the sharps or flats once, at the start of each line, instead of writing them on every note.',
        staff: scaleStaff('treble', 'G4', 'major', { keySignature: true }),
      },
      {
        text: 'Sharps always appear in the same order: **F C G D A E B** — "Father Charles Goes Down And Ends Battle".',
        staff: keySignatureStaff('treble', 'C#4', 'major'),
      },
      {
        text: 'To name a sharp key, take the **last sharp** and go up a half step. Last sharp C♯ → the key of **D major**.',
        staff: keySignatureStaff('treble', 'D4', 'major'),
        keys: keys('C#5', 'D5'),
      },
    ],
    tryIt: [
      { prompt: 'Play the D major scale (two sharps).', answer: playScale('D4', 'major'), staff: scaleStaff('treble', 'D4', 'major', { keySignature: true }), hint: 'F♯ and C♯.' },
      { prompt: 'Play A major (three sharps).', answer: playScale('A4', 'major'), staff: scaleStaff('treble', 'A4', 'major', { keySignature: true }), hint: 'F♯, C♯ and G♯.' },
      { prompt: 'Play E major (four sharps).', answer: playScale('E4', 'major'), staff: scaleStaff('treble', 'E4', 'major', { keySignature: true }), hint: 'F♯, C♯, G♯ and D♯.' },
    ],
    drill: drill.scales({ tonics: ['G', 'D', 'A', 'E'] }),
  },
  {
    id: 'flat-keys',
    title: 'Key signatures: flats',
    cards: [
      {
        text: 'Flats appear in the reverse order: **B E A D G C F** — "Battle Ends And Down Goes Charles’ Father".',
        staff: keySignatureStaff('treble', 'Cb4', 'major'),
      },
      {
        text: 'To name a flat key, the **second-to-last flat** is the key: B♭ E♭ A♭ → **E♭ major**. The one exception is a single flat (just B♭), which is **F major**.',
        staff: keySignatureStaff('treble', 'Eb4', 'major'),
      },
    ],
    tryIt: [
      { prompt: 'Play F major (one flat).', answer: playScale('F4', 'major'), staff: scaleStaff('treble', 'F4', 'major', { keySignature: true }), hint: 'Just B♭.' },
      { prompt: 'Play B♭ major (two flats).', answer: playScale('Bb3', 'major'), staff: scaleStaff('treble', 'Bb3', 'major', { keySignature: true }), hint: 'B♭ and E♭.' },
      { prompt: 'Play E♭ major (three flats).', answer: playScale('Eb4', 'major'), staff: scaleStaff('treble', 'Eb4', 'major', { keySignature: true }), hint: 'B♭, E♭ and A♭.' },
    ],
    drill: drill.scales({ tonics: ['F', 'Bb', 'Eb', 'Ab'] }),
  },
  {
    id: 'circle-of-fifths',
    title: 'The circle of fifths',
    cards: [
      {
        text: 'Going **up a perfect 5th** adds one sharp: C (none) → G (1♯) → D (2♯) → A (3♯) → E (4♯) → B (5♯) → F♯ (6♯) → C♯ (7♯).',
        staff: seq('treble', 'C4', 'G4', 'D5', 'A5'),
      },
      {
        text: 'Going **down a perfect 5th** adds one flat: C → F (1♭) → B♭ (2♭) → E♭ (3♭) → A♭ (4♭) → D♭ (5♭) → G♭ (6♭) → C♭ (7♭).',
        staff: seq('treble', 'C5', 'F4', 'Bb3'),
      },
      {
        text: 'Neighbors on the circle share all but one note, which is why music moves between them so easily.',
      },
    ],
    tryIt: [
      { prompt: 'Play G major from its key signature alone — the notes are hidden.', answer: playScale('G4', 'major', { anyOctave: true }), staff: keySignatureStaff('treble', 'G4', 'major'), hint: 'One sharp: F♯.' },
      { prompt: 'Play B♭ major from its key signature.', answer: playScale('Bb3', 'major', { anyOctave: true }), staff: keySignatureStaff('treble', 'Bb3', 'major'), hint: 'Two flats: B♭ and E♭.' },
      { prompt: 'Play A major from its key signature.', answer: playScale('A4', 'major', { anyOctave: true }), staff: keySignatureStaff('treble', 'A4', 'major'), hint: 'Three sharps: F♯, C♯ and G♯.' },
    ],
    drill: drill.scales({ moreKeys: true, keySignatureOnly: true }),
  },
];
```

`src/learn/content/unit4MinorScales.ts`:
```ts
import { drill, keys, playScale, scaleStaff } from '../build';
import type { Lesson } from '../types';

export const unit4: Lesson[] = [
  {
    id: 'relative-minor',
    title: 'Relative minor',
    cards: [
      {
        text: 'Every major key has a **relative minor** that shares its key signature. It starts on the **6th note** of the major scale — a minor 3rd below the major tonic.',
        staff: scaleStaff('treble', 'A4', 'natural-minor', { keySignature: true }),
      },
      {
        text: 'C major ↔ A minor, G major ↔ E minor, F major ↔ D minor. Same notes, different home note.',
        staff: scaleStaff('treble', 'E4', 'natural-minor', { keySignature: true }),
      },
      {
        text: 'The **natural minor** pattern is **W H W W H W W**.',
        keys: keys('A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5'),
      },
    ],
    tryIt: [
      { prompt: 'Play A natural minor, up one octave.', answer: playScale('A4', 'natural-minor'), staff: scaleStaff('treble', 'A4', 'natural-minor', { keySignature: true }), hint: 'White keys only, A to A.' },
      { prompt: 'Play E natural minor.', answer: playScale('E4', 'natural-minor'), staff: scaleStaff('treble', 'E4', 'natural-minor', { keySignature: true }), hint: 'One sharp: F♯.' },
      { prompt: 'Play D natural minor.', answer: playScale('D4', 'natural-minor'), staff: scaleStaff('treble', 'D4', 'natural-minor', { keySignature: true }), hint: 'One flat: B♭.' },
    ],
    drill: drill.scales({ types: ['natural-minor'] }),
  },
  {
    id: 'harmonic-minor',
    title: 'Harmonic minor',
    cards: [
      {
        text: '**Harmonic minor** raises the 7th note a half step. In A minor, G becomes **G♯**, which pulls strongly back up to A.',
        staff: scaleStaff('treble', 'A4', 'harmonic-minor', { keySignature: true }),
      },
      {
        text: 'The raised 7th is not in the key signature — it is written as an accidental each time. It leaves a gap of 3 half steps between the 6th and 7th notes: **F–G♯**.',
        keys: keys('F5', 'G#5'),
      },
    ],
    tryIt: [
      { prompt: 'Play A harmonic minor.', answer: playScale('A4', 'harmonic-minor'), staff: scaleStaff('treble', 'A4', 'harmonic-minor', { keySignature: true }), hint: 'White keys except G♯.' },
      { prompt: 'Play D harmonic minor.', answer: playScale('D4', 'harmonic-minor'), staff: scaleStaff('treble', 'D4', 'harmonic-minor', { keySignature: true }), hint: 'B♭ from the key signature, plus C♯.' },
      { prompt: 'Play E harmonic minor.', answer: playScale('E4', 'harmonic-minor'), staff: scaleStaff('treble', 'E4', 'harmonic-minor', { keySignature: true }), hint: 'F♯ from the key signature, plus D♯.' },
    ],
    drill: drill.scales({ types: ['harmonic-minor'] }),
  },
  {
    id: 'melodic-minor',
    title: 'Melodic minor',
    cards: [
      {
        text: '**Melodic minor** raises both the 6th and the 7th on the way **up**, smoothing out harmonic minor’s gap: A B C D E **F♯ G♯** A.',
        staff: scaleStaff('treble', 'A4', 'melodic-minor', { keySignature: true }),
      },
      {
        text: 'On the way **down** it returns to natural minor: A G F E D C B A. Watch for the naturals.',
        staff: scaleStaff('treble', 'A4', 'melodic-minor', { direction: 'up-down', keySignature: true }),
      },
    ],
    tryIt: [
      { prompt: 'Play A melodic minor, up and back down.', answer: playScale('A4', 'melodic-minor', { direction: 'up-down' }), staff: scaleStaff('treble', 'A4', 'melodic-minor', { direction: 'up-down', keySignature: true }), hint: 'F♯ and G♯ going up; F and G going down.' },
      { prompt: 'Play E melodic minor, up one octave.', answer: playScale('E4', 'melodic-minor'), staff: scaleStaff('treble', 'E4', 'melodic-minor', { keySignature: true }), hint: 'F♯ from the key signature, plus C♯ and D♯ going up.' },
    ],
    drill: drill.scales({ types: ['melodic-minor'], direction: 'up-down' }),
  },
];
```

`src/learn/curriculum.ts`:
```ts
import { unit1 } from './content/unit1Reading';
import { unit2 } from './content/unit2Intervals';
import { unit3 } from './content/unit3MajorScales';
import { unit4 } from './content/unit4MinorScales';
import type { Unit } from './types';

/** The one place that orders and groups lessons. Reorder or regroup here; lesson ids key saved progress. */
export const UNITS: Unit[] = [
  { id: 'reading', title: 'Reading refresh', lessons: unit1 },
  { id: 'intervals', title: 'Intervals', lessons: unit2 },
  { id: 'major-scales', title: 'Major scales & keys', lessons: unit3 },
  { id: 'minor-scales', title: 'Minor scales', lessons: unit4 },
];
```

- [ ] **Step 4: Run** `npx vitest run src/learn` → PASS. If a guard fails, fix the **content** (not the guard) and note it. Then `npm test`, `npm run check`, `npm run build`.

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: lessons for reading, intervals, major and minor scales" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Content — units 5–7

**Files:**
- Create: `src/learn/content/unit5Triads.ts`, `src/learn/content/unit6Sevenths.ts`, `src/learn/content/unit7Harmony.ts`
- Modify: `src/learn/curriculum.ts`, `src/learn/content.test.ts`

- [ ] **Step 1: Failing test** — append to `describe('curriculum content', ...)` in `src/learn/content.test.ts`:
```ts
  it('has all 29 lessons in 7 units', () => {
    expect(UNITS).toHaveLength(7);
    expect(lessons).toHaveLength(29);
  });
```
Run → FAIL (16 lessons).

- [ ] **Step 2: Content**

`src/learn/content/unit5Triads.ts`:
```ts
import { chords, drill, keys, playChord } from '../build';
import type { Lesson } from '../types';

export const unit5: Lesson[] = [
  {
    id: 'building-triads',
    title: 'Building a triad from 3rds',
    cards: [
      {
        text: 'A **triad** is three notes stacked in 3rds: a **root**, a **3rd** above it and a **5th** above the root. On the staff it looks like a snowman — all lines or all spaces.',
        staff: chords('treble', ['C4', 'E4', 'G4']),
        keys: keys('C4', 'E4', 'G4'),
      },
      {
        text: 'A **major** triad has a major 3rd on the bottom (4 half steps) and a minor 3rd on top (3). C–E–G, F–A–C and G–B–D are major triads.',
        staff: chords('treble', ['F4', 'A4', 'C5'], ['G4', 'B4', 'D5']),
      },
    ],
    tryIt: [
      { prompt: 'Play this C major triad.', answer: playChord('C4', 'E4', 'G4'), staff: chords('treble', ['C4', 'E4', 'G4']), keys: keys('C4', 'E4', 'G4'), hint: 'C–E–G, all white keys. Press all three together.' },
      { prompt: 'Play an F major triad.', answer: playChord('F4', 'A4', 'C5'), keys: keys('F4', 'A4', 'C5'), hint: 'F–A–C, all white keys.' },
      { prompt: 'Play a D major triad.', answer: playChord('D4', 'F#4', 'A4'), keys: keys('D4', 'F#4', 'A4'), hint: 'D–F♯–A: the 3rd is F♯.' },
    ],
    drill: drill.chords({ qualities: ['maj'] }),
  },
  {
    id: 'major-vs-minor',
    title: 'Major vs minor',
    cards: [
      {
        text: 'A **minor** triad flips the 3rds: minor 3rd on the bottom, major 3rd on top. Only the middle note moves — down a half step.',
        staff: chords('treble', ['C4', 'E4', 'G4'], ['C4', 'Eb4', 'G4']),
        keys: keys('C4', 'Eb4', 'G4'),
      },
      {
        text: 'Major sounds bright; minor sounds darker. A–C–E, D–F–A and E–G–B are minor triads on white keys only.',
        staff: chords('treble', ['A4', 'C5', 'E5'], ['D4', 'F4', 'A4'], ['E4', 'G4', 'B4']),
      },
    ],
    tryIt: [
      { prompt: 'Play a C minor triad.', answer: playChord('C4', 'Eb4', 'G4'), keys: keys('C4', 'Eb4', 'G4'), hint: 'Lower the middle note of C major: E → E♭.' },
      { prompt: 'Play an A minor triad.', answer: playChord('A4', 'C5', 'E5'), keys: keys('A4', 'C5', 'E5'), hint: 'A–C–E, all white keys.' },
      { prompt: 'Play an E major triad.', answer: playChord('E4', 'G#4', 'B4'), keys: keys('E4', 'G#4', 'B4'), hint: 'Raise the middle note of E minor: G → G♯.' },
    ],
    drill: drill.chords({ qualities: ['maj', 'min'] }),
  },
  {
    id: 'diminished-augmented',
    title: 'Diminished & augmented',
    cards: [
      {
        text: '**Diminished**: two minor 3rds, so the 5th is lowered. B–D–F is diminished using only white keys.',
        staff: chords('treble', ['B4', 'D5', 'F5']),
        keys: keys('B4', 'D5', 'F5'),
      },
      {
        text: '**Augmented**: two major 3rds, so the 5th is raised. C–E–G♯.',
        staff: chords('treble', ['C4', 'E4', 'G#4']),
        keys: keys('C4', 'E4', 'G#4'),
      },
    ],
    tryIt: [
      { prompt: 'Play B diminished.', answer: playChord('B4', 'D5', 'F5'), keys: keys('B4', 'D5', 'F5'), hint: 'B–D–F, white keys only.' },
      { prompt: 'Play C augmented.', answer: playChord('C4', 'E4', 'G#4'), keys: keys('C4', 'E4', 'G#4'), hint: 'C–E–G♯: raise the 5th of C major.' },
      { prompt: 'Play D diminished.', answer: playChord('D4', 'F4', 'Ab4'), keys: keys('D4', 'F4', 'Ab4'), hint: 'D–F–A♭: two minor 3rds.' },
    ],
    drill: drill.chords({ qualities: ['maj', 'min', 'dim', 'aug'] }),
  },
  {
    id: 'triad-symbols',
    title: 'Reading chord symbols',
    cards: [
      {
        text: 'Lead sheets name chords with **symbols**. A letter alone means major: **C**. A lowercase **m** means minor: **Cm**.',
        staff: chords('treble', ['C4', 'E4', 'G4'], ['C4', 'Eb4', 'G4']),
      },
      {
        text: '**°** (or dim) means diminished: **B°**. **+** (or aug) means augmented: **C+**. Any accidental belongs to the root: **F♯m** is F♯–A–C♯.',
        staff: chords('treble', ['F#4', 'A4', 'C#5']),
      },
    ],
    tryIt: [
      { prompt: 'Play F♯m.', answer: playChord('F#4', 'A4', 'C#5'), keys: keys('F#4', 'A4', 'C#5'), hint: 'F♯–A–C♯.' },
      { prompt: 'Play B♭.', answer: playChord('Bb3', 'D4', 'F4'), keys: keys('Bb3', 'D4', 'F4'), hint: 'B♭–D–F.' },
      { prompt: 'Play E°.', answer: playChord('E4', 'G4', 'Bb4'), keys: keys('E4', 'G4', 'Bb4'), hint: 'E–G–B♭: two minor 3rds.' },
    ],
    drill: drill.chords({ qualities: ['maj', 'min', 'dim', 'aug'], showName: true }),
  },
  {
    id: 'inversions',
    title: 'Inversions',
    cards: [
      {
        text: 'An **inversion** moves the root off the bottom. Same three notes, new bass note: **1st inversion** has the 3rd on the bottom, **2nd inversion** the 5th.',
        staff: chords('treble', ['C4', 'E4', 'G4'], ['E4', 'G4', 'C5'], ['G4', 'C5', 'E5']),
      },
      {
        text: 'To name an inverted chord, rearrange it into 3rds — the bottom of the stack is the root. E–G–C stacks as C–E–G: C major.',
        staff: chords('treble', ['E4', 'G4', 'C5']),
      },
      {
        text: 'The app accepts any voicing of the right notes, so inversions are good practice for finding chord shapes near where your hand already is.',
      },
    ],
    tryIt: [
      { prompt: 'Play this 1st-inversion chord.', answer: playChord('E4', 'G4', 'C5'), staff: chords('treble', ['E4', 'G4', 'C5']), keys: keys('E4', 'G4', 'C5'), hint: 'It is C major with E on the bottom.' },
      { prompt: 'Play G major in 2nd inversion (D on the bottom).', answer: playChord('D4', 'G4', 'B4'), keys: keys('D4', 'G4', 'B4'), hint: 'D–G–B.' },
    ],
    drill: drill.chords({ qualities: ['maj', 'min'], inversions: true }),
  },
];
```

`src/learn/content/unit6Sevenths.ts`:
```ts
import { chords, drill, keys, playChord } from '../build';
import type { Lesson } from '../types';

export const unit6: Lesson[] = [
  {
    id: 'dominant-seventh',
    title: 'Dominant 7th',
    cards: [
      {
        text: 'Add one more 3rd on top of a triad and you get a **7th chord** — four notes. The **dominant 7th** is a major triad plus a **minor 7th**: G–B–D–F.',
        staff: chords('treble', ['G4', 'B4', 'D5', 'F5']),
        keys: keys('G4', 'B4', 'D5', 'F5'),
      },
      {
        text: 'It is called *dominant* because it is built on the 5th note of a major key (the dominant) — G7 in C major — and it pulls strongly back home to the tonic.',
        staff: chords('treble', ['G4', 'B4', 'D5', 'F5'], ['E4', 'G4', 'C5']),
      },
    ],
    tryIt: [
      { prompt: 'Play G7.', answer: playChord('G4', 'B4', 'D5', 'F5'), staff: chords('treble', ['G4', 'B4', 'D5', 'F5']), keys: keys('G4', 'B4', 'D5', 'F5'), hint: 'G–B–D–F.' },
      { prompt: 'Play C7.', answer: playChord('C4', 'E4', 'G4', 'Bb4'), keys: keys('C4', 'E4', 'G4', 'Bb4'), hint: 'C major plus B♭.' },
      { prompt: 'Play D7.', answer: playChord('D4', 'F#4', 'A4', 'C5'), keys: keys('D4', 'F#4', 'A4', 'C5'), hint: 'D–F♯–A–C.' },
    ],
    drill: drill.chords({ qualities: ['dom7'] }),
  },
  {
    id: 'major-minor-sevenths',
    title: 'Major 7th & minor 7th',
    cards: [
      {
        text: '**Major 7th** (maj7): a major triad plus a **major 7th** — C–E–G–B. Soft and jazzy.',
        staff: chords('treble', ['C4', 'E4', 'G4', 'B4']),
        keys: keys('C4', 'E4', 'G4', 'B4'),
      },
      {
        text: '**Minor 7th** (m7): a minor triad plus a **minor 7th** — D–F–A–C.',
        staff: chords('treble', ['D4', 'F4', 'A4', 'C5']),
        keys: keys('D4', 'F4', 'A4', 'C5'),
      },
      {
        text: 'Compare **Cmaj7** (C E G B), **C7** (C E G B♭) and **Cm7** (C E♭ G B♭): each differs from the next by one half step.',
        staff: chords('treble', ['C4', 'E4', 'G4', 'B4'], ['C4', 'E4', 'G4', 'Bb4'], ['C4', 'Eb4', 'G4', 'Bb4']),
      },
    ],
    tryIt: [
      { prompt: 'Play Cmaj7.', answer: playChord('C4', 'E4', 'G4', 'B4'), keys: keys('C4', 'E4', 'G4', 'B4'), hint: 'C–E–G–B, all white keys.' },
      { prompt: 'Play Dm7.', answer: playChord('D4', 'F4', 'A4', 'C5'), keys: keys('D4', 'F4', 'A4', 'C5'), hint: 'D–F–A–C, all white keys.' },
      { prompt: 'Play Fmaj7.', answer: playChord('F4', 'A4', 'C5', 'E5'), keys: keys('F4', 'A4', 'C5', 'E5'), hint: 'F–A–C–E.' },
      { prompt: 'Play Am7.', answer: playChord('A4', 'C5', 'E5', 'G5'), keys: keys('A4', 'C5', 'E5', 'G5'), hint: 'A–C–E–G.' },
    ],
    drill: drill.chords({ qualities: ['maj7', 'min7'] }),
  },
  {
    id: 'diminished-sevenths',
    title: 'Half-diminished & diminished 7th',
    cards: [
      {
        text: '**Half-diminished** (ø7, also written m7♭5): a diminished triad plus a **minor 7th** — B–D–F–A.',
        staff: chords('treble', ['B3', 'D4', 'F4', 'A4']),
        keys: keys('B3', 'D4', 'F4', 'A4'),
      },
      {
        text: '**Diminished 7th** (°7): minor 3rds all the way up — B–D–F–A♭. It splits the octave into four equal parts.',
        staff: chords('treble', ['B3', 'D4', 'F4', 'Ab4']),
        keys: keys('B3', 'D4', 'F4', 'Ab4'),
      },
    ],
    tryIt: [
      { prompt: 'Play Bø7.', answer: playChord('B3', 'D4', 'F4', 'A4'), keys: keys('B3', 'D4', 'F4', 'A4'), hint: 'B–D–F–A, all white keys.' },
      { prompt: 'Play B°7.', answer: playChord('B3', 'D4', 'F4', 'Ab4'), keys: keys('B3', 'D4', 'F4', 'Ab4'), hint: 'Lower the A of Bø7 to A♭.' },
      { prompt: 'Play Dø7.', answer: playChord('D4', 'F4', 'Ab4', 'C5'), keys: keys('D4', 'F4', 'Ab4', 'C5'), hint: 'D–F–A♭–C.' },
    ],
    drill: drill.chords({ qualities: ['hdim7', 'dim7'] }),
  },
  {
    id: 'seventh-symbols',
    title: '7th chord symbols',
    cards: [
      {
        text: '**C7** = dominant 7th. **Cmaj7** = major 7th. **Cm7** = minor 7th. **Cø7** = half-diminished. **C°7** = diminished 7th.',
        // C°7 needs B double-flat, which the note model can't spell, so the staff shows the first four.
        staff: chords('treble', ['C4', 'E4', 'G4', 'Bb4'], ['C4', 'E4', 'G4', 'B4'], ['C4', 'Eb4', 'G4', 'Bb4'], ['C4', 'Eb4', 'Gb4', 'Bb4']),
      },
      {
        text: 'Build each from its triad: **7** and **maj7** start from major, **m7** from minor, **ø7** and **°7** from diminished — then add the 7th.',
      },
    ],
    tryIt: [
      { prompt: 'Play A7.', answer: playChord('A4', 'C#5', 'E5', 'G5'), keys: keys('A4', 'C#5', 'E5', 'G5'), hint: 'A–C♯–E–G.' },
      { prompt: 'Play Em7.', answer: playChord('E4', 'G4', 'B4', 'D5'), keys: keys('E4', 'G4', 'B4', 'D5'), hint: 'E–G–B–D, all white keys.' },
      { prompt: 'Play F♯ø7.', answer: playChord('F#4', 'A4', 'C5', 'E5'), keys: keys('F#4', 'A4', 'C5', 'E5'), hint: 'F♯–A–C–E.' },
    ],
    drill: drill.chords({ qualities: ['dom7', 'maj7', 'min7', 'hdim7', 'dim7'], showName: true }),
  },
];
```
`src/learn/content/unit7Harmony.ts`:
```ts
import { diatonicStaff, drill, playDiatonic } from '../build';
import type { Lesson } from '../types';

export const unit7: Lesson[] = [
  {
    id: 'diatonic-triads',
    title: 'Diatonic triads',
    cards: [
      {
        text: 'Build a triad on each note of a scale using **only notes from that scale** and you get the key’s seven **diatonic chords**.',
        staff: diatonicStaff('treble', 'C4', 'major', [1, 2, 3, 4, 5, 6, 7]),
      },
      {
        text: 'In every major key the qualities fall in the same order: **major, minor, minor, major, major, minor, diminished**.',
        staff: diatonicStaff('treble', 'G4', 'major', [1, 2, 3, 4, 5, 6, 7]),
      },
    ],
    tryIt: [
      { prompt: 'Play the triad built on the 4th note of C major.', answer: playDiatonic('C4', 'major', 4), hint: 'F–A–C: F major.' },
      { prompt: 'Play the triad on the 2nd note of G major.', answer: playDiatonic('G4', 'major', 2), hint: 'A–C–E: A minor.' },
      { prompt: 'Play the triad on the 5th note of G major.', answer: playDiatonic('G4', 'major', 5), hint: 'D–F♯–A: D major (F♯ is in G major).' },
    ],
    drill: drill.harmony({ tonics: ['C', 'G'], degrees: [1, 2, 3, 4, 5, 6, 7] }),
  },
  {
    id: 'roman-i-iv-v',
    title: 'Roman numerals: I, IV, V',
    cards: [
      {
        text: '**Roman numerals** name chords by scale degree, so they work in any key. Uppercase means major: **I**, **IV** and **V** are the three major chords of a major key.',
        staff: diatonicStaff('treble', 'C4', 'major', [1, 4, 5]),
      },
      {
        text: '**I – IV – V – I** is the backbone of countless songs. In G major that is G – C – D – G.',
        staff: diatonicStaff('treble', 'G4', 'major', [1, 4, 5, 1]),
      },
    ],
    tryIt: [
      { prompt: 'Play V in C major.', answer: playDiatonic('C4', 'major', 5), hint: 'G–B–D.' },
      { prompt: 'Play IV in D major.', answer: playDiatonic('D4', 'major', 4), hint: 'G–B–D: G is the 4th note of D major.' },
      { prompt: 'Play I in F major.', answer: playDiatonic('F4', 'major', 1), hint: 'F–A–C.' },
    ],
    drill: drill.harmony({ tonics: ['C', 'G', 'D', 'F'], degrees: [1, 4, 5] }),
  },
  {
    id: 'minor-chords-in-major',
    title: 'The minor chords & vii°',
    cards: [
      {
        text: 'Lowercase numerals are minor: **ii**, **iii** and **vi**. In C major they are Dm, Em and Am.',
        staff: diatonicStaff('treble', 'C4', 'major', [2, 3, 6]),
      },
      {
        text: 'The chord on the 7th degree is diminished: **vii°**. In C major it is B°.',
        staff: diatonicStaff('treble', 'C4', 'major', [7]),
      },
      {
        text: 'A very common progression: **I – vi – IV – V**. In C that is C – Am – F – G.',
        staff: diatonicStaff('treble', 'C4', 'major', [1, 6, 4, 5]),
      },
    ],
    tryIt: [
      { prompt: 'Play vi in G major.', answer: playDiatonic('G4', 'major', 6), hint: 'E–G–B: E minor.' },
      { prompt: 'Play ii in F major.', answer: playDiatonic('F4', 'major', 2), hint: 'G–B♭–D: G minor (B♭ is in F major).' },
      { prompt: 'Play vii° in D major.', answer: playDiatonic('D4', 'major', 7), hint: 'C♯–E–G.' },
    ],
    drill: drill.harmony({ tonics: ['C', 'G', 'D', 'F'], degrees: [1, 2, 3, 4, 5, 6, 7] }),
  },
  {
    id: 'harmony-in-minor',
    title: 'Harmony in minor keys',
    cards: [
      {
        text: 'In a minor key, composers almost always raise the 7th (harmonic minor) for the chord on the 5th degree, which makes it **major**: **V**. So a minor key’s home, 4th and 5th chords are **i – iv – V**.',
        staff: diatonicStaff('treble', 'A4', 'minor', [1, 4, 5]),
      },
      {
        text: 'The raised 7th also makes the chord on the 7th degree diminished: **vii°** (G♯–B–D in A minor). This app uses **i, ii°, III, iv, V, VI, vii°**.',
        staff: diatonicStaff('treble', 'A4', 'minor', [7]),
      },
    ],
    tryIt: [
      { prompt: 'Play i in A minor.', answer: playDiatonic('A4', 'minor', 1), hint: 'A–C–E.' },
      { prompt: 'Play V in A minor.', answer: playDiatonic('A4', 'minor', 5), hint: 'E–G♯–B: raise the 7th, G → G♯.' },
      { prompt: 'Play iv in D minor.', answer: playDiatonic('D4', 'minor', 4), hint: 'G–B♭–D.' },
    ],
    drill: drill.harmony({ mode: 'minor', tonics: ['A', 'E', 'D', 'G'], degrees: [1, 2, 3, 4, 5, 6, 7] }),
  },
];
```

In `src/learn/curriculum.ts` add imports for `unit5`, `unit6`, `unit7` and append:
```ts
  { id: 'triads', title: 'Triads', lessons: unit5 },
  { id: 'sevenths', title: '7th chords', lessons: unit6 },
  { id: 'harmony', title: 'Harmony in a key', lessons: unit7 },
```

- [ ] **Step 3: Run** `npx vitest run src/learn` → PASS (fix content, not guards). Then `npm test`, `npm run check`, `npm run build`.

- [ ] **Step 4: Commit**
```bash
git add -A
git commit -m "feat: lessons for triads, 7th chords and harmony" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Screens — Learn path, lesson, try-it, library, checkpoint results

**Files:**
- Create: `src/ui/RichText.svelte`, `src/ui/TryIt.svelte`, `src/ui/Lesson.svelte`, `src/ui/Path.svelte`, `src/ui/Library.svelte`
- Modify: `src/ui/Results.svelte`, `src/ui/Home.svelte`, `src/App.svelte`

**Interfaces:**
- Consumes: everything above. Produces the full Learn flow: Home → Learn (Path) → Lesson (cards → try-it → checkpoint) → Drill → Results (pass banner, Retake / Next lesson / Back); Path → Library → topic (cards) → Practice this.

- [ ] **Step 1: `src/ui/RichText.svelte`**
```svelte
<script lang="ts">
  import { parseRichText } from '../learn/richText';

  let { text }: { text: string } = $props();
  const paragraphs = $derived(parseRichText(text));
</script>

{#each paragraphs as segments}
  <p>{#each segments as s}{#if s.bold}<strong>{s.text}</strong>{:else}{s.text}{/if}{/each}</p>
{/each}
```

- [ ] **Step 2: `src/ui/TryIt.svelte`**
```svelte
<script lang="ts">
  import { onDestroy } from 'svelte';
  import Keyboard from './Keyboard.svelte';
  import Staff from './Staff.svelte';
  import type { Levels } from '../audio/calibration';
  import { ChordTracker } from '../audio/chordTracker';
  import { Mic, type AudioFrame } from '../audio/mic';
  import { micErrorMessage } from '../audio/micErrors';
  import { NoteTracker } from '../audio/noteTracker';
  import { heardPitchClasses, pitchClassNames } from '../drill/answer';
  import type { Heard } from '../drill/types';
  import { TryItSession } from '../learn/tryItSession';
  import type { TryStep } from '../learn/types';
  import { displayName, fromMidi } from '../music/note';
  import type { StaffView } from '../staff/types';
  import { keyboardRange } from './keyboardLayout';

  let { steps, tuningOffset, levels, onDone }: {
    steps: TryStep[];
    tuningOffset: number;
    levels: Levels;
    onDone: () => void;
  } = $props();

  const NEXT_MS = 1000;

  // Steps, tuning and levels are fixed for the lifetime of this component.
  const session = new TryItSession(steps);
  const tracker = new NoteTracker({ tuningOffsetCents: tuningOffset, silenceRms: levels.silenceRms });
  const chordTracker = new ChordTracker({ silenceRms: levels.silenceRms });

  let mic: Mic | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let starting = false;
  let destroyed = false;

  let started = $state(false);
  let error = $state('');
  let index = $state(0);
  let matched = $state(0);
  let correct = $state(false);
  let missed = $state(false);
  let message = $state('');
  let innerHeight = $state(window.innerHeight);

  const step = $derived(steps[index]);
  const targets = $derived(step ? step.keys?.midis ?? (step.answer.kind === 'notes' ? step.answer.midis : []) : []);
  const marks = $derived.by(() => {
    const m: Record<number, 'correct'> = {};
    if (!step) return m;
    if (correct) for (const k of targets) m[k] = 'correct';
    else if (step.answer.kind === 'notes') for (const k of step.answer.midis.slice(0, matched)) m[k] = 'correct';
    return m;
  });
  const staffView = $derived.by((): StaffView | null => {
    if (!step?.staff) return null;
    return {
      ...step.staff,
      items: step.staff.items.map((item, i) => ({ ...item, highlight: correct || i < matched ? 'correct' : null })),
    };
  });

  function sync() {
    index = session.index;
    matched = session.matched;
    correct = session.state === 'correct';
    missed = session.missed;
  }

  function heardText(h: Heard): string {
    if (h.kind === 'note') return displayName(fromMidi(h.midi));
    return pitchClassNames(heardPitchClasses(h.chroma)) || 'nothing clear';
  }

  function onHeard(h: Heard) {
    const result = session.hear(h);
    if (result === 'ignored') return;
    message = result === 'wrong' ? `You played ${heardText(h)}.` : '';
    sync();
    if (result === 'correct') {
      clearTimeout(timer);
      timer = setTimeout(advance, NEXT_MS);
    }
  }

  function onFrame(f: AudioFrame) {
    const n = tracker.push(f);
    if (n) onHeard({ kind: 'note', midi: n.midi, time: n.time });
    const c = chordTracker.push(f);
    if (c) onHeard({ kind: 'chord', chroma: c.chroma, time: c.time });
  }

  function advance() {
    clearTimeout(timer);
    session.next();
    tracker.reset();
    chordTracker.reset();
    message = '';
    sync();
    if (session.state === 'done') finish();
  }

  function finish() {
    void mic?.close();
    mic = null;
    onDone();
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
    mic = m;
    m.setTuningOffset(tuningOffset);
    m.onFrame = onFrame;
    m.start();
    started = true;
    starting = false;
  }

  onDestroy(() => {
    destroyed = true;
    clearTimeout(timer);
    void mic?.close();
  });
</script>

<svelte:window bind:innerHeight />

{#if !started}
  <div class="center">
    <p>Try it at the piano: {steps.length} short steps. Take your time — there is no score.</p>
    <button class="primary big" onclick={start}>Tap to start</button>
    {#if error}
      <p class="error">{error}</p>
      <button onclick={onDone}>Skip to the checkpoint</button>
    {/if}
  </div>
{:else if step}
  <p class="count">Step {index + 1} of {steps.length}</p>
  <p class="prompt">{step.prompt}</p>
  {#if staffView}<Staff view={staffView} maxHeight={Math.round(innerHeight * 0.3)} />{/if}
  {#if targets.length > 0}
    <Keyboard
      highlight={missed && !correct ? targets : []}
      {marks}
      labels={missed || correct ? step.keys?.labels : undefined}
      range={keyboardRange(targets)}
    />
  {/if}
  <p class="message">{correct ? 'Nice!' : message}</p>
  {#if missed && !correct}<p class="hint"><strong>Hint:</strong> {step.hint}</p>{/if}
  <div class="actions"><button onclick={advance}>Skip →</button></div>
{/if}

<style>
  .center { display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-top: 3rem; text-align: center; }
  .count { color: var(--muted); margin: 0; }
  .prompt { font-size: 1.8rem; font-weight: 600; margin: 0.5rem 0; }
  .message { font-size: 1.3rem; min-height: 1.8rem; }
  .hint { color: var(--fg); background: #eef4ff; border-radius: 0.5rem; padding: 0.75rem 1rem; }
  .actions { display: flex; justify-content: flex-end; }
</style>
```

- [ ] **Step 3: `src/ui/Lesson.svelte`**
```svelte
<script lang="ts">
  import Keyboard from './Keyboard.svelte';
  import RichText from './RichText.svelte';
  import Staff from './Staff.svelte';
  import TryIt from './TryIt.svelte';
  import type { Levels } from '../audio/calibration';
  import { CHECKPOINT_LENGTH, PASS_SCORE } from '../learn/progress';
  import type { Lesson } from '../learn/types';

  let { lesson, unitTitle, mode, tuningOffset, levels, onCheckpoint, onBack }: {
    lesson: Lesson;
    unitTitle: string;
    mode: 'lesson' | 'reference';
    tuningOffset: number;
    levels: Levels;
    onCheckpoint: () => void;
    onBack: () => void;
  } = $props();

  let phase = $state<'cards' | 'try' | 'ready'>('cards');
  let cardIndex = $state(0);
  let innerHeight = $state(window.innerHeight);

  const card = $derived(lesson.cards[cardIndex]);
  const lastCard = $derived(cardIndex === lesson.cards.length - 1);

  function next() {
    if (!lastCard) cardIndex++;
    else phase = 'try';
  }
</script>

<svelte:window bind:innerHeight />

<main class="screen lesson">
  <header>
    <button onclick={onBack}>← {mode === 'lesson' ? 'Lessons' : 'Library'}</button>
    <div>
      <p class="unit">{unitTitle}</p>
      <h1>{lesson.title}</h1>
    </div>
  </header>

  {#if mode === 'lesson'}
    <ol class="steps">
      <li class:active={phase === 'cards'}>Concepts</li>
      <li class:active={phase === 'try'}>Try it</li>
      <li class:active={phase === 'ready'}>Checkpoint</li>
    </ol>
  {/if}

  {#if phase === 'cards'}
    <div class="card">
      <div class="text"><RichText text={card.text} /></div>
      {#if card.staff || card.keys}
        <div class="visual">
          {#if card.staff}<Staff view={card.staff} maxHeight={Math.round(innerHeight * 0.35)} />{/if}
          {#if card.keys}<Keyboard highlight={card.keys.midis} labels={card.keys.labels} />{/if}
        </div>
      {/if}
    </div>
    <nav>
      <button onclick={() => cardIndex--} disabled={cardIndex === 0}>← Back</button>
      <span class="muted">{cardIndex + 1} / {lesson.cards.length}</span>
      {#if mode === 'reference'}
        {#if lastCard}
          <button class="primary" onclick={onCheckpoint}>Practice this</button>
        {:else}
          <button class="primary" onclick={() => cardIndex++}>Next →</button>
        {/if}
      {:else}
        <button class="primary" onclick={next}>{lastCard ? 'Try it at the piano →' : 'Next →'}</button>
      {/if}
    </nav>
  {:else if phase === 'try'}
    <TryIt steps={lesson.tryIt} {tuningOffset} {levels} onDone={() => (phase = 'ready')} />
  {:else}
    <div class="ready">
      <h2>Checkpoint</h2>
      <p>{CHECKPOINT_LENGTH} questions. Get {PASS_SCORE} right to complete the lesson.</p>
      <button class="primary big" onclick={onCheckpoint}>Start checkpoint</button>
      <button onclick={() => { phase = 'cards'; cardIndex = 0; }}>Review the concepts</button>
    </div>
  {/if}
</main>

<style>
  header { display: flex; align-items: center; gap: 1.5rem; }
  header h1 { margin: 0; }
  .unit { margin: 0; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.85rem; }
  .steps { display: flex; gap: 1.5rem; list-style: none; padding: 0; color: var(--muted); }
  .steps li.active { color: var(--fg); font-weight: 700; }
  .card { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 2rem; align-items: center; min-height: 50vh; }
  .card:has(.visual) { grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); }
  .card:not(:has(.visual)) { grid-template-columns: 1fr; max-width: 700px; }
  .text { font-size: 1.3rem; line-height: 1.6; }
  nav { display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; }
  .ready { display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-top: 3rem; }
  .muted { color: var(--muted); }
</style>
```

- [ ] **Step 4: `src/ui/Path.svelte` and `src/ui/Library.svelte`**

`src/ui/Path.svelte`:
```svelte
<script lang="ts">
  import { nextLesson } from '../learn/path';
  import { CHECKPOINT_LENGTH } from '../learn/progress';
  import type { Unit } from '../learn/types';
  import type { LessonProgress } from '../progress/db';

  let { units, progress, onOpen, onLibrary, onBack }: {
    units: Unit[];
    progress: Map<string, LessonProgress>;
    onOpen: (lessonId: string) => void;
    onLibrary: () => void;
    onBack: () => void;
  } = $props();

  const passed = $derived(new Set([...progress.values()].filter((p) => p.passedAt !== null).map((p) => p.lessonId)));
  const next = $derived(nextLesson(units, passed));
</script>

<main class="screen path">
  <header class="top">
    <button onclick={onBack}>← Home</button>
    <h1>Learn</h1>
    <button onclick={onLibrary}>Library</button>
  </header>

  {#if next}
    <button class="primary big continue" onclick={() => onOpen(next.id)}>Continue: {next.title}</button>
  {:else}
    <p class="done">Every lesson is complete. Revisit any of them anytime.</p>
  {/if}

  {#each units as unit, u}
    <section>
      <h2>{u + 1}. {unit.title}</h2>
      <ul>
        {#each unit.lessons as lesson}
          {@const p = progress.get(lesson.id)}
          <li>
            <button class="lesson" class:passed={passed.has(lesson.id)} onclick={() => onOpen(lesson.id)}>
              <span class="mark">{passed.has(lesson.id) ? '✓' : '○'}</span>
              <span class="title">{lesson.title}</span>
              {#if p}<span class="score">best {p.bestScore}/{CHECKPOINT_LENGTH}</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
</main>

<style>
  .top { display: flex; align-items: center; justify-content: space-between; }
  .continue { margin: 1rem 0; }
  .done { color: var(--correct); font-weight: 600; }
  section h2 { font-size: 1.1rem; margin: 1.5rem 0 0.5rem; }
  ul { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; }
  .lesson { width: 100%; display: flex; align-items: center; gap: 0.75rem; text-align: left; }
  .lesson.passed { border-color: var(--correct); }
  .mark { font-weight: 700; color: var(--correct); width: 1.2rem; }
  .title { flex: 1; }
  .score { color: var(--muted); font-size: 0.9rem; }
</style>
```

`src/ui/Library.svelte`:
```svelte
<script lang="ts">
  import type { Unit } from '../learn/types';

  let { units, onOpen, onBack }: { units: Unit[]; onOpen: (lessonId: string) => void; onBack: () => void } = $props();
</script>

<main class="screen library">
  <header class="top">
    <button onclick={onBack}>← Lessons</button>
    <h1>Library</h1>
  </header>
  {#each units as unit, u}
    <section>
      <h2>{u + 1}. {unit.title}</h2>
      <div class="topics">
        {#each unit.lessons as lesson}
          <button onclick={() => onOpen(lesson.id)}>{lesson.title}</button>
        {/each}
      </div>
    </section>
  {/each}
</main>

<style>
  .top { display: flex; align-items: center; gap: 1.5rem; }
  section h2 { font-size: 1.1rem; margin: 1.5rem 0 0.5rem; }
  .topics { display: flex; flex-wrap: wrap; gap: 0.5rem; }
</style>
```

- [ ] **Step 5: Results pass banner** — replace `src/ui/Results.svelte`:
```svelte
<script lang="ts">
  import type { SessionStats } from '../drill/session';
  import { CHECKPOINT_LENGTH, PASS_SCORE } from '../learn/progress';

  let { stats, checkpoint, onAgain, onHome, onNext = null, againLabel = 'Again', homeLabel = 'Home' }: {
    stats: SessionStats;
    checkpoint?: { passed: boolean; saveFailed: boolean };
    onAgain: () => void;
    onHome: () => void;
    onNext?: (() => void) | null;
    againLabel?: string;
    homeLabel?: string;
  } = $props();
</script>

<main class="screen results">
  {#if checkpoint}
    <p class="banner" class:pass={checkpoint.passed}>
      {checkpoint.passed ? 'Passed ✓ Lesson complete' : `Not yet — ${PASS_SCORE} of ${CHECKPOINT_LENGTH} needed`}
    </p>
    {#if checkpoint.saveFailed}<p class="muted">Couldn't save progress on this device.</p>{/if}
  {/if}
  <h1>{stats.correct} / {stats.asked} correct</h1>
  <dl>
    <dt>Accuracy</dt><dd>{Math.round(stats.accuracy * 100)}%</dd>
    <dt>Average time</dt><dd>{(stats.avgResponseMs / 1000).toFixed(1)} s</dd>
    <dt>Best run</dt><dd>{stats.bestRun} in a row</dd>
  </dl>
  <div class="actions">
    {#if onNext}<button class="primary big" onclick={onNext}>Next lesson</button>{/if}
    <button class:primary={!onNext} class:big={!onNext} onclick={onAgain}>{againLabel}</button>
    <button onclick={onHome}>{homeLabel}</button>
  </div>
</main>

<style>
  h1 { font-size: 3rem; }
  .banner { font-size: 1.5rem; font-weight: 700; color: var(--wrong); }
  .banner.pass { color: var(--correct); }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.5rem 1.5rem; font-size: 1.3rem; }
  dt { color: var(--muted); }
  dd { margin: 0; font-weight: 600; }
  .actions { display: flex; gap: 1rem; margin-top: 2rem; }
  .muted { color: var(--muted); }
</style>
```

- [ ] **Step 6: Home and App**

`src/ui/Home.svelte`: add `onLearn: () => void` to the props; directly under `<h1>Piano Trainer</h1>` add:
```svelte
  <button class="primary big learn" onclick={onLearn}>Learn</button>
  <h2 class="section">Practice drills</h2>
```
and styles `.learn { width: 100%; max-width: 640px; margin-bottom: 1rem; }` and `.section { font-size: 1rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }`. Change the non-Learn exercise buttons from `class="primary big"` to `class="big"` so Learn stands out.

Replace `src/App.svelte`:
```svelte
<script lang="ts">
  import Home from './ui/Home.svelte';
  import Calibrate from './ui/Calibrate.svelte';
  import DrillSetup from './ui/DrillSetup.svelte';
  import Drill from './ui/Drill.svelte';
  import Results from './ui/Results.svelte';
  import Path from './ui/Path.svelte';
  import Library from './ui/Library.svelte';
  import Lesson from './ui/Lesson.svelte';
  import { getAllLessonProgress, getSetting, recordLessonAttempt, type LessonProgress } from './progress/db';
  import { DEFAULT_LEVELS, type Levels } from './audio/calibration';
  import type { DrillConfig } from './drill/config';
  import type { ExerciseType } from './drill/exercises';
  import type { SessionStats } from './drill/session';
  import { UNITS } from './learn/curriculum';
  import { checkpointConfig, findLesson, lessonAfter } from './learn/path';
  import { isPassing } from './learn/progress';

  type Origin = 'path' | 'library';
  interface Checkpoint {
    lessonId: string;
    origin: Origin;
  }
  type Screen =
    | { name: 'home' }
    | { name: 'calibrate' }
    | { name: 'setup'; type: ExerciseType }
    | { name: 'drill'; config: DrillConfig; run: number; checkpoint?: Checkpoint }
    | { name: 'results'; config: DrillConfig; stats: SessionStats; checkpoint?: Checkpoint & { passed: boolean; saveFailed: boolean } }
    | { name: 'path' }
    | { name: 'library' }
    | { name: 'lesson'; lessonId: string; mode: 'lesson' | 'reference' };

  let screen: Screen = $state({ name: 'home' });
  let tuningOffset = $state(0);
  let runCounter = 0;
  let levels = $state<Levels>(DEFAULT_LEVELS);
  let progress = $state(new Map<string, LessonProgress>());
  getSetting('tuningOffsetCents', 0).then((v) => (tuningOffset = v));
  getSetting<Levels>('levels', DEFAULT_LEVELS).then((v) => (levels = v));
  getAllLessonProgress().then((list) => (progress = new Map(list.map((p) => [p.lessonId, p]))));

  const home = () => (screen = { name: 'home' });
  const drill = (config: DrillConfig, checkpoint?: Checkpoint) =>
    (screen = { name: 'drill', config, run: ++runCounter, checkpoint });
  const openLesson = (lessonId: string, mode: 'lesson' | 'reference' = 'lesson') => (screen = { name: 'lesson', lessonId, mode });
  const backTo = (origin: Origin) => (screen = origin === 'path' ? { name: 'path' } : { name: 'library' });

  function startCheckpoint(lessonId: string, origin: Origin) {
    const found = findLesson(UNITS, lessonId);
    if (found) drill(checkpointConfig(found.lesson), { lessonId, origin });
  }

  async function finished(config: DrillConfig, stats: SessionStats, checkpoint?: Checkpoint) {
    if (!checkpoint) {
      screen = { name: 'results', config, stats };
      return;
    }
    const passed = isPassing(stats.correct);
    let saveFailed = false;
    try {
      const p = await recordLessonAttempt(checkpoint.lessonId, stats.correct, passed);
      progress = new Map(progress).set(p.lessonId, p);
    } catch {
      saveFailed = true;
      const prev = progress.get(checkpoint.lessonId);
      progress = new Map(progress).set(checkpoint.lessonId, {
        lessonId: checkpoint.lessonId,
        bestScore: Math.max(prev?.bestScore ?? 0, stats.correct),
        attempts: (prev?.attempts ?? 0) + 1,
        passedAt: prev?.passedAt ?? (passed ? Date.now() : null),
      });
    }
    screen = { name: 'results', config, stats, checkpoint: { ...checkpoint, passed, saveFailed } };
  }
</script>

{#if screen.name === 'home'}
  <Home
    {tuningOffset}
    onLearn={() => (screen = { name: 'path' })}
    onDrill={(type) => (screen = { name: 'setup', type })}
    onCalibrate={() => (screen = { name: 'calibrate' })}
  />
{:else if screen.name === 'calibrate'}
  <Calibrate
    {tuningOffset}
    {levels}
    onTuningChange={(c) => (tuningOffset = c)}
    onLevelsChange={(l) => (levels = l)}
    onBack={home}
  />
{:else if screen.name === 'setup'}
  {@const s = screen}
  {#key s.type}
    <DrillSetup type={s.type} onStart={drill} onBack={home} />
  {/key}
{:else if screen.name === 'drill'}
  {@const s = screen}
  {#key s.run}
    <Drill
      config={s.config}
      {tuningOffset}
      {levels}
      onFinish={(stats) => void finished(s.config, stats, s.checkpoint)}
      onExit={() => (s.checkpoint ? backTo(s.checkpoint.origin) : home())}
    />
  {/key}
{:else if screen.name === 'results'}
  {@const s = screen}
  {#if s.checkpoint}
    {@const cp = s.checkpoint}
    {@const next = cp.passed && cp.origin === 'path' ? lessonAfter(UNITS, cp.lessonId) : null}
    <Results
      stats={s.stats}
      checkpoint={cp}
      againLabel="Retake checkpoint"
      homeLabel={cp.origin === 'library' ? 'Back to library' : 'Back to lessons'}
      onAgain={() => startCheckpoint(cp.lessonId, cp.origin)}
      onHome={() => backTo(cp.origin)}
      onNext={next ? () => openLesson(next.id) : null}
    />
  {:else}
    <Results stats={s.stats} onAgain={() => drill(s.config)} onHome={home} />
  {/if}
{:else if screen.name === 'path'}
  <Path units={UNITS} {progress} onOpen={(id) => openLesson(id)} onLibrary={() => (screen = { name: 'library' })} onBack={home} />
{:else if screen.name === 'library'}
  <Library units={UNITS} onOpen={(id) => openLesson(id, 'reference')} onBack={() => (screen = { name: 'path' })} />
{:else if screen.name === 'lesson'}
  {@const s = screen}
  {@const found = findLesson(UNITS, s.lessonId)}
  {#if found}
    {#key `${s.lessonId}:${s.mode}`}
      <Lesson
        lesson={found.lesson}
        unitTitle={found.unit.title}
        mode={s.mode}
        {tuningOffset}
        {levels}
        onCheckpoint={() => startCheckpoint(s.lessonId, s.mode === 'lesson' ? 'path' : 'library')}
        onBack={() => backTo(s.mode === 'lesson' ? 'path' : 'library')}
      />
    {/key}
  {/if}
{/if}
```

- [ ] **Step 7: Verify and commit**

Run `npm test`, `npm run check` (0 errors), `npm run build`. Leave no dev/preview server running.
```bash
git add -A
git commit -m "feat: Learn path, lessons with try-it, reference library, checkpoint results" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Controller verification (not the implementer):** serve the build with the synthetic-mic harness (rAF shimmed to timers, screenshot to force staff layout if the pane is hidden) and walk: Home → Learn → first lesson's cards (staff + keyboard render) → try-it (correct note → green + advance; wrong → hint + highlighted keys; Skip) → checkpoint pass (≥8) → Passed banner → Next lesson; Path shows ✓ and best score after reload; Library → topic → Practice this → results → Back to library; one chord lesson and one harmony lesson try-it; Harmony drill from Home.

---

### Task 8: Final review and deploy (controller)

- [ ] Whole-branch review; one fix wave if needed; scoped re-review.
- [ ] Fast-forward `main`, push, watch the Pages deploy, confirm the live build label.
- [ ] Tell the user to reopen the app until the new build shows, then try Learn.
