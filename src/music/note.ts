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
