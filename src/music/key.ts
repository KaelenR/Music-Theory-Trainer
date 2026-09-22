import { transposeBy } from './interval';
import type { Alter, Note, Step } from './note';
import type { ScaleType } from './scale';

/** Major keys with a standard signature: positive = sharps, negative = flats. */
const MAJOR_KEYS: Record<string, number> = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7,
  F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7,
};
const SHARP_ORDER: Step[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER: Step[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

export interface KeySignature {
  /** Key name VexFlow understands for `addKeySignature` (the major key with this signature). */
  vexKey: string;
  alters: Partial<Record<Step, Alter>>;
}

function keyName(n: Note): string {
  return `${n.step}${n.alter === 1 ? '#' : n.alter === -1 ? 'b' : ''}`;
}

export function keySignatureFor(tonic: Note, type: ScaleType): KeySignature | null {
  const major = type === 'major' ? tonic : transposeBy(tonic, 3, 2, 'up');
  if (!major) return null;
  const vexKey = keyName(major);
  const count = MAJOR_KEYS[vexKey];
  if (count === undefined) return null;
  const alters: Partial<Record<Step, Alter>> = {};
  if (count > 0) for (const s of SHARP_ORDER.slice(0, count)) alters[s] = 1;
  if (count < 0) for (const s of FLAT_ORDER.slice(0, -count)) alters[s] = -1;
  return { vexKey, alters };
}
