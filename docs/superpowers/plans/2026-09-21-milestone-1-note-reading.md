# Milestone 1: Note-Reading Drill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Svelte PWA, runnable on the user's iPad over LAN HTTPS, that calibrates to their acoustic piano and runs a scored note-reading drill (endless or fixed length, retry or move-on).

**Architecture:** Pure-TypeScript cores (music model, note tracker, drill engine) with unit tests; thin browser adapters (mic via Web Audio + pitchy, staff via VexFlow, settings via IndexedDB); Svelte 5 screens wiring them together. The drill engine never touches audio; it consumes `HeardNote` events.

**Tech Stack:** Vite 8, Svelte 5 (runes), TypeScript 6, Vitest 5, VexFlow 5 (`vexflow/bravura` entry), pitchy 4, idb 8, fake-indexeddb (tests), @vitejs/plugin-basic-ssl, vite-plugin-pwa (Task 8).

**Spec:** `docs/superpowers/specs/2026-09-21-piano-trainer-design.md` — this plan covers build-order stages 1–3 plus PWA install. Stages 4–7 (progress store, chords/intervals/scales, stats, sequences, badges) get their own plans after the Task 4 checkpoint.

## Global Constraints

- Target: iPad Safari, landscape-first; mic requires HTTPS (dev: `@vitejs/plugin-basic-ssl`, `server.host: true`).
- `getUserMedia` constraints: `echoCancellation: false, noiseSuppression: false, autoGainControl: false`.
- AudioContext created/resumed only inside a user tap handler.
- Monophonic confirm rule: clarity ≥ 0.9, same MIDI note ±40 cents for 3 consecutive frames; RMS onset re-arms repeated notes.
- Tuning offset stored in cents relative to A440; applied to all pitch → MIDI conversion.
- Miss modes: `retry` (question stays; first miss counts against accuracy) and `move-on` (answer shown ~1 s, then next).
- Session length: `10 | 20 | 50 | 'endless'`. Score = total correct on first try.
- Weak-spot weighting on by default, toggleable.
- Values written to IndexedDB must be plain objects (`$state.snapshot(...)` before saving Svelte state).
- TypeScript pinned to `~6.0` (svelte-check peer range is `^5 || ^6`).
- Do not use TS constructor parameter properties (`constructor(private x)`); declare fields explicitly.
- Every commit message ends with: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
- Run commands from the repo root `C:\Users\Kaelen Raible\music_app` (Git Bash).

## File Structure

```
index.html                     Vite entry HTML (viewport + iOS web-app meta)
package.json / tsconfig.json / svelte.config.js / vite.config.ts / .gitignore
public/favicon.svg             App icon source (Task 8 generates PNGs from it)
src/main.ts                    Mounts App
src/app.css                    Global styles
src/vite-env.d.ts              Type refs
src/App.svelte                 Screen router + tuning offset state
src/music/note.ts              Note type, MIDI/frequency conversion, names
src/staff/types.ts             StaffView / StaffClef / Highlight (no VexFlow import)
src/staff/vexKeys.ts           Note → VexFlow key strings, staff splitting (pure)
src/staff/renderStaff.ts       VexFlow drawing (browser only)
src/audio/noteTracker.ts       Frame stream → confirmed NoteEvents (pure)
src/audio/calibration.ts       Tuning-offset computation (pure)
src/audio/mic.ts               getUserMedia + AnalyserNode + pitchy → PitchFrames
src/audio/micErrors.ts         Human-readable mic error messages
src/progress/db.ts             IndexedDB key-value settings
src/drill/random.ts            Weighted pick + seeded RNG
src/drill/types.ts             Exercise / Question / HeardNote / log types
src/drill/noteReading.ts       Note-reading exercise
src/drill/session.ts           DrillSession state machine + stats
src/drill/config.ts            DrillConfig + defaults
src/ui/Staff.svelte            Staff component
src/ui/Home.svelte             Home screen
src/ui/Calibrate.svelte        Calibration / mic test screen
src/ui/DrillSetup.svelte       Drill settings screen
src/ui/Drill.svelte            Drill screen
src/ui/Results.svelte          Results screen
Tests live beside sources as *.test.ts.
```

---

### Task 1: Project scaffold + music model

**Files:**
- Create: `package.json`, `tsconfig.json`, `svelte.config.js`, `vite.config.ts`, `.gitignore`, `index.html`, `src/main.ts`, `src/app.css`, `src/vite-env.d.ts`, `src/App.svelte`
- Create: `src/music/note.ts`
- Test: `src/music/note.test.ts`

**Interfaces:**
- Produces:
  - `type Step = 'C'|'D'|'E'|'F'|'G'|'A'|'B'`, `type Alter = -1|0|1`, `interface Note { step: Step; alter: Alter; octave: number }`
  - `STEPS: Step[]`
  - `toMidi(n: Note): number`, `fromMidi(midi: number): Note` (sharp spelling)
  - `pitchClass(midi: number): number` (0–11)
  - `parseNote(s: string): Note` (e.g. `"C#4"`, `"Bb3"`; throws on invalid)
  - `noteName(n: Note): string` (ASCII, e.g. `"C#4"`; used as item keys)
  - `displayName(n: Note): string` (e.g. `"C♯4"`)
  - `freqToMidi(freq: number, a4 = 440): { midi: number; cents: number }`
  - `midiToFreq(midi: number, a4 = 440): number`

- [ ] **Step 1: Write config files**

`package.json`:
```json
{
  "name": "piano-trainer",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --host",
    "test": "vitest run",
    "check": "svelte-check --tsconfig ./tsconfig.json"
  }
}
```

`.gitignore`:
```
node_modules
dist
dev-dist
*.local
```

`tsconfig.json`:
```json
{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "node"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "src/**/*.svelte", "vite.config.ts"]
}
```

`svelte.config.js`:
```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
};
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [svelte(), basicSsl()],
  server: { host: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Piano Trainer" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <title>Piano Trainer</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/vite-env.d.ts`:
```ts
/// <reference types="svelte" />
/// <reference types="vite/client" />
```

`src/main.ts`:
```ts
import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

mount(App, { target: document.getElementById('app')! });
```

`src/app.css`:
```css
:root {
  --bg: #fbfaf7;
  --fg: #1f2a44;
  --muted: #6b7280;
  --accent: #2f6fd6;
  --correct: #1a9e4b;
  --wrong: #d03b3b;
  --card: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: var(--fg);
  background: var(--bg);
  -webkit-text-size-adjust: 100%;
}
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: var(--bg); }
button {
  font: inherit;
  font-size: 1.1rem;
  padding: 0.7rem 1.2rem;
  border-radius: 0.6rem;
  border: 1px solid #d1d5db;
  background: var(--card);
  color: var(--fg);
  min-height: 48px;
}
button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
button.big { font-size: 1.6rem; padding: 1.2rem 2.4rem; }
select, input { font: inherit; font-size: 1.1rem; min-height: 44px; }
.screen { max-width: 1100px; margin: 0 auto; padding: 1.5rem; }
.error { color: var(--wrong); }
```

`src/App.svelte` (placeholder, replaced in later tasks):
```svelte
<main class="screen">
  <h1>Piano Trainer</h1>
  <p>Scaffold running.</p>
</main>
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install -D vite@^8 svelte@^5 @sveltejs/vite-plugin-svelte@^7 typescript@~6.0 vitest@^5 svelte-check@^4 @tsconfig/svelte@^5 @vitejs/plugin-basic-ssl@^2 @types/node fake-indexeddb@^6
npm install vexflow@^5 pitchy@^4 idb@^8
```
Expected: both complete without `ERESOLVE` errors.

- [ ] **Step 3: Write the failing music-model tests**

`src/music/note.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  displayName, freqToMidi, fromMidi, midiToFreq, noteName, parseNote, pitchClass, toMidi,
} from './note';

describe('toMidi', () => {
  it('maps reference notes', () => {
    expect(toMidi(parseNote('C4'))).toBe(60);
    expect(toMidi(parseNote('A4'))).toBe(69);
    expect(toMidi(parseNote('A0'))).toBe(21);
    expect(toMidi(parseNote('C8'))).toBe(108);
  });
  it('applies accidentals, including enharmonics across octave boundaries', () => {
    expect(toMidi(parseNote('C#4'))).toBe(61);
    expect(toMidi(parseNote('Db4'))).toBe(61);
    expect(toMidi(parseNote('Cb4'))).toBe(59);
    expect(toMidi(parseNote('B#3'))).toBe(60);
  });
});

describe('parseNote / noteName', () => {
  it('round-trips', () => {
    for (const s of ['C4', 'F#5', 'Bb3', 'E2', 'G#6']) expect(noteName(parseNote(s))).toBe(s);
  });
  it('throws on invalid input', () => {
    expect(() => parseNote('H4')).toThrow();
    expect(() => parseNote('C')).toThrow();
    expect(() => parseNote('C##4')).toThrow();
  });
});

describe('fromMidi', () => {
  it('uses sharp spellings', () => {
    expect(noteName(fromMidi(60))).toBe('C4');
    expect(noteName(fromMidi(61))).toBe('C#4');
    expect(noteName(fromMidi(59))).toBe('B3');
    expect(noteName(fromMidi(70))).toBe('A#4');
  });
});

describe('pitchClass', () => {
  it('wraps to 0-11', () => {
    expect(pitchClass(60)).toBe(0);
    expect(pitchClass(71)).toBe(11);
    expect(pitchClass(-1)).toBe(11);
  });
});

describe('displayName', () => {
  it('uses musical symbols', () => {
    expect(displayName(parseNote('F#5'))).toBe('F♯5');
    expect(displayName(parseNote('Bb3'))).toBe('B♭3');
    expect(displayName(parseNote('C4'))).toBe('C4');
  });
});

describe('freqToMidi / midiToFreq', () => {
  it('converts exact pitches', () => {
    expect(freqToMidi(440)).toEqual({ midi: 69, cents: 0 });
    const c4 = freqToMidi(261.6256);
    expect(c4.midi).toBe(60);
    expect(Math.abs(c4.cents)).toBeLessThan(0.1);
  });
  it('reports cents deviation', () => {
    const r = freqToMidi(452);
    expect(r.midi).toBe(69);
    expect(r.cents).toBeCloseTo(46.6, 1);
  });
  it('respects a custom A4 reference', () => {
    const r = freqToMidi(440, 445);
    expect(r.midi).toBe(69);
    expect(r.cents).toBeCloseTo(-19.6, 1);
  });
  it('inverts', () => {
    expect(midiToFreq(69)).toBe(440);
    expect(midiToFreq(60)).toBeCloseTo(261.6256, 3);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./note`.

- [ ] **Step 5: Implement the music model**

`src/music/note.ts`:
```ts
export type Step = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type Alter = -1 | 0 | 1;
export interface Note {
  step: Step;
  alter: Alter;
  octave: number;
}

export const STEPS: Step[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

const STEP_SEMITONES: Record<Step, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const SHARP_SPELLING: [Step, Alter][] = [
  ['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0],
  ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0],
];

export function toMidi(n: Note): number {
  return (n.octave + 1) * 12 + STEP_SEMITONES[n.step] + n.alter;
}

export function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

export function fromMidi(midi: number): Note {
  const [step, alter] = SHARP_SPELLING[pitchClass(midi)];
  return { step, alter, octave: Math.floor(midi / 12) - 1 };
}

export function parseNote(s: string): Note {
  const m = /^([A-G])(#|b)?(\d)$/.exec(s);
  if (!m) throw new Error(`Invalid note: ${s}`);
  const alter: Alter = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return { step: m[1] as Step, alter, octave: Number(m[3]) };
}

export function noteName(n: Note): string {
  const acc = n.alter === 1 ? '#' : n.alter === -1 ? 'b' : '';
  return `${n.step}${acc}${n.octave}`;
}

export function displayName(n: Note): string {
  const acc = n.alter === 1 ? '♯' : n.alter === -1 ? '♭' : '';
  return `${n.step}${acc}${n.octave}`;
}

export function freqToMidi(freq: number, a4 = 440): { midi: number; cents: number } {
  const exact = 69 + 12 * Math.log2(freq / a4);
  const midi = Math.round(exact);
  return { midi, cents: (exact - midi) * 100 };
}

export function midiToFreq(midi: number, a4 = 440): number {
  return a4 * 2 ** ((midi - 69) / 12);
}
```

- [ ] **Step 6: Run tests and type check**

Run: `npm test && npm run check`
Expected: all note tests PASS; svelte-check reports 0 errors.

- [ ] **Step 7: Verify the dev server reaches the iPad**

Run: `npm run dev` (allow Node through Windows Firewall on private networks if prompted).
On the iPad (same Wi-Fi), open `https://192.168.1.240:5173` (use the Network URL Vite prints if different), accept the certificate warning ("Show Details" → "visit this website").
Expected: page shows "Piano Trainer / Scaffold running." Stop the server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + Svelte app and music model

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Staff renderer

**Files:**
- Create: `src/staff/types.ts`, `src/staff/vexKeys.ts`, `src/staff/renderStaff.ts`, `src/ui/Staff.svelte`
- Modify: `src/App.svelte` (temporary visual demo)
- Test: `src/staff/vexKeys.test.ts`

**Interfaces:**
- Consumes: `Note`, `toMidi` from `src/music/note.ts`
- Produces:
  - `type StaffClef = 'treble' | 'bass' | 'grand'`
  - `type Highlight = 'correct' | 'wrong' | 'answer' | null`
  - `interface StaffView { clef: StaffClef; notes: Note[]; highlight?: Highlight }`
  - `toVexKey(n: Note): string` (e.g. `"c#/4"`), `accidentalOf(n: Note): '#' | 'b' | null`
  - `staffForNote(n: Note): 'treble' | 'bass'` (MIDI ≥ 60 → treble)
  - `splitByStaff(view: StaffView): { treble: Note[]; bass: Note[] }`
  - `renderStaff(el: HTMLElement, view: StaffView, pixelWidth: number): void`, `staffReady: Promise<unknown>`
  - Svelte component `Staff` with prop `view: StaffView`

- [ ] **Step 1: Write the failing tests**

`src/staff/vexKeys.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseNote } from '../music/note';
import { accidentalOf, splitByStaff, staffForNote, toVexKey } from './vexKeys';

describe('toVexKey', () => {
  it('formats keys for VexFlow', () => {
    expect(toVexKey(parseNote('C4'))).toBe('c/4');
    expect(toVexKey(parseNote('C#4'))).toBe('c#/4');
    expect(toVexKey(parseNote('Bb3'))).toBe('bb/3');
  });
});

describe('accidentalOf', () => {
  it('returns the accidental glyph code or null', () => {
    expect(accidentalOf(parseNote('F#5'))).toBe('#');
    expect(accidentalOf(parseNote('Eb4'))).toBe('b');
    expect(accidentalOf(parseNote('G4'))).toBeNull();
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
    expect(splitByStaff({ clef: 'treble', notes })).toEqual({ treble: notes, bass: [] });
    expect(splitByStaff({ clef: 'bass', notes })).toEqual({ treble: [], bass: notes });
  });
  it('splits by middle C for grand staff', () => {
    expect(splitByStaff({ clef: 'grand', notes })).toEqual({ treble: [notes[1]], bass: [notes[0]] });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./vexKeys`.

- [ ] **Step 3: Implement types and pure helpers**

`src/staff/types.ts`:
```ts
import type { Note } from '../music/note';

export type StaffClef = 'treble' | 'bass' | 'grand';
export type Highlight = 'correct' | 'wrong' | 'answer' | null;

export interface StaffView {
  clef: StaffClef;
  notes: Note[];
  highlight?: Highlight;
}
```

`src/staff/vexKeys.ts`:
```ts
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
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Implement the VexFlow renderer**

`src/staff/renderStaff.ts`:
```ts
import {
  Accidental, Formatter, GhostNote, Renderer, Stave, StaveConnector, StaveNote, Voice,
  type RenderContext,
} from 'vexflow/bravura';
import { toMidi, type Note } from '../music/note';
import type { Highlight, StaffView } from './types';
import { accidentalOf, splitByStaff, toVexKey } from './vexKeys';

const LOGICAL_WIDTH = 260;

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

function buildNote(notes: Note[], clef: 'treble' | 'bass', color: string | null): StaveNote | GhostNote {
  if (notes.length === 0) return new GhostNote('w');
  const sorted = [...notes].sort((a, b) => toMidi(a) - toMidi(b));
  const sn = new StaveNote({ keys: sorted.map(toVexKey), duration: 'w', clef });
  sorted.forEach((n, i) => {
    const acc = accidentalOf(n);
    if (acc) sn.addModifier(new Accidental(acc), i);
  });
  if (color) sn.setStyle({ fillStyle: color, strokeStyle: color });
  return sn;
}

function drawNotes(ctx: RenderContext, stave: Stave, note: StaveNote | GhostNote): void {
  const voice = new Voice({ numBeats: 4, beatValue: 4 }).addTickables([note]);
  new Formatter().joinVoices([voice]).formatToStave([voice], stave);
  voice.draw(ctx, stave);
}

export function renderStaff(el: HTMLElement, view: StaffView, pixelWidth: number): void {
  el.innerHTML = '';
  const scale = pixelWidth / LOGICAL_WIDTH;
  const grand = view.clef === 'grand';
  const logicalHeight = grand ? 280 : 170;
  const renderer = new Renderer(el as HTMLDivElement, Renderer.Backends.SVG);
  renderer.resize(pixelWidth, logicalHeight * scale);
  const ctx = renderer.getContext();
  ctx.scale(scale, scale);

  const color = view.highlight ? COLORS[view.highlight] : null;
  const parts = splitByStaff(view);
  const x = 20;
  const w = LOGICAL_WIDTH - 30;

  if (grand) {
    const treble = new Stave(x, 30, w).addClef('treble');
    const bass = new Stave(x, 140, w).addClef('bass');
    treble.setContext(ctx).draw();
    bass.setContext(ctx).draw();
    new StaveConnector(treble, bass).setType('brace').setContext(ctx).draw();
    new StaveConnector(treble, bass).setType('singleLeft').setContext(ctx).draw();
    new StaveConnector(treble, bass).setType('singleRight').setContext(ctx).draw();
    drawNotes(ctx, treble, buildNote(parts.treble, 'treble', color));
    drawNotes(ctx, bass, buildNote(parts.bass, 'bass', color));
  } else {
    const clef = view.clef;
    const stave = new Stave(x, 40, w).addClef(clef);
    stave.setContext(ctx).draw();
    drawNotes(ctx, stave, buildNote(parts[clef], clef, color));
  }
}
```

`src/ui/Staff.svelte`:
```svelte
<script lang="ts">
  import { renderStaff, staffReady } from '../staff/renderStaff';
  import type { StaffView } from '../staff/types';

  let { view }: { view: StaffView } = $props();

  let el: HTMLDivElement | undefined = $state();
  let width = $state(0);
  let ready = $state(false);
  staffReady.then(() => (ready = true));

  $effect(() => {
    if (el && ready && width > 0) renderStaff(el, view, width);
  });
</script>

<div class="staff" bind:this={el} bind:clientWidth={width}></div>

<style>
  .staff { width: 100%; max-width: 900px; margin: 0 auto; }
</style>
```

- [ ] **Step 6: Temporary visual demo**

Replace `src/App.svelte`:
```svelte
<script lang="ts">
  import Staff from './ui/Staff.svelte';
  import { parseNote } from './music/note';
</script>

<main class="screen">
  <h1>Staff demo</h1>
  <Staff view={{ clef: 'treble', notes: [parseNote('F#5')] }} />
  <Staff view={{ clef: 'bass', notes: [parseNote('Bb2')], highlight: 'correct' }} />
  <Staff view={{ clef: 'grand', notes: [parseNote('E2'), parseNote('C4'), parseNote('A5')], highlight: 'answer' }} />
  <Staff view={{ clef: 'treble', notes: [parseNote('C6')], highlight: 'wrong' }} />
</main>
```

- [ ] **Step 7: Type check and visually verify**

Run: `npm run check` — expected 0 errors.
Run: `npm run dev`, open on the PC browser and the iPad.
Expected: four staves render with correct clefs; F♯5 has a sharp; B♭2 green; grand staff has a brace with E2 on bass and C4 + A5 on treble in blue; C6 red with ledger lines, not clipped at the top. If the top ledger lines clip, increase the stave `y` values / `logicalHeight` in `renderStaff.ts` and re-check.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: VexFlow staff renderer with grand staff and highlights

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Note tracker

**Files:**
- Create: `src/audio/noteTracker.ts`
- Test: `src/audio/noteTracker.test.ts`

**Interfaces:**
- Consumes: `freqToMidi` from `src/music/note.ts`
- Produces:
  - `interface PitchFrame { time: number; freq: number; clarity: number; rms: number }` (`time` in ms)
  - `interface NoteEvent { midi: number; cents: number; time: number }`
  - `interface TrackerOptions { clarityMin; stableFrames; centsTolerance; silenceRms; onsetRatio; rearmMs; tuningOffsetCents }` (all `number`)
  - `DEFAULT_TRACKER_OPTIONS: TrackerOptions`
  - `class NoteTracker { constructor(opts?: Partial<TrackerOptions>); push(f: PitchFrame): NoteEvent | null; setTuningOffset(cents: number): void; reset(): void }`

Behavior: a note is emitted once when the same MIDI (within ±`centsTolerance`) holds for `stableFrames` consecutive frames with clarity ≥ `clarityMin`. The same pitch is not emitted again until re-armed by silence (rms < `silenceRms`) or an onset (rms > previous rms × `onsetRatio`) occurring at least `rearmMs` after the last emission. A different pitch can be emitted without re-arming (legato).

- [ ] **Step 1: Write the failing tests**

`src/audio/noteTracker.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { NoteTracker, type NoteEvent, type PitchFrame } from './noteTracker';

const A4 = 440;
const B4 = 493.88;
const f = (time: number, freq: number, rms = 0.1, clarity = 0.95): PitchFrame => ({ time, freq, clarity, rms });

function run(tracker: NoteTracker, frames: PitchFrame[]): NoteEvent[] {
  return frames.map((fr) => tracker.push(fr)).filter((e): e is NoteEvent => e !== null);
}

describe('NoteTracker', () => {
  it('emits once after three stable frames', () => {
    const t = new NoteTracker();
    const events = run(t, [f(0, A4), f(16, A4), f(32, A4), f(48, A4), f(64, A4)]);
    expect(events).toHaveLength(1);
    expect(events[0].midi).toBe(69);
    expect(events[0].time).toBe(32);
  });

  it('ignores low-clarity frames', () => {
    const t = new NoteTracker();
    expect(run(t, [f(0, A4, 0.1, 0.5), f(16, A4, 0.1, 0.5), f(32, A4, 0.1, 0.5)])).toHaveLength(0);
  });

  it('ignores silent frames', () => {
    const t = new NoteTracker();
    expect(run(t, [f(0, A4, 0.001), f(16, A4, 0.001), f(32, A4, 0.001)])).toHaveLength(0);
  });

  it('rejects frames too far out of tune', () => {
    const t = new NoteTracker();
    expect(run(t, [f(0, 452), f(16, 452), f(32, 452)])).toHaveLength(0);
  });

  it('re-emits the same note after silence', () => {
    const t = new NoteTracker();
    const events = run(t, [
      f(0, A4), f(16, A4), f(32, A4),
      f(48, A4, 0.001),
      f(300, A4), f(316, A4), f(332, A4),
    ]);
    expect(events.map((e) => e.time)).toEqual([32, 332]);
  });

  it('re-emits the same note after an onset outside the rearm window', () => {
    const t = new NoteTracker();
    const events = run(t, [
      f(0, A4), f(16, A4), f(32, A4),
      f(200, A4, 0.05),
      f(216, A4, 0.2),
      f(232, A4, 0.2), f(248, A4, 0.2),
    ]);
    expect(events.map((e) => e.time)).toEqual([32, 248]);
  });

  it('ignores an onset inside the rearm window', () => {
    const t = new NoteTracker();
    const events = run(t, [
      f(0, A4), f(16, A4), f(32, A4),
      f(48, A4, 0.3), f(64, A4, 0.3), f(80, A4, 0.3),
    ]);
    expect(events).toHaveLength(1);
  });

  it('emits a new pitch without re-arming (legato)', () => {
    const t = new NoteTracker();
    const events = run(t, [f(0, A4), f(16, A4), f(32, A4), f(48, B4), f(64, B4), f(80, B4)]);
    expect(events.map((e) => e.midi)).toEqual([69, 71]);
  });

  it('applies the tuning offset', () => {
    const t = new NoteTracker({ tuningOffsetCents: 19.6 });
    const events = run(t, [f(0, 445), f(16, 445), f(32, 445)]);
    expect(events[0].midi).toBe(69);
    expect(Math.abs(events[0].cents)).toBeLessThan(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./noteTracker`.

- [ ] **Step 3: Implement**

`src/audio/noteTracker.ts`:
```ts
import { freqToMidi } from '../music/note';

export interface PitchFrame {
  time: number;
  freq: number;
  clarity: number;
  rms: number;
}

export interface NoteEvent {
  midi: number;
  cents: number;
  time: number;
}

export interface TrackerOptions {
  clarityMin: number;
  stableFrames: number;
  centsTolerance: number;
  silenceRms: number;
  onsetRatio: number;
  rearmMs: number;
  tuningOffsetCents: number;
}

export const DEFAULT_TRACKER_OPTIONS: TrackerOptions = {
  clarityMin: 0.9,
  stableFrames: 3,
  centsTolerance: 40,
  silenceRms: 0.01,
  onsetRatio: 1.5,
  rearmMs: 100,
  tuningOffsetCents: 0,
};

export class NoteTracker {
  private opts: TrackerOptions;
  private candidate: number | null = null;
  private count = 0;
  private emitted: number | null = null;
  private lastEmitTime = -Infinity;
  private prevRms = 0;

  constructor(opts: Partial<TrackerOptions> = {}) {
    this.opts = { ...DEFAULT_TRACKER_OPTIONS, ...opts };
  }

  setTuningOffset(cents: number): void {
    this.opts.tuningOffsetCents = cents;
  }

  reset(): void {
    this.candidate = null;
    this.count = 0;
    this.emitted = null;
  }

  push(f: PitchFrame): NoteEvent | null {
    const o = this.opts;
    const silent = f.rms < o.silenceRms;
    const onset = !silent && this.prevRms > 0 && f.rms > this.prevRms * o.onsetRatio;
    this.prevRms = f.rms;

    if (silent) {
      this.reset();
      return null;
    }
    if (onset && f.time - this.lastEmitTime >= o.rearmMs) this.reset();

    if (f.clarity < o.clarityMin) {
      this.candidate = null;
      this.count = 0;
      return null;
    }

    const a4 = 440 * 2 ** (o.tuningOffsetCents / 1200);
    const { midi, cents } = freqToMidi(f.freq, a4);
    if (Math.abs(cents) > o.centsTolerance) {
      this.candidate = null;
      this.count = 0;
      return null;
    }

    if (midi === this.candidate) this.count++;
    else {
      this.candidate = midi;
      this.count = 1;
    }

    if (this.count >= o.stableFrames && midi !== this.emitted) {
      this.emitted = midi;
      this.lastEmitTime = f.time;
      return { midi, cents, time: f.time };
    }
    return null;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: note tracker with stability, onset re-arm, and tuning offset

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Microphone, settings store, calibration screen — **CHECKPOINT**

**Files:**
- Create: `src/audio/calibration.ts`, `src/audio/mic.ts`, `src/audio/micErrors.ts`, `src/progress/db.ts`, `src/ui/Home.svelte`, `src/ui/Calibrate.svelte`
- Modify: `src/App.svelte` (router with home + calibrate)
- Test: `src/audio/calibration.test.ts`, `src/progress/db.test.ts`

**Interfaces:**
- Consumes: `PitchFrame`, `NoteTracker` (Task 3); `freqToMidi`, `fromMidi`, `displayName` (Task 1)
- Produces:
  - `interface CalibrationSample { freq: number; clarity: number }`
  - `computeTuningOffset(samples: CalibrationSample[], minSamples = 10): number | null` — median cents from A440 of clear samples within ±100 cents, rounded to 0.1
  - `class Mic { static open(): Promise<Mic>; onFrame: ((f: PitchFrame) => void) | null; start(): void; stop(): void; close(): Promise<void>; resume(): Promise<void>; readonly state: string }`
  - `micErrorMessage(e: unknown): string`
  - `getSetting<T>(key: string, fallback: T): Promise<T>`, `setSetting<T>(key: string, value: T): Promise<void>`
  - Setting keys: `'tuningOffsetCents'` (number)

- [ ] **Step 1: Write the failing tests**

`src/audio/calibration.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { computeTuningOffset, type CalibrationSample } from './calibration';

const many = (freq: number, n = 20, clarity = 0.95): CalibrationSample[] =>
  Array.from({ length: n }, () => ({ freq, clarity }));

describe('computeTuningOffset', () => {
  it('is zero for a piano tuned to A440', () => {
    expect(computeTuningOffset(many(440))).toBe(0);
  });
  it('measures a sharp piano', () => {
    expect(computeTuningOffset(many(445))).toBeCloseTo(19.6, 1);
  });
  it('ignores unclear samples and octave errors', () => {
    const samples = [...many(445), ...many(300, 30, 0.4), ...many(880, 5)];
    expect(computeTuningOffset(samples)).toBeCloseTo(19.6, 1);
  });
  it('returns null with too few usable samples', () => {
    expect(computeTuningOffset(many(440, 5))).toBeNull();
    expect(computeTuningOffset(many(440, 20, 0.5))).toBeNull();
  });
});
```

`src/progress/db.test.ts`:
```ts
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { getSetting, setSetting } from './db';

describe('settings store', () => {
  it('returns the fallback for a missing key', async () => {
    expect(await getSetting('missing', 42)).toBe(42);
  });
  it('round-trips values', async () => {
    await setSetting('tuningOffsetCents', 12.5);
    expect(await getSetting('tuningOffsetCents', 0)).toBe(12.5);
    await setSetting('obj', { a: [1, 2], b: 'x' });
    expect(await getSetting('obj', null)).toEqual({ a: [1, 2], b: 'x' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./calibration` and `./db`.

- [ ] **Step 3: Implement calibration and settings store**

`src/audio/calibration.ts`:
```ts
export interface CalibrationSample {
  freq: number;
  clarity: number;
}

export function computeTuningOffset(samples: CalibrationSample[], minSamples = 10): number | null {
  const cents = samples
    .filter((s) => s.clarity >= 0.9 && s.freq > 0)
    .map((s) => 1200 * Math.log2(s.freq / 440))
    .filter((c) => Math.abs(c) <= 100)
    .sort((a, b) => a - b);
  if (cents.length < minSamples) return null;
  const mid = Math.floor(cents.length / 2);
  const median = cents.length % 2 ? cents[mid] : (cents[mid - 1] + cents[mid]) / 2;
  return Math.round(median * 10) / 10;
}
```

`src/progress/db.ts`:
```ts
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'piano-trainer';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(d) {
      d.createObjectStore('kv');
    },
  });
  return dbPromise;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await (await db()).get('kv', key);
    return value === undefined ? fallback : (value as T);
  } catch {
    return fallback;
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await (await db()).put('kv', value, key);
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Implement the mic adapter and error messages**

`src/audio/micErrors.ts`:
```ts
export function micErrorMessage(e: unknown): string {
  const name = e instanceof DOMException ? e.name : '';
  if (!window.isSecureContext) return 'The microphone needs HTTPS. Open the https:// address instead.';
  if (name === 'NotAllowedError') {
    return 'Microphone access is blocked. In Safari tap "aA" → Website Settings → Microphone → Allow (or Settings → Apps → Safari → Microphone), then reload.';
  }
  if (name === 'NotFoundError') return 'No microphone was found.';
  return `Could not start the microphone (${name || String(e)}).`;
}
```

`src/audio/mic.ts`:
```ts
import { PitchDetector } from 'pitchy';
import type { PitchFrame } from './noteTracker';

const FRAME_SIZE = 2048;

export class Mic {
  onFrame: ((f: PitchFrame) => void) | null = null;

  private ctx: AudioContext;
  private stream: MediaStream;
  private analyser: AnalyserNode;
  private buf: Float32Array<ArrayBuffer>;
  private detector: PitchDetector<Float32Array<ArrayBuffer>>;
  private raf = 0;

  private constructor(ctx: AudioContext, stream: MediaStream, analyser: AnalyserNode) {
    this.ctx = ctx;
    this.stream = stream;
    this.analyser = analyser;
    this.buf = new Float32Array(FRAME_SIZE);
    this.detector = PitchDetector.forFloat32Array(FRAME_SIZE);
  }

  /** Must be called from a user tap handler (iOS requirement). */
  static async open(): Promise<Mic> {
    const ctx = new AudioContext();
    void ctx.resume();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      await ctx.close();
      throw e;
    }
    await ctx.resume();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = FRAME_SIZE;
    source.connect(analyser);
    return new Mic(ctx, stream, analyser);
  }

  get state(): string {
    return this.ctx.state;
  }

  async resume(): Promise<void> {
    await this.ctx.resume();
  }

  start(): void {
    const loop = () => {
      this.analyser.getFloatTimeDomainData(this.buf);
      let sum = 0;
      for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i];
      const rms = Math.sqrt(sum / this.buf.length);
      const [freq, clarity] = this.detector.findPitch(this.buf, this.ctx.sampleRate);
      this.onFrame?.({ time: performance.now(), freq, clarity, rms });
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  async close(): Promise<void> {
    this.stop();
    this.stream.getTracks().forEach((t) => t.stop());
    if (this.ctx.state !== 'closed') await this.ctx.close();
  }
}
```
If `npm run check` rejects the `PitchDetector<...>` generic or `Float32Array<ArrayBuffer>` annotations, simplify to `private buf: Float32Array` and `private detector: PitchDetector<Float32Array>` (match whatever pitchy's `.d.ts` declares).

- [ ] **Step 6: Implement Home and Calibrate screens and the router**

`src/ui/Home.svelte`:
```svelte
<script lang="ts">
  let { tuningOffset, onDrill, onCalibrate }: {
    tuningOffset: number;
    onDrill: (() => void) | null;
    onCalibrate: () => void;
  } = $props();
</script>

<main class="screen home">
  <h1>Piano Trainer</h1>
  <div class="actions">
    {#if onDrill}<button class="primary big" onclick={onDrill}>Note reading</button>{/if}
    <button onclick={onCalibrate}>Calibrate &amp; mic test</button>
  </div>
  <p class="tuning">Tuning: {tuningOffset === 0 ? 'A440' : `${tuningOffset > 0 ? '+' : ''}${tuningOffset} cents`}</p>
</main>

<style>
  .actions { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
  .tuning { color: var(--muted); }
</style>
```

`src/ui/Calibrate.svelte`:
```svelte
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Mic } from '../audio/mic';
  import { micErrorMessage } from '../audio/micErrors';
  import { NoteTracker, type PitchFrame } from '../audio/noteTracker';
  import { computeTuningOffset, type CalibrationSample } from '../audio/calibration';
  import { displayName, freqToMidi, fromMidi } from '../music/note';
  import { setSetting } from '../progress/db';

  let { tuningOffset, onTuningChange, onBack }: {
    tuningOffset: number;
    onTuningChange: (cents: number) => void;
    onBack: () => void;
  } = $props();

  let mic: Mic | null = null;
  const tracker = new NoteTracker();
  let running = $state(false);
  let error = $state('');
  let frame: PitchFrame | null = $state(null);
  let heard: string[] = $state([]);
  let calibrating = $state(false);
  let calMessage = $state('');
  let samples: CalibrationSample[] = [];

  const live = $derived(
    frame && frame.clarity >= 0.9 && frame.rms >= 0.01
      ? freqToMidi(frame.freq, 440 * 2 ** (tuningOffset / 1200))
      : null,
  );

  async function startMic() {
    error = '';
    try {
      mic = await Mic.open();
    } catch (e) {
      error = micErrorMessage(e);
      return;
    }
    tracker.setTuningOffset(tuningOffset);
    mic.onFrame = (f) => {
      frame = f;
      if (calibrating) samples.push({ freq: f.freq, clarity: f.clarity });
      const ev = tracker.push(f);
      if (ev) heard = [displayName(fromMidi(ev.midi)), ...heard].slice(0, 8);
    };
    mic.start();
    running = true;
  }

  function calibrate() {
    samples = [];
    calibrating = true;
    calMessage = 'Play and hold A4 (the A above middle C)…';
    setTimeout(async () => {
      calibrating = false;
      const offset = computeTuningOffset(samples);
      if (offset === null) {
        calMessage = "Couldn't hear a steady A4. Try again, a little louder.";
        return;
      }
      await setSetting('tuningOffsetCents', offset);
      tracker.setTuningOffset(offset);
      onTuningChange(offset);
      calMessage = `Saved: your piano is ${offset >= 0 ? '+' : ''}${offset} cents from A440.`;
    }, 2500);
  }

  async function resetTuning() {
    await setSetting('tuningOffsetCents', 0);
    tracker.setTuningOffset(0);
    onTuningChange(0);
    calMessage = 'Reset to A440.';
  }

  onDestroy(() => {
    void mic?.close();
  });
</script>

<main class="screen">
  <button onclick={onBack}>← Back</button>
  <h1>Calibrate &amp; mic test</h1>

  {#if !running}
    <button class="primary big" onclick={startMic}>Start microphone</button>
    {#if error}<p class="error">{error}</p>{/if}
  {:else}
    <div class="level"><div style="width: {Math.min(100, (frame?.rms ?? 0) * 400)}%"></div></div>
    <p class="live">
      {#if live}
        <strong>{displayName(fromMidi(live.midi))}</strong>
        <span>{live.cents >= 0 ? '+' : ''}{live.cents.toFixed(0)}¢</span>
      {:else}
        <span class="muted">—</span>
      {/if}
    </p>
    <p class="muted">
      freq {frame?.freq.toFixed(1) ?? '–'} Hz · clarity {frame?.clarity.toFixed(2) ?? '–'} · level {frame?.rms.toFixed(3) ?? '–'}
    </p>
    <p>Detected notes: {heard.join('  ') || '(play something)'}</p>

    <div class="actions">
      <button class="primary" onclick={calibrate} disabled={calibrating}>Calibrate with A4</button>
      <button onclick={resetTuning}>Reset to A440</button>
    </div>
    {#if calMessage}<p>{calMessage}</p>{/if}
  {/if}
</main>

<style>
  .level { height: 14px; background: #e5e7eb; border-radius: 7px; overflow: hidden; margin: 1rem 0; }
  .level div { height: 100%; background: var(--correct); transition: width 60ms linear; }
  .live { font-size: 3rem; margin: 0.5rem 0; display: flex; gap: 1rem; align-items: baseline; }
  .live span { font-size: 1.5rem; color: var(--muted); }
  .muted { color: var(--muted); }
  .actions { display: flex; gap: 1rem; }
</style>
```

Replace `src/App.svelte`:
```svelte
<script lang="ts">
  import Home from './ui/Home.svelte';
  import Calibrate from './ui/Calibrate.svelte';
  import { getSetting } from './progress/db';

  type Screen = { name: 'home' } | { name: 'calibrate' };

  let screen: Screen = $state({ name: 'home' });
  let tuningOffset = $state(0);
  getSetting('tuningOffsetCents', 0).then((v) => (tuningOffset = v));
</script>

{#if screen.name === 'home'}
  <Home {tuningOffset} onDrill={null} onCalibrate={() => (screen = { name: 'calibrate' })} />
{:else if screen.name === 'calibrate'}
  <Calibrate
    {tuningOffset}
    onTuningChange={(c) => (tuningOffset = c)}
    onBack={() => (screen = { name: 'home' })}
  />
{/if}
```

- [ ] **Step 7: Type check**

Run: `npm test && npm run check`
Expected: tests PASS, 0 type errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: mic adapter, settings store, and calibration screen

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 9: CHECKPOINT — verify on the real piano (user)**

Run `npm run dev`; on the iPad open the HTTPS URL → Calibrate & mic test → Start microphone (allow mic).
The user checks, with the iPad on the music stand:
1. Live readout shows the correct note for single notes across C3–C6.
2. Low notes (C2–B2): note whether the reading jumps an octave.
3. Repeated same note (C4 C4 C4) appears three times in "Detected notes".
4. A fast scale C4–C5 appears with no missing or extra notes.
5. Calibrate with A4 gives a plausible offset (typically within ±30 cents).

**STOP here and report results to the user.** If detection is poor, tune `DEFAULT_TRACKER_OPTIONS` (clarityMin, stableFrames, onsetRatio, silenceRms) before continuing. Do not proceed to Task 5 without the user's go-ahead.

---

### Task 5: Drill engine — note-reading exercise

**Files:**
- Create: `src/drill/random.ts`, `src/drill/types.ts`, `src/drill/noteReading.ts`
- Test: `src/drill/random.test.ts`, `src/drill/noteReading.test.ts`

**Interfaces:**
- Consumes: `Note`, `Alter`, `STEPS`, `toMidi`, `parseNote`, `noteName`, `pitchClass` (Task 1); `StaffClef` (Task 2)
- Produces:
  - `type Rng = () => number`; `weightedPick<T>(items: T[], weight: (item: T) => number, rng: Rng): T`; `seededRng(seed: number): Rng`
  - `interface Question { itemKey: string; notes: Note[]; clef: StaffClef }`
  - `interface HeardNote { midi: number; time: number }`
  - `type CheckResult = 'correct' | 'wrong'`
  - `interface Exercise { nextQuestion(weights: ReadonlyMap<string, number>, rng: Rng, previous: Question | null): Question; check(q: Question, heard: HeardNote): CheckResult }`
  - `type MissMode = 'retry' | 'move-on'`; `type SessionLength = 10 | 20 | 50 | 'endless'`
  - `interface QuestionLogEntry { itemKey: string; firstTryCorrect: boolean; misses: number; responseMs: number; askedAt: number }`
  - `interface NoteReadingSettings { clef: StaffClef; low: string; high: string; accidentals: boolean; anyOctave: boolean }`
  - `DEFAULT_NOTE_READING: NoteReadingSettings`; `CLEF_DEFAULT_RANGES: Record<StaffClef, { low: string; high: string }>`
  - `candidateNotes(s: NoteReadingSettings): Note[]` (excludes E♯, F♭, B♯, C♭)
  - `createNoteReading(s: NoteReadingSettings): Exercise` (throws if the pool is empty)

- [ ] **Step 1: Write the failing tests**

`src/drill/random.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { seededRng, weightedPick } from './random';

describe('weightedPick', () => {
  const items = ['a', 'b'];
  const w = (x: string) => (x === 'a' ? 1 : 3);
  it('selects by cumulative weight', () => {
    expect(weightedPick(items, w, () => 0)).toBe('a');
    expect(weightedPick(items, w, () => 0.2)).toBe('a');
    expect(weightedPick(items, w, () => 0.3)).toBe('b');
    expect(weightedPick(items, w, () => 0.9999)).toBe('b');
  });
  it('never picks zero-weight items', () => {
    const rng = seededRng(1);
    for (let i = 0; i < 100; i++) expect(weightedPick(items, (x) => (x === 'a' ? 0 : 1), rng)).toBe('b');
  });
});

describe('seededRng', () => {
  it('is deterministic and in [0, 1)', () => {
    const a = seededRng(42), b = seededRng(42);
    for (let i = 0; i < 50; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});
```

`src/drill/noteReading.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { noteName, parseNote } from '../music/note';
import { seededRng } from './random';
import { candidateNotes, createNoteReading, DEFAULT_NOTE_READING, type NoteReadingSettings } from './noteReading';

const settings = (over: Partial<NoteReadingSettings> = {}): NoteReadingSettings => ({ ...DEFAULT_NOTE_READING, ...over });
const noWeights = new Map<string, number>();

describe('candidateNotes', () => {
  it('lists naturals in range, inclusive', () => {
    expect(candidateNotes(settings({ low: 'C4', high: 'C5' })).map(noteName))
      .toEqual(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']);
  });
  it('adds sharps and flats but skips E#, Fb, B#, Cb', () => {
    expect(candidateNotes(settings({ low: 'C4', high: 'E4', accidentals: true })).map(noteName))
      .toEqual(['C4', 'C#4', 'Db4', 'D4', 'D#4', 'Eb4', 'E4']);
  });
});

describe('createNoteReading', () => {
  it('throws when the range is empty', () => {
    expect(() => createNoteReading(settings({ low: 'C5', high: 'C4' }))).toThrow();
  });

  it('asks single notes on the configured clef', () => {
    const ex = createNoteReading(settings({ clef: 'grand', low: 'C3', high: 'C5' }));
    const q = ex.nextQuestion(noWeights, seededRng(1), null);
    expect(q.notes).toHaveLength(1);
    expect(q.clef).toBe('grand');
    expect(q.itemKey).toBe(noteName(q.notes[0]));
  });

  it('never repeats the previous item', () => {
    const ex = createNoteReading(settings({ low: 'C4', high: 'D4' }));
    const rng = seededRng(7);
    let prev = ex.nextQuestion(noWeights, rng, null);
    for (let i = 0; i < 20; i++) {
      const q = ex.nextQuestion(noWeights, rng, prev);
      expect(q.itemKey).not.toBe(prev.itemKey);
      prev = q;
    }
  });

  it('favors items with more misses', () => {
    const ex = createNoteReading(settings({ low: 'C4', high: 'G4' }));
    const rng = seededRng(3);
    const weights = new Map([['D4', 10]]);
    let d4 = 0;
    for (let i = 0; i < 200; i++) if (ex.nextQuestion(weights, rng, null).itemKey === 'D4') d4++;
    expect(d4).toBeGreaterThan(150);
  });

  it('checks exact pitch by default', () => {
    const ex = createNoteReading(settings());
    const q = { itemKey: 'C4', notes: [parseNote('C4')], clef: 'treble' as const };
    expect(ex.check(q, { midi: 60, time: 0 })).toBe('correct');
    expect(ex.check(q, { midi: 72, time: 0 })).toBe('wrong');
    expect(ex.check(q, { midi: 62, time: 0 })).toBe('wrong');
  });

  it('accepts any octave when enabled', () => {
    const ex = createNoteReading(settings({ anyOctave: true }));
    const q = { itemKey: 'C4', notes: [parseNote('C4')], clef: 'treble' as const };
    expect(ex.check(q, { midi: 48, time: 0 })).toBe('correct');
    expect(ex.check(q, { midi: 61, time: 0 })).toBe('wrong');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./random` and `./noteReading`.

- [ ] **Step 3: Implement**

`src/drill/random.ts`:
```ts
export type Rng = () => number;

export function weightedPick<T>(items: T[], weight: (item: T) => number, rng: Rng): T {
  const ws = items.map(weight);
  const total = ws.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r < 0) return items[i];
  }
  for (let i = items.length - 1; i >= 0; i--) if (ws[i] > 0) return items[i];
  return items[items.length - 1];
}

/** mulberry32 — small deterministic PRNG for tests. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

`src/drill/types.ts`:
```ts
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
```

`src/drill/noteReading.ts`:
```ts
import { noteName, parseNote, pitchClass, STEPS, toMidi, type Alter, type Note } from '../music/note';
import type { StaffClef } from '../staff/types';
import { weightedPick } from './random';
import type { Exercise } from './types';

export interface NoteReadingSettings {
  clef: StaffClef;
  low: string;
  high: string;
  accidentals: boolean;
  anyOctave: boolean;
}

export const CLEF_DEFAULT_RANGES: Record<StaffClef, { low: string; high: string }> = {
  treble: { low: 'C4', high: 'G5' },
  bass: { low: 'E2', high: 'C4' },
  grand: { low: 'C3', high: 'C5' },
};

export const DEFAULT_NOTE_READING: NoteReadingSettings = {
  clef: 'treble',
  ...CLEF_DEFAULT_RANGES.treble,
  accidentals: false,
  anyOctave: false,
};

function isAwkward(n: Note): boolean {
  return (n.alter === 1 && (n.step === 'E' || n.step === 'B')) ||
    (n.alter === -1 && (n.step === 'F' || n.step === 'C'));
}

export function candidateNotes(s: NoteReadingSettings): Note[] {
  const lo = toMidi(parseNote(s.low));
  const hi = toMidi(parseNote(s.high));
  const alters: Alter[] = s.accidentals ? [-1, 0, 1] : [0];
  const out: Note[] = [];
  for (let octave = 0; octave <= 8; octave++) {
    for (const step of STEPS) {
      for (const alter of alters) {
        const n: Note = { step, alter, octave };
        const m = toMidi(n);
        if (m >= lo && m <= hi && !isAwkward(n)) out.push(n);
      }
    }
  }
  return out;
}

export function createNoteReading(s: NoteReadingSettings): Exercise {
  const pool = candidateNotes(s);
  if (pool.length === 0) throw new Error('No notes in the selected range');
  return {
    nextQuestion(weights, rng, previous) {
      const choices = previous && pool.length > 1 ? pool.filter((n) => noteName(n) !== previous.itemKey) : pool;
      const note = weightedPick(choices, (n) => 1 + 3 * (weights.get(noteName(n)) ?? 0), rng);
      return { itemKey: noteName(note), notes: [note], clef: s.clef };
    },
    check(q, heard) {
      const target = toMidi(q.notes[0]);
      const ok = s.anyOctave ? pitchClass(heard.midi) === pitchClass(target) : heard.midi === target;
      return ok ? 'correct' : 'wrong';
    },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: note-reading exercise with weighted question selection

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Drill session state machine

**Files:**
- Create: `src/drill/session.ts`, `src/drill/config.ts`
- Test: `src/drill/session.test.ts`

**Interfaces:**
- Consumes: `Exercise`, `Question`, `HeardNote`, `MissMode`, `SessionLength`, `QuestionLogEntry` (Task 5); `Rng`; `NoteReadingSettings`, `DEFAULT_NOTE_READING`
- Produces:
  - `type SessionState = 'idle' | 'asking' | 'answered' | 'revealing' | 'done'`
  - `interface SessionOptions { length: SessionLength; missMode: MissMode; weighting: boolean }`
  - `interface SessionStats { asked: number; correct: number; accuracy: number; avgResponseMs: number; bestRun: number }`
  - `class DrillSession { constructor(exercise: Exercise, opts: SessionOptions, rng?: Rng, now?: () => number); state: SessionState; current: Question | null; readonly log: QuestionLogEntry[]; start(): void; hear(h: HeardNote): 'correct' | 'wrong' | 'ignored'; advance(): void; finish(): void; stats(): SessionStats }`
  - `interface DrillConfig { exercise: NoteReadingSettings; session: SessionOptions }`, `DEFAULT_DRILL_CONFIG: DrillConfig`

Semantics:
- `start()` asks the first question (state `asking`).
- `hear` is ignored unless `asking`. Correct → log entry, state `answered`; if first try, decrement that item's miss weight (min 0). Wrong → increment the item's miss weight and `currentMisses`; in `retry` stay `asking`; in `move-on` log the entry and go to `revealing`.
- `advance()` from `answered`/`revealing`: if fixed length reached → `done`, else ask next.
- Weights passed to the exercise are the miss map when `weighting` is on, otherwise an empty map.
- `stats().correct` = entries with `firstTryCorrect`; `bestRun` = longest consecutive run of first-try correct.

- [ ] **Step 1: Write the failing tests**

`src/drill/session.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { DrillSession, type SessionOptions } from './session';
import type { Exercise, Question } from './types';

function fakeExercise() {
  let i = 0;
  const seenWeights: Map<string, number>[] = [];
  const ex: Exercise = {
    nextQuestion(weights) {
      seenWeights.push(new Map(weights));
      return { itemKey: `q${i++}`, notes: [], clef: 'treble' } satisfies Question;
    },
    check: (_q, h) => (h.midi === 60 ? 'correct' : 'wrong'),
  };
  return { ex, seenWeights };
}

const RIGHT = { midi: 60, time: 0 };
const WRONG = { midi: 61, time: 0 };
const opts = (o: Partial<SessionOptions> = {}): SessionOptions => ({ length: 10, missMode: 'retry', weighting: true, ...o });

describe('DrillSession', () => {
  it('starts by asking the first question', () => {
    const s = new DrillSession(fakeExercise().ex, opts());
    expect(s.state).toBe('idle');
    s.start();
    expect(s.state).toBe('asking');
    expect(s.current?.itemKey).toBe('q0');
  });

  it('records a first-try correct answer and advances', () => {
    let t = 1000;
    const s = new DrillSession(fakeExercise().ex, opts(), Math.random, () => t);
    s.start();
    t = 1800;
    expect(s.hear(RIGHT)).toBe('correct');
    expect(s.state).toBe('answered');
    expect(s.log).toEqual([{ itemKey: 'q0', firstTryCorrect: true, misses: 0, responseMs: 800, askedAt: 1000 }]);
    s.advance();
    expect(s.state).toBe('asking');
    expect(s.current?.itemKey).toBe('q1');
  });

  it('retry mode keeps the question until correct and counts the miss', () => {
    const s = new DrillSession(fakeExercise().ex, opts({ missMode: 'retry' }));
    s.start();
    expect(s.hear(WRONG)).toBe('wrong');
    expect(s.state).toBe('asking');
    expect(s.current?.itemKey).toBe('q0');
    expect(s.log).toHaveLength(0);
    expect(s.hear(RIGHT)).toBe('correct');
    expect(s.log[0]).toMatchObject({ itemKey: 'q0', firstTryCorrect: false, misses: 1 });
  });

  it('move-on mode reveals after one miss and ignores input while revealing', () => {
    const s = new DrillSession(fakeExercise().ex, opts({ missMode: 'move-on' }));
    s.start();
    expect(s.hear(WRONG)).toBe('wrong');
    expect(s.state).toBe('revealing');
    expect(s.log[0]).toMatchObject({ firstTryCorrect: false, misses: 1 });
    expect(s.hear(RIGHT)).toBe('ignored');
    s.advance();
    expect(s.current?.itemKey).toBe('q1');
  });

  it('ends after a fixed number of questions', () => {
    const s = new DrillSession(fakeExercise().ex, opts({ length: 10 }));
    s.start();
    for (let i = 0; i < 10; i++) {
      s.hear(RIGHT);
      s.advance();
    }
    expect(s.state).toBe('done');
    expect(s.log).toHaveLength(10);
    expect(s.hear(RIGHT)).toBe('ignored');
  });

  it('endless mode continues until finish()', () => {
    const s = new DrillSession(fakeExercise().ex, opts({ length: 'endless' }));
    s.start();
    for (let i = 0; i < 60; i++) {
      s.hear(RIGHT);
      s.advance();
    }
    expect(s.state).toBe('asking');
    s.finish();
    expect(s.state).toBe('done');
  });

  it('passes miss weights to the exercise when weighting is on', () => {
    const { ex, seenWeights } = fakeExercise();
    const s = new DrillSession(ex, opts({ missMode: 'retry' }));
    s.start();
    s.hear(WRONG);
    s.hear(WRONG);
    s.hear(RIGHT);
    s.advance();
    expect(seenWeights[1].get('q0')).toBe(2);
  });

  it('counts a move-on miss in the weights', () => {
    const { ex, seenWeights } = fakeExercise();
    const s = new DrillSession(ex, opts({ missMode: 'move-on' }));
    s.start();
    s.hear(WRONG);
    s.advance();
    expect(seenWeights[1].get('q0')).toBe(1);
  });

  it('reduces an item weight after a later first-try correct answer', () => {
    const q: Question = { itemKey: 'same', notes: [], clef: 'treble' };
    const seen: Map<string, number>[] = [];
    const ex: Exercise = {
      nextQuestion(weights) { seen.push(new Map(weights)); return q; },
      check: (_q, h) => (h.midi === 60 ? 'correct' : 'wrong'),
    };
    const s = new DrillSession(ex, opts({ missMode: 'move-on', length: 'endless' }));
    s.start();
    s.hear(WRONG);
    s.advance();
    s.hear(WRONG);
    s.advance();
    expect(seen[2].get('same')).toBe(2);
    s.hear(RIGHT);
    s.advance();
    expect(seen[3].get('same')).toBe(1);
  });

  it('passes empty weights when weighting is off', () => {
    const { ex, seenWeights } = fakeExercise();
    const s = new DrillSession(ex, opts({ weighting: false }));
    s.start();
    s.hear(WRONG);
    s.hear(RIGHT);
    s.advance();
    expect(seenWeights[1].size).toBe(0);
  });

  it('computes stats', () => {
    let t = 0;
    const s = new DrillSession(fakeExercise().ex, opts({ missMode: 'move-on', length: 'endless' }), Math.random, () => t);
    s.start();
    const answers = [RIGHT, RIGHT, WRONG, RIGHT, RIGHT, RIGHT];
    for (const a of answers) {
      t += 1000;
      s.hear(a);
      s.advance();
    }
    expect(s.stats()).toEqual({ asked: 6, correct: 5, accuracy: 5 / 6, avgResponseMs: 1000, bestRun: 3 });
  });

  it('returns zeroed stats with no answers', () => {
    const s = new DrillSession(fakeExercise().ex, opts());
    expect(s.stats()).toEqual({ asked: 0, correct: 0, accuracy: 0, avgResponseMs: 0, bestRun: 0 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./session`.

- [ ] **Step 3: Implement**

`src/drill/session.ts`:
```ts
import type { Rng } from './random';
import type { Exercise, HeardNote, MissMode, Question, QuestionLogEntry, SessionLength } from './types';

export type SessionState = 'idle' | 'asking' | 'answered' | 'revealing' | 'done';

export interface SessionOptions {
  length: SessionLength;
  missMode: MissMode;
  weighting: boolean;
}

export interface SessionStats {
  asked: number;
  correct: number;
  accuracy: number;
  avgResponseMs: number;
  bestRun: number;
}

export class DrillSession {
  state: SessionState = 'idle';
  current: Question | null = null;
  readonly log: QuestionLogEntry[] = [];

  private exercise: Exercise;
  private opts: SessionOptions;
  private rng: Rng;
  private now: () => number;
  private missWeights = new Map<string, number>();
  private currentMisses = 0;
  private askedAt = 0;

  constructor(exercise: Exercise, opts: SessionOptions, rng: Rng = Math.random, now: () => number = () => Date.now()) {
    this.exercise = exercise;
    this.opts = opts;
    this.rng = rng;
    this.now = now;
  }

  start(): void {
    this.ask();
  }

  hear(h: HeardNote): 'correct' | 'wrong' | 'ignored' {
    if (this.state !== 'asking' || !this.current) return 'ignored';
    const key = this.current.itemKey;

    if (this.exercise.check(this.current, h) === 'correct') {
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

  advance(): void {
    if (this.state !== 'answered' && this.state !== 'revealing') return;
    if (this.opts.length !== 'endless' && this.log.length >= this.opts.length) {
      this.state = 'done';
      return;
    }
    this.ask();
  }

  finish(): void {
    this.state = 'done';
  }

  stats(): SessionStats {
    const asked = this.log.length;
    let correct = 0;
    let run = 0;
    let bestRun = 0;
    let totalMs = 0;
    for (const e of this.log) {
      totalMs += e.responseMs;
      if (e.firstTryCorrect) {
        correct++;
        run++;
        bestRun = Math.max(bestRun, run);
      } else {
        run = 0;
      }
    }
    return {
      asked,
      correct,
      accuracy: asked ? correct / asked : 0,
      avgResponseMs: asked ? totalMs / asked : 0,
      bestRun,
    };
  }

  private ask(): void {
    const weights = this.opts.weighting ? this.missWeights : new Map<string, number>();
    this.current = this.exercise.nextQuestion(weights, this.rng, this.current);
    this.currentMisses = 0;
    this.askedAt = this.now();
    this.state = 'asking';
  }

  private record(): void {
    this.log.push({
      itemKey: this.current!.itemKey,
      firstTryCorrect: this.currentMisses === 0,
      misses: this.currentMisses,
      responseMs: this.now() - this.askedAt,
      askedAt: this.askedAt,
    });
  }
}
```

Note: the weighting test `'passes miss weights…'` expects `seenWeights[1]` to be a snapshot — `fakeExercise` copies the map with `new Map(weights)`, so passing the live map is fine.

`src/drill/config.ts`:
```ts
import { DEFAULT_NOTE_READING, type NoteReadingSettings } from './noteReading';
import type { SessionOptions } from './session';

export interface DrillConfig {
  exercise: NoteReadingSettings;
  session: SessionOptions;
}

export const DEFAULT_DRILL_CONFIG: DrillConfig = {
  exercise: DEFAULT_NOTE_READING,
  session: { length: 20, missMode: 'retry', weighting: true },
};
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: drill session with miss modes, lengths, weighting, and stats

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Drill UI — setup, drill, results

**Files:**
- Create: `src/ui/DrillSetup.svelte`, `src/ui/Drill.svelte`, `src/ui/Results.svelte`
- Modify: `src/App.svelte`

**Interfaces:**
- Consumes: everything above. Setting key `'noteReadingSetup'` (a `DrillConfig`).
- Produces: complete user flow Home → Setup → Drill → Results.

- [ ] **Step 1: Write the setup screen**

`src/ui/DrillSetup.svelte`:
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { DEFAULT_DRILL_CONFIG, type DrillConfig } from '../drill/config';
  import { candidateNotes, CLEF_DEFAULT_RANGES } from '../drill/noteReading';
  import { parseNote, STEPS, toMidi } from '../music/note';
  import { getSetting, setSetting } from '../progress/db';
  import type { StaffClef } from '../staff/types';
  import type { MissMode, SessionLength } from '../drill/types';

  let { onStart, onBack }: { onStart: (c: DrillConfig) => void; onBack: () => void } = $props();

  let config: DrillConfig = $state(structuredClone(DEFAULT_DRILL_CONFIG));
  onMount(async () => {
    const saved = await getSetting<DrillConfig | null>('noteReadingSetup', null);
    if (saved) config = { exercise: { ...DEFAULT_DRILL_CONFIG.exercise, ...saved.exercise }, session: { ...DEFAULT_DRILL_CONFIG.session, ...saved.session } };
  });

  const RANGE_NOTES: string[] = [];
  for (let o = 1; o <= 6; o++) for (const s of STEPS) RANGE_NOTES.push(`${s}${o}`);
  RANGE_NOTES.push('C7');

  const CLEFS: { value: StaffClef; label: string }[] = [
    { value: 'treble', label: 'Treble' },
    { value: 'bass', label: 'Bass' },
    { value: 'grand', label: 'Grand staff' },
  ];
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

  const poolSize = $derived(
    toMidi(parseNote(config.exercise.low)) <= toMidi(parseNote(config.exercise.high))
      ? candidateNotes(config.exercise).length
      : 0,
  );

  function setClef(c: StaffClef) {
    config.exercise.clef = c;
    config.exercise.low = CLEF_DEFAULT_RANGES[c].low;
    config.exercise.high = CLEF_DEFAULT_RANGES[c].high;
  }

  async function start() {
    const snap = $state.snapshot(config) as DrillConfig;
    await setSetting('noteReadingSetup', snap).catch(() => undefined);
    onStart(snap);
  }
</script>

<main class="screen">
  <button onclick={onBack}>← Back</button>
  <h1>Note reading</h1>

  <section>
    <h2>Clef</h2>
    <div class="seg">
      {#each CLEFS as c}
        <button class:selected={config.exercise.clef === c.value} onclick={() => setClef(c.value)}>{c.label}</button>
      {/each}
    </div>
  </section>

  <section>
    <h2>Range</h2>
    <label>From <select bind:value={config.exercise.low}>{#each RANGE_NOTES as n}<option value={n}>{n}</option>{/each}</select></label>
    <label>to <select bind:value={config.exercise.high}>{#each RANGE_NOTES as n}<option value={n}>{n}</option>{/each}</select></label>
    <span class="muted">{poolSize} notes</span>
    <label class="check"><input type="checkbox" bind:checked={config.exercise.accidentals} /> Sharps &amp; flats</label>
    <label class="check"><input type="checkbox" bind:checked={config.exercise.anyOctave} /> Accept any octave</label>
  </section>

  <section>
    <h2>Length</h2>
    <div class="seg">
      {#each LENGTHS as l}
        <button class:selected={config.session.length === l.value} onclick={() => (config.session.length = l.value)}>{l.label}</button>
      {/each}
    </div>
  </section>

  <section>
    <h2>On a wrong note</h2>
    <div class="seg">
      {#each MISS_MODES as m}
        <button class:selected={config.session.missMode === m.value} onclick={() => (config.session.missMode = m.value)}>{m.label}</button>
      {/each}
    </div>
    <label class="check"><input type="checkbox" bind:checked={config.session.weighting} /> Repeat notes I miss more often</label>
  </section>

  <button class="primary big" disabled={poolSize === 0} onclick={start}>Start</button>
</main>

<style>
  section { margin: 1.25rem 0; }
  h2 { font-size: 1rem; color: var(--muted); margin: 0 0 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .seg { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .seg button.selected { background: var(--fg); color: #fff; border-color: var(--fg); }
  label { margin-right: 1rem; }
  label.check { display: inline-flex; align-items: center; gap: 0.4rem; margin-top: 0.75rem; }
  input[type='checkbox'] { width: 24px; height: 24px; min-height: 0; }
  .muted { color: var(--muted); }
</style>
```

- [ ] **Step 2: Write the drill screen**

`src/ui/Drill.svelte`:
```svelte
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Staff from './Staff.svelte';
  import { Mic } from '../audio/mic';
  import { micErrorMessage } from '../audio/micErrors';
  import { NoteTracker } from '../audio/noteTracker';
  import type { DrillConfig } from '../drill/config';
  import { createNoteReading } from '../drill/noteReading';
  import { DrillSession, type SessionStats } from '../drill/session';
  import { displayName, fromMidi } from '../music/note';
  import type { StaffView } from '../staff/types';

  let { config, tuningOffset, onFinish, onExit }: {
    config: DrillConfig;
    tuningOffset: number;
    onFinish: (stats: SessionStats) => void;
    onExit: () => void;
  } = $props();

  const SILENCE_HINT_MS = 5000;

  // Config and tuning are fixed for the lifetime of a drill.
  const session = new DrillSession(createNoteReading(config.exercise), config.session);
  const tracker = new NoteTracker({ tuningOffsetCents: tuningOffset });
  const lengthLabel = config.session.length === 'endless' ? '' : ` / ${config.session.length}`;

  let mic: Mic | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastSound = 0;

  let started = $state(false);
  let suspended = $state(false);
  let error = $state('');
  let view: StaffView | null = $state(null);
  let feedback: 'correct' | 'wrong' | null = $state(null);
  let message = $state('');
  let correct = $state(0);
  let answered = $state(0);
  let level = $state(0);
  let silentHint = $state(false);

  function showQuestion() {
    const q = session.current!;
    view = { clef: q.clef, notes: q.notes, highlight: null };
    feedback = null;
    message = '';
  }

  function syncScore() {
    const s = session.stats();
    correct = s.correct;
    answered = s.asked;
  }

  async function start() {
    error = '';
    try {
      mic = await Mic.open();
    } catch (e) {
      error = micErrorMessage(e);
      return;
    }
    mic.onFrame = (f) => {
      level = f.rms;
      if (f.rms >= 0.01) {
        lastSound = f.time;
        silentHint = false;
      } else if (session.state === 'asking' && f.time - lastSound > SILENCE_HINT_MS) {
        silentHint = true;
      }
      const ev = tracker.push(f);
      if (ev) onNote(ev.midi, ev.time);
    };
    session.start();
    showQuestion();
    lastSound = performance.now();
    mic.start();
    started = true;
  }

  function onNote(midi: number, time: number) {
    const q = session.current;
    const result = session.hear({ midi, time });
    if (result === 'ignored' || !q || !view) return;
    syncScore();
    const played = displayName(fromMidi(midi));

    if (result === 'correct') {
      feedback = 'correct';
      message = '';
      view = { ...view, highlight: 'correct' };
      timer = setTimeout(next, 450);
    } else if (session.state === 'revealing') {
      feedback = 'wrong';
      message = `You played ${played}. Answer: ${displayName(q.notes[0])}`;
      view = { ...view, highlight: 'answer' };
      timer = setTimeout(next, 1500);
    } else {
      feedback = 'wrong';
      message = `You played ${played}. Try again.`;
      view = { ...view, highlight: 'wrong' };
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (session.state === 'asking' && view) {
          feedback = null;
          view = { ...view, highlight: null };
        }
      }, 500);
    }
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
    void mic?.close();
    mic = null;
    const stats = session.stats();
    if (stats.asked === 0) onExit();
    else onFinish(stats);
  }

  function onVisibility() {
    if (document.visibilityState === 'visible' && mic && mic.state !== 'running') suspended = true;
  }

  async function resume() {
    await mic?.resume();
    tracker.reset();
    lastSound = performance.now();
    suspended = false;
  }

  onMount(() => document.addEventListener('visibilitychange', onVisibility));
  onDestroy(() => {
    document.removeEventListener('visibilitychange', onVisibility);
    clearTimeout(timer);
    void mic?.close();
  });
</script>

<div class="drill" class:correct={feedback === 'correct'} class:wrong={feedback === 'wrong'}>
  <header>
    <button onclick={finish}>✕ End</button>
    <span class="score">{correct} correct · {answered}{lengthLabel}</span>
    <div class="level"><div style="width: {Math.min(100, level * 400)}%"></div></div>
  </header>

  {#if !started}
    <div class="center">
      <button class="primary big" onclick={start}>Tap to start</button>
      {#if error}<p class="error">{error}</p>{/if}
    </div>
  {:else}
    {#if view}<Staff {view} />{/if}
    <p class="message">{message}</p>
    {#if silentHint}<p class="hint">Can't hear the piano. Check that the mic isn't covered.</p>{/if}
  {/if}

  {#if suspended}
    <div class="overlay"><button class="primary big" onclick={resume}>Tap to resume</button></div>
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
  .message { text-align: center; font-size: 1.5rem; min-height: 2rem; }
  .hint { text-align: center; color: var(--muted); }
  .overlay { position: fixed; inset: 0; background: rgba(251, 250, 247, 0.9); display: flex; align-items: center; justify-content: center; }
</style>
```

- [ ] **Step 3: Write the results screen**

`src/ui/Results.svelte`:
```svelte
<script lang="ts">
  import type { SessionStats } from '../drill/session';

  let { stats, onAgain, onHome }: { stats: SessionStats; onAgain: () => void; onHome: () => void } = $props();
</script>

<main class="screen results">
  <h1>{stats.correct} / {stats.asked} correct</h1>
  <dl>
    <dt>Accuracy</dt><dd>{Math.round(stats.accuracy * 100)}%</dd>
    <dt>Average time</dt><dd>{(stats.avgResponseMs / 1000).toFixed(1)} s</dd>
    <dt>Best run</dt><dd>{stats.bestRun} in a row</dd>
  </dl>
  <div class="actions">
    <button class="primary big" onclick={onAgain}>Again</button>
    <button onclick={onHome}>Home</button>
  </div>
</main>

<style>
  h1 { font-size: 3rem; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.5rem 1.5rem; font-size: 1.3rem; }
  dt { color: var(--muted); }
  dd { margin: 0; font-weight: 600; }
  .actions { display: flex; gap: 1rem; margin-top: 2rem; }
</style>
```

- [ ] **Step 4: Wire the router**

Replace `src/App.svelte`:
```svelte
<script lang="ts">
  import Home from './ui/Home.svelte';
  import Calibrate from './ui/Calibrate.svelte';
  import DrillSetup from './ui/DrillSetup.svelte';
  import Drill from './ui/Drill.svelte';
  import Results from './ui/Results.svelte';
  import { getSetting } from './progress/db';
  import type { DrillConfig } from './drill/config';
  import type { SessionStats } from './drill/session';

  type Screen =
    | { name: 'home' }
    | { name: 'calibrate' }
    | { name: 'setup' }
    | { name: 'drill'; config: DrillConfig; run: number }
    | { name: 'results'; config: DrillConfig; stats: SessionStats };

  let screen: Screen = $state({ name: 'home' });
  let tuningOffset = $state(0);
  let runCounter = 0;
  getSetting('tuningOffsetCents', 0).then((v) => (tuningOffset = v));

  const home = () => (screen = { name: 'home' });
  const drill = (config: DrillConfig) => (screen = { name: 'drill', config, run: ++runCounter });
</script>

{#if screen.name === 'home'}
  <Home {tuningOffset} onDrill={() => (screen = { name: 'setup' })} onCalibrate={() => (screen = { name: 'calibrate' })} />
{:else if screen.name === 'calibrate'}
  <Calibrate {tuningOffset} onTuningChange={(c) => (tuningOffset = c)} onBack={home} />
{:else if screen.name === 'setup'}
  <DrillSetup onStart={drill} onBack={home} />
{:else if screen.name === 'drill'}
  {@const s = screen}
  {#key s.run}
    <Drill
      config={s.config}
      {tuningOffset}
      onFinish={(stats) => (screen = { name: 'results', config: s.config, stats })}
      onExit={home}
    />
  {/key}
{:else if screen.name === 'results'}
  {@const s = screen}
  <Results stats={s.stats} onAgain={() => drill(s.config)} onHome={home} />
{/if}
```

- [ ] **Step 5: Type check and run all tests**

Run: `npm test && npm run check`
Expected: tests PASS, 0 type errors. (Warnings about props read at init in `Drill.svelte` are acceptable; the comment there explains why.)

- [ ] **Step 6: Manual test on the iPad with the piano**

Run `npm run dev`; on the iPad:
1. Home → Note reading → pick Treble, C4–G5, 10 questions, Retry → Start → Tap to start.
2. Play correct notes: green flash, next note appears within ~0.5 s, score increments.
3. Play a wrong note: red flash, "You played X. Try again.", same note remains; after correcting, that question does not add to "correct".
4. Complete 10 → Results shows 10 answered, accuracy, avg time, best run. "Again" starts a fresh run.
5. Repeat with "Show answer & move on": a wrong note shows the answer in blue and advances after ~1.5 s.
6. Endless + ✕ End → Results.
7. Bass clef and grand staff render and detect correctly; "Accept any octave" works for low bass notes.
8. Switch to another app and back mid-drill → "Tap to resume" if audio was suspended.
9. Reopen Setup: last-used settings are restored.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: note-reading drill UI with setup, drill, and results screens

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Installable PWA + hosting — **requires user decision before deploy**

**Files:**
- Create: `public/favicon.svg`, `pwa-assets.config.ts`, generated `public/*.png`
- Modify: `vite.config.ts`, `index.html`
- Create (only if GitHub Pages chosen): `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: the built app.
- Produces: an offline-capable, home-screen-installable build in `dist/`.

- [ ] **Step 1: Add the PWA plugin and icon generator**

Run:
```bash
npm install -D vite-plugin-pwa@^1 @vite-pwa/assets-generator@^1
```

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#1f2a44"/>
  <g stroke="#fbfaf7" stroke-width="10">
    <line x1="72" y1="176" x2="440" y2="176"/>
    <line x1="72" y1="216" x2="440" y2="216"/>
    <line x1="72" y1="256" x2="440" y2="256"/>
    <line x1="72" y1="296" x2="440" y2="296"/>
    <line x1="72" y1="336" x2="440" y2="336"/>
  </g>
  <ellipse cx="256" cy="316" rx="46" ry="34" transform="rotate(-20 256 316)" fill="#fbfaf7"/>
  <line x1="298" y1="306" x2="298" y2="150" stroke="#fbfaf7" stroke-width="12"/>
</svg>
```

`pwa-assets.config.ts`:
```ts
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/favicon.svg'],
});
```

Run: `npx pwa-assets-generator`
Expected: creates `public/pwa-64x64.png`, `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/maskable-icon-512x512.png`, `public/apple-touch-icon-180x180.png`, `public/favicon.ico`.

- [ ] **Step 2: Configure the plugin**

Replace `vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    svelte(),
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Piano Trainer',
        short_name: 'Piano',
        description: 'Sight-reading and theory drills for acoustic piano',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#fbfaf7',
        theme_color: '#1f2a44',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  server: { host: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

In `index.html`, add inside `<head>`:
```html
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
    <meta name="theme-color" content="#1f2a44" />
```

- [ ] **Step 3: Build and preview**

Run: `npm test && npm run check && npm run build`
Expected: build succeeds; output lists `sw.js` and `manifest.webmanifest`; no "exceeds maximumFileSizeToCacheInBytes" warning.

Run: `npm run preview` and open the printed HTTPS network URL on the iPad → Share → Add to Home Screen. Launch from the icon.
Expected: opens full-screen with the icon; the drill works. (A preview-server install depends on the PC being on; permanent hosting is Step 4.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: installable offline PWA with app icons

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Choose hosting — ASK THE USER before doing anything outward-facing**

Options to present:
- **GitHub Pages** — free, but on a free GitHub plan the repo must be **public**. Needs a GitHub repo created and pushed.
- **Netlify / Cloudflare Pages** — free with a **private** repo, or by uploading the `dist/` folder by hand.

Do not create repos, push, or connect services without explicit approval. If the user picks GitHub Pages, create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          BASE_PATH: /${{ github.event.repository.name }}/
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```
then (after approval) create the repo, push `main`, and enable Pages with source "GitHub Actions". Verify by installing from the Pages URL on the iPad.

---

## Out of scope for this plan (next plans)

- Progress store (sessions, question log persistence), streaks, personal bests, home-screen stats (spec stage 4)
- Chord chroma checker, chords, intervals, scales (stage 5)
- Stats screen, presets, backup/restore (stage 6)
- Sequences, badges (stage 7)
