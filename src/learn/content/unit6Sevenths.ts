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
        text: '**C7** = dominant 7th. **Cmaj7** = major 7th. **Cm7** = minor 7th. **Cø7** = half-diminished. **C°7** = diminished 7th (C–E♭–G♭–B𝄫 — its 7th needs a double flat, so it isn\'t drawn).',
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
