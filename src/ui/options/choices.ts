import { STEPS } from '../../music/note';
import type { StaffClef } from '../../staff/types';

/** Natural notes C2–C7 for range pickers (detection is unreliable below about A1). */
export const RANGE_NOTES: string[] = [];
for (let o = 2; o <= 6; o++) for (const s of STEPS) RANGE_NOTES.push(`${s}${o}`);
RANGE_NOTES.push('C7');

export const CLEF_CHOICES: { value: StaffClef; label: string }[] = [
  { value: 'treble', label: 'Treble' },
  { value: 'bass', label: 'Bass' },
  { value: 'grand', label: 'Grand staff' },
];

/** Add or remove a value from a multi-select list. */
export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
