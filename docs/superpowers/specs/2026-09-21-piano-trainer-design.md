# Piano Trainer — Design Spec

**Date:** 2026-09-21
**Status:** Approved design, pending spec review

## 1. Purpose

A personal iPad app for an intermediate pianist to practice sight reading and music theory against an acoustic piano. The app shows a note, interval, chord, scale, or sequence on a staff, listens through the iPad microphone, and judges whether the correct notes were played. Practice is lightly gamified through scoring, daily streaks, personal bests, and (later) badges.

**Non-goals:** open-ended polyphonic transcription (free-play display of chords), App Store distribution, multi-user accounts, cloud sync.

## 2. Platform & Stack

- **Delivery:** Progressive Web App, added to the iPad Home Screen via Safari. Hosted on GitHub Pages (HTTPS required for microphone access).
- **Stack:** Vite + TypeScript + Svelte; `vite-plugin-pwa` for offline/installability.
- **Libraries:** VexFlow (notation rendering), `pitchy` (monophonic pitch detection, McLeod Pitch Method). Chord detection is custom FFT/chroma code via the Web Audio `AnalyserNode`.
- **Storage:** IndexedDB, local to the device.
- **Dev loop:** Vite dev server over HTTPS on the LAN (self-signed cert via `@vitejs/plugin-basic-ssl`); iPad opens `https://<pc-ip>:5173`, accepts the cert once, hot-reloads against the real piano.
- **Target:** iPad Safari, landscape-first layout sized for the piano's music stand.

## 3. Architecture

Five units; only the UI layer depends on more than one other unit.

| Unit | Path | Responsibility | Depends on |
|---|---|---|---|
| Music model | `src/music/` | Note/interval/chord/key/scale types and pure functions (`transpose`, `chordNotes("Fm")`, `scaleNotes("D major")`, MIDI ↔ name, pitch class) | nothing |
| Audio listener | `src/audio/` | Mic capture → pitch events and chroma frames. Knows nothing about exercises. | Web Audio, `pitchy` |
| Staff renderer | `src/staff/` | Render music-model objects (note, chord, sequence, key signature) on treble/bass/grand staff; per-note color highlighting | VexFlow, music model |
| Drill engine | `src/drill/` | Question generation, answer checking, scoring, miss modes, weak-spot weighting, question log | music model |
| Progress store | `src/progress/` | Persist sessions/question logs, presets, calibration; derive streak, bests, stats, badges | IndexedDB |
| UI | `src/ui/` | Svelte screens wiring the above together | all |

The drill engine consumes listener events through a small interface (`onNote(midi, confidence)`, `onChroma(frame)`) so it can be tested with synthetic events and no microphone.

## 4. Audio Detection

### 4.1 Input
- `getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })`.
- AudioContext is created/resumed on a user tap ("Tap to start" on every drill), as iOS requires.
- Analysis frames of 2048–4096 samples.

### 4.2 Monophonic path
Used by note reading, sequential intervals, scales, and sequences.
- `pitchy` returns frequency + clarity per frame.
- Frequencies are corrected by the stored tuning offset, then converted to MIDI.
- A note is **confirmed** when clarity ≥ ~0.9 and the same MIDI note (±40 cents) persists for ~3 consecutive frames.
- **Onset detection:** an RMS energy jump marks a new attack, so a repeated same note registers as a new event.
- **Octave handling:** checking is constrained to the expected octave; an optional per-drill setting accepts the correct pitch class in any octave (useful for low bass notes, where octave errors are common below ~C3).

### 4.3 Chord path
Used by chords and simultaneous intervals.
- FFT magnitudes over roughly A1–C7 are folded into a 12-bin chroma vector.
- **Pass rule:** every expected pitch class exceeds a threshold relative to the strongest bin, and no unexpected pitch class exceeds a stricter threshold.
- Matching is **by pitch class only** — any voicing/inversion/octave of the chord passes.
- Thresholds are constants tuned against the real piano during development.

### 4.4 Calibration screen
- Play A4 → store cents offset from A440.
- Live mic-level meter and detected-note readout for diagnosing detection.

**Latency target:** 100–200 ms from key press to feedback.

## 5. Exercises

All exercises share one loop: **generate → render → listen → check → score**. Each exercise type implements `generate(settings, weights)` and `check(question, events)`.

| Exercise | Display | Pass condition | Settings |
|---|---|---|---|
| Note reading | Single note | Exact note (correct octave, unless any-octave enabled) | Clef (treble/bass/grand), range, accidentals on/off |
| Intervals | Root + prompt (e.g. "M3 ↑"), or both notes shown | "Play it": the target note played melodically. "Together": both pitch classes present via chord path | Interval set, direction, clef, range, mode |
| Chords | Chord on staff, or name only (e.g. "F♯m7") | Chord check passes | Triads/7ths, qualities, show inversions, display mode |
| Scales | Key signature + prompt ("D major, 1 octave ↑") | Each note played in order; each note highlights green when played | Keys, major/minor types, show notes vs. key signature only |
| Sequences (last priority) | 4–8 notes | Played in order | Length, range, stepwise vs. leaps |

### 5.1 Session options (all exercises)
- **Length:** endless, or fixed 10 / 20 / 50 questions.
- **On a miss:**
  - *Retry until correct* — question stays until played correctly; the first miss still counts against accuracy.
  - *Move on* — correct answer is shown on the staff for ~1 s, then the next question.
- **Weak-spot weighting:** recently missed items are sampled more often. On by default, toggleable.

### 5.2 Question log
Each question records: exercise type, the item asked, first-try correct (bool), miss count, response time (ms), timestamp, session id.

### 5.3 Presets
Named saved configurations (exercise type + settings + session options). Home screen shows presets and the last-used configuration.

## 6. Scoring & Progress

- **Score:** total correct on first try.
- **Results screen:** score, accuracy, average response time, most-missed item, new-best indicator.
- **Daily streak:** consecutive calendar days (local time) meeting the daily goal. The default goal is one completed session; an optional goal of N correct answers is configurable.
- **Personal bests:** per preset × length. Fixed-length runs ranked by accuracy, then total time. Endless runs ranked by longest run of consecutive correct answers.
- **Stats screen:** accuracy over time per exercise type; weak-spot heat map (notes, chords, intervals most missed).
- **Badges (later phase):** milestones derived from the question log (e.g. 1,000 notes read, perfect 50-question run, 7-day streak). No schema changes needed to add them.
- **Backup:** export/import all data as a JSON file, to guard against Safari clearing storage.

All progress figures are derived from the question log plus session records; nothing is stored that cannot be recomputed except calibration, presets, and settings.

## 7. Screens

1. **Home** — streak, presets, recent sessions, quick start, calibration.
2. **Drill setup** — exercise type, settings, length, miss mode, save as preset.
3. **Drill** — large centered staff (landscape), mic-level indicator, score/progress, green/red flash feedback. No interaction required mid-drill beyond the initial tap and an exit button.
4. **Results** — score, stats, new-best indicator, replay/back.
5. **Stats** — charts and weak spots.
6. **Calibration** — tuning offset, mic test, live pitch readout.

## 8. Error Handling

- **Mic permission denied:** drill screen shows an explanation and how to re-enable microphone access in iPad Settings → Safari.
- **No signal / very low level:** mic-level indicator stays flat; after ~5 s of silence during a drill, show a non-blocking "Can't hear the piano" hint.
- **AudioContext suspended** (e.g. after the app is backgrounded): pause the drill and show "Tap to resume".
- **Storage failure:** drills still run; show a warning that progress may not be saved and suggest a backup export.
- **Import of an invalid backup file:** reject with a message; existing data is left untouched.

## 9. Testing

- **Unit tests (Vitest):** music model, question generators, answer checkers (driven by synthetic note/chroma events), scoring, miss modes, streak and personal-best derivation, backup round-trip.
- **Chroma checker tests:** synthesized audio buffers of piano-like tones (fundamental + decaying harmonics) for chords, including negative cases.
- **Manual on-device testing:** detection thresholds and latency tuned on the iPad against the real piano using the calibration screen.

## 10. Build Order

1. Scaffold: Vite + Svelte + TS, HTTPS dev server, PWA manifest/service worker, GitHub Pages deploy.
2. Music model, staff renderer, monophonic listener, calibration screen. **Checkpoint:** detection verified on the real piano and iPad.
3. Drill engine + note reading, both miss modes, both session lengths.
4. Progress store, results screen, home screen, streak, personal bests.
5. Chord checker, then chords, intervals, scales.
6. Stats screen, presets, backup/restore.
7. Sequences, then badges.
