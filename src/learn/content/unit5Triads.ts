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
        text: '**°** (or dim) means diminished: **B°**. **+** (or aug) means augmented: **C+**. An accidental right after the letter belongs to the root: **F♯m** is F♯–A–C♯.',
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
      { prompt: 'Try G major in 2nd inversion — D on the bottom (any voicing counts).', answer: playChord('D4', 'G4', 'B4'), keys: keys('D4', 'G4', 'B4'), hint: 'D–G–B.' },
    ],
    drill: drill.chords({ qualities: ['maj', 'min'], inversions: true }),
  },
];
