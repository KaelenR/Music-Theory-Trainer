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
      { prompt: 'Which major key has this signature? Play its scale.', answer: playScale('G4', 'major', { anyOctave: true }), staff: keySignatureStaff('treble', 'G4', 'major'), hint: 'One sharp. The last sharp is F♯ — a half step up is G.' },
      { prompt: 'Which major key has this signature? Play its scale.', answer: playScale('Bb3', 'major', { anyOctave: true }), staff: keySignatureStaff('treble', 'Bb3', 'major'), hint: 'Two flats. The second-to-last flat is B♭.' },
      { prompt: 'Which major key has this signature? Play its scale.', answer: playScale('A4', 'major', { anyOctave: true }), staff: keySignatureStaff('treble', 'A4', 'major'), hint: 'Three sharps. The last sharp is G♯ — a half step up is A.' },
    ],
    drill: drill.scales({ moreKeys: true, keySignatureOnly: true, showName: false }),
  },
];
