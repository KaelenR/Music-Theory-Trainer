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
