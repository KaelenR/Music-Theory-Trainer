# Learning Suite — Design Spec

**Date:** 2026-09-21
**Status:** Approved design, pending spec review
**Builds on:** `docs/superpowers/specs/2026-09-21-piano-trainer-design.md` (drills, detection, calibration)

## 1. Purpose

Teach key theory concepts before practicing them. Two parts that share one body of content:

- **Guided path:** an ordered curriculum of short lessons. Each lesson = concept cards → guided try-it at the piano → a 10-question checkpoint drill. Passing (≥ 8/10) marks the lesson complete.
- **Reference library:** the same concept cards, browsable by topic at any time, with a shortcut to practice.

All practice is **played on the piano** (no tap-to-answer identification in this iteration). Nothing is locked. The user expects to reorganize the curriculum after trying it, so lesson order and grouping must live in one place and be cheap to change.

**Non-goals:** tap-answer identification quizzes, spaced repetition, streaks/badges (spec stage 4/7), audio playback of examples.

## 2. Curriculum (29 lessons, 7 units)

Each lesson has 2–5 concept cards, 2–4 try-it steps and one checkpoint drill preset (10 questions, move-on mode, weighting on).

**Unit 1 — Reading refresh**
1. The grand staff & middle C — drill: note reading, grand staff, C3–C5
2. Ledger lines above — drill: note reading, treble, A5–C7
3. Ledger lines below — drill: note reading, bass, C2–E2
4. Accidentals & enharmonics (C♯ = D♭; E♯, B♯ exist) — drill: note reading with sharps & flats, treble C4–G5

**Unit 2 — Intervals**
5. Half steps & whole steps (keyboard view) — drill: melodic m2, M2
6. Interval numbers (count letter names, 2nd–8ve) — drill: intervals with both notes shown, m2…P8 mix
7. Major, minor & perfect (semitone counts) — drill: melodic m3, M3, P4, P5
8. 6ths, 7ths & the tritone — drill: melodic m6, M6, m7, M7, TT
9. Hearing both notes together — drill: harmonic m3, M3, P5

**Unit 3 — Major scales & keys**
10. The major scale pattern (W-W-H-W-W-W-H) — drill: major scales in C, G, F (notes shown)
11. Key signatures: sharps (order of sharps; naming the key) — drill: major scales in G, D, A, E
12. Key signatures: flats (order of flats) — drill: major scales in F, B♭, E♭, A♭
13. The circle of fifths — drill: all major scales incl. more keys, key signature only

**Unit 4 — Minor scales**
14. Relative minor (same signature, down a minor 3rd) — drill: natural minor, common keys, notes shown
15. Harmonic minor (raised 7th) — drill: harmonic minor
16. Melodic minor (raised 6th & 7th up, natural down) — drill: melodic minor, up and back down

**Unit 5 — Triads**
17. Building a triad from 3rds — drill: major triads, notes shown
18. Major vs minor (the middle note moves) — drill: major + minor
19. Diminished & augmented — drill: all four triad qualities
20. Reading chord symbols (C, Cm, C°, C+) — drill: chord name only, four triad qualities
21. Inversions (same notes, new bass) — drill: major + minor with inversions

**Unit 6 — 7th chords**
22. Dominant 7th — drill: dom7, notes shown
23. Major 7th & minor 7th — drill: maj7 + min7
24. Half-diminished & diminished 7th — drill: hdim7 + dim7
25. 7th chord symbols — drill: chord name only, all five 7th qualities

**Unit 7 — Harmony in a key**
26. Diatonic triads (a chord on each scale degree) — drill: harmony in C and G, all degrees, numeral + key name shown
27. Roman numerals: I, IV, V — drill: I, IV, V in common major keys
28. The minor chords (ii, iii, vi) & vii° — drill: all degrees in common major keys
29. Harmony in minor keys (i, iv, V from harmonic minor) — drill: minor-key numerals i, ii°, III, iv, V, VI, vii°

## 3. Architecture

### 3.1 Lesson content as typed data (`src/learn/`)

```ts
interface Card {
  text: string;                                  // short paragraphs; **bold** and blank-line breaks only
  staff?: StaffView;                             // example notation (existing renderer)
  keys?: { midis: number[]; labels?: boolean };  // keyboard-diagram highlights
}
interface TryStep {
  prompt: string;
  answer: Answer;                                // existing notes/chord answer type
  staff?: StaffView;
  keys?: { midis: number[]; labels?: boolean };
  hint: string;                                  // shown after a miss
}
interface Lesson {
  id: string;                                    // stable, kebab-case; used as the progress key
  title: string;
  cards: Card[];
  tryIt: TryStep[];
  drill: ExerciseSettings;                       // checkpoint preset
}
interface Unit { id: string; title: string; lessons: Lesson[] }
```

- One content file per unit (`src/learn/content/unit1Reading.ts` … `unit7Harmony.ts`), each exporting its lessons.
- `src/learn/curriculum.ts` is the **single place** defining unit order, unit titles and which lessons belong to each unit — reorganizing means editing this file only.
- Content is built with the existing music model (`parseNote`, `chordNotes`, `scaleNotes`, `keySignatureFor`, …) so examples are computed, not hand-typed MIDI numbers, wherever practical.
- The library is a derived view over the curriculum (cards grouped by unit).

### 3.2 New drill capability

- **Scales:** optional `tonics?: string[]` on `ScaleSettings` (pitch names such as `'Bb'`). When present it replaces the common/more-keys choice. The Scales setup screen does not expose it; existing saved setups are unaffected.
- **Harmony drill** (`src/drill/harmony.ts`), also a fifth exercise on Home:
  - Music model: `diatonicTriad(tonic, mode, degree)` and `romanNumeral(mode, degree)` in `src/music/harmony.ts`. Major: I ii iii IV V vi vii°. Minor: i ii° III iv V VI vii° (V and vii° from harmonic minor).
  - Settings: `mode: 'major' | 'minor'`, `tonics: string[]`, `degrees: number[]` (1–7), `showKeyName: boolean` (show "in G major" text vs key signature only), `clef`.
  - Question: prompt e.g. "IV in G major"; staff shows the key signature; reveal shows the chord. Answer: chord pitch classes (existing chord path).

### 3.3 Screens and components

- `Keyboard.svelte` — SVG keyboard that auto-fits the range covering its highlighted keys (min one octave, C-to-B aligned), highlights keys (accent color), optional note-name labels, and per-key green/red marks. Geometry in a pure helper `keyboardLayout(lowMidi, highMidi)` (white/black key rects).
- `Path.svelte` — units with their lessons, ✓ + best score for passed lessons, **Continue** (first unpassed lesson), **Library** button.
- `Lesson.svelte` — progress strip (Concepts → Try it → Checkpoint), Back/Next; landscape two-column layout (text left; staff + keyboard right).
- `TryIt.svelte` + `src/learn/tryItSession.ts` — mic starts on the first tap of the try-it phase (iOS rule); reuses `NoteTracker`, `ChordTracker`, `matchNote`, `matchChord`; unlimited retries, no scoring. Correct → target keys green, advance after ~1 s. Miss → "You played …", show the hint, highlight target keys. **Skip** always available.
- Checkpoint → existing `Drill` screen with the lesson's preset, `length: 10`, `missMode: 'move-on'`, `weighting: true`. `Results` gains an optional pass banner: **Passed ✓** when correct ≥ 8, otherwise **Try again**; then return to Path (or Library).
- `Library.svelte` — topic list grouped by unit; opening a topic shows its cards read-only with **Practice this** (starts the checkpoint drill).
- Home: a large **Learn** button above the existing drills (now five, including Harmony).

### 3.4 Progress store

- IndexedDB, separate from settings: `{ lessonId, bestScore, passedAt | null, attempts }`, keyed by lesson id. Added via a DB version upgrade (new object store); the existing `kv` store is untouched.
- Pass threshold: `PASS_SCORE = 8` of 10 (constant).
- On save failure the pass still shows for the session with a small "couldn't save progress" note.

## 4. Error Handling

- Mic denied/unavailable in Try it: existing mic message; the user can read cards, skip steps, and still open the checkpoint (which shows its own mic error).
- Unknown lesson id in saved progress (after reorganizing): ignored.
- Content construction errors are caught by tests (§5), not at runtime.

## 5. Testing

- Unit tests: `diatonicTriad`/`romanNumeral`, harmony exercise, scale `tonics` filtering, `keyboardLayout`, `TryItSession` state (correct/miss/hint/skip), pass logic, progress store (fake-indexeddb, including DB upgrade from version 1).
- **Content guards:** every lesson has ≥ 1 card, 2–4 try-it steps and a drill preset for which `createExercise` succeeds; ids unique; the curriculum lists all 29 lessons exactly once; each try-it `answer` is consistent with its staff example and keyboard highlights where both are given (same MIDI set / pitch classes).
- Controller verification in the browser with the synthetic-mic harness: one full lesson (cards → try-it → checkpoint pass) and the library.

## 6. Build Order

1. Music model: harmony (diatonic triads, Roman numerals); scale `tonics`.
2. Harmony exercise + Home entry + setup panel.
3. Keyboard diagram component + layout helper.
4. Lesson types, curriculum, progress store, pass logic.
5. Try-it session + Lesson / Path / Library screens + Results pass banner.
6. Content: units 1–7 (29 lessons) + content guard tests.
