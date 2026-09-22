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
