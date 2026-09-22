import { unit1 } from './content/unit1Reading';
import { unit2 } from './content/unit2Intervals';
import { unit3 } from './content/unit3MajorScales';
import { unit4 } from './content/unit4MinorScales';
import { unit5 } from './content/unit5Triads';
import { unit6 } from './content/unit6Sevenths';
import { unit7 } from './content/unit7Harmony';
import type { Unit } from './types';

/** The one place that orders and groups lessons. Reorder or regroup here; lesson ids key saved progress. */
export const UNITS: Unit[] = [
  { id: 'reading', title: 'Reading refresh', lessons: unit1 },
  { id: 'intervals', title: 'Intervals', lessons: unit2 },
  { id: 'major-scales', title: 'Major scales & keys', lessons: unit3 },
  { id: 'minor-scales', title: 'Minor scales', lessons: unit4 },
  { id: 'triads', title: 'Triads', lessons: unit5 },
  { id: 'sevenths', title: '7th chords', lessons: unit6 },
  { id: 'harmony', title: 'Harmony in a key', lessons: unit7 },
];
