import { defaultSettings, type ExerciseSettings, type ExerciseType } from './exercises';
import type { SessionOptions } from './session';

export interface DrillConfig {
  exercise: ExerciseSettings;
  session: SessionOptions;
}

export const DEFAULT_SESSION: SessionOptions = { length: 20, missMode: 'retry', weighting: true };

export function defaultConfig(type: ExerciseType): DrillConfig {
  return { exercise: defaultSettings(type), session: { ...DEFAULT_SESSION } };
}

export const DEFAULT_DRILL_CONFIG: DrillConfig = defaultConfig('note-reading');
