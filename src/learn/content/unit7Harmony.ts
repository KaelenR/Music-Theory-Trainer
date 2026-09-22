import { diatonicKeys, diatonicStaff, drill, playDiatonic } from '../build';
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
      { prompt: 'Play the triad built on the 4th note of C major.', answer: playDiatonic('C4', 'major', 4), keys: diatonicKeys('C4', 'major', 4), hint: 'F–A–C: F major.' },
      { prompt: 'Play the triad on the 2nd note of G major.', answer: playDiatonic('G4', 'major', 2), keys: diatonicKeys('G4', 'major', 2), hint: 'A–C–E: A minor.' },
      { prompt: 'Play the triad on the 5th note of G major.', answer: playDiatonic('G4', 'major', 5), keys: diatonicKeys('G4', 'major', 5), hint: 'D–F♯–A: D major (F♯ is in G major).' },
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
      { prompt: 'Play V in C major.', answer: playDiatonic('C4', 'major', 5), keys: diatonicKeys('C4', 'major', 5), hint: 'G–B–D.' },
      { prompt: 'Play IV in D major.', answer: playDiatonic('D4', 'major', 4), keys: diatonicKeys('D4', 'major', 4), hint: 'G–B–D: G is the 4th note of D major.' },
      { prompt: 'Play I in F major.', answer: playDiatonic('F4', 'major', 1), keys: diatonicKeys('F4', 'major', 1), hint: 'F–A–C.' },
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
      { prompt: 'Play vi in G major.', answer: playDiatonic('G4', 'major', 6), keys: diatonicKeys('G4', 'major', 6), hint: 'E–G–B: E minor.' },
      { prompt: 'Play ii in F major.', answer: playDiatonic('F4', 'major', 2), keys: diatonicKeys('F4', 'major', 2), hint: 'G–B♭–D: G minor (B♭ is in F major).' },
      { prompt: 'Play vii° in D major.', answer: playDiatonic('D4', 'major', 7), keys: diatonicKeys('D4', 'major', 7), hint: 'C♯–E–G.' },
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
      { prompt: 'Play i in A minor.', answer: playDiatonic('A4', 'minor', 1), keys: diatonicKeys('A4', 'minor', 1), hint: 'A–C–E.' },
      { prompt: 'Play V in A minor.', answer: playDiatonic('A4', 'minor', 5), keys: diatonicKeys('A4', 'minor', 5), hint: 'E–G♯–B: raise the 7th, G → G♯.' },
      { prompt: 'Play iv in D minor.', answer: playDiatonic('D4', 'minor', 4), keys: diatonicKeys('D4', 'minor', 4), hint: 'G–B♭–D.' },
    ],
    drill: drill.harmony({ mode: 'minor', tonics: ['A', 'E', 'D', 'G'], degrees: [1, 2, 3, 4, 5, 6, 7] }),
  },
];
