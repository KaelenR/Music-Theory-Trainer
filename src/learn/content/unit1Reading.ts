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
