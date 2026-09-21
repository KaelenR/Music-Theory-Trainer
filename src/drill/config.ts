import { DEFAULT_NOTE_READING, type NoteReadingSettings } from './noteReading';
import type { SessionOptions } from './session';

export interface DrillConfig {
  exercise: NoteReadingSettings;
  session: SessionOptions;
}

export const DEFAULT_DRILL_CONFIG: DrillConfig = {
  exercise: DEFAULT_NOTE_READING,
  session: { length: 20, missMode: 'retry', weighting: true },
};
