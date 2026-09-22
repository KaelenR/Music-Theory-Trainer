import { hasSound, matchChord, matchNote } from '../drill/answer';
import type { Heard, HearResult } from '../drill/types';
import type { TryStep } from './types';

export type TryState = 'asking' | 'correct' | 'done';

/** Guided practice: unlimited retries, no scoring. */
export class TryItSession {
  readonly steps: TryStep[];
  index = 0;
  /** Notes of the current answer already played. */
  matched = 0;
  /** True after a miss on the current step (the UI shows the hint). */
  missed = false;
  state: TryState;

  constructor(steps: TryStep[]) {
    this.steps = steps;
    this.state = steps.length > 0 ? 'asking' : 'done';
  }

  get current(): TryStep | null {
    return this.steps[this.index] ?? null;
  }

  hear(h: Heard): HearResult {
    const step = this.current;
    if (this.state !== 'asking' || !step) return 'ignored';
    const answer = step.answer;
    let result: HearResult;
    if (h.kind === 'note') {
      if (answer.kind !== 'notes') return 'ignored';
      result = matchNote(answer, this.matched, h.midi);
    } else {
      if (answer.kind !== 'chord' || !hasSound(h.chroma)) return 'ignored';
      result = matchChord(answer.pitchClasses, h.chroma) ? 'correct' : 'wrong';
    }
    if (result === 'progress') this.matched++;
    else if (result === 'correct') this.state = 'correct';
    else if (result === 'wrong') this.missed = true;
    return result;
  }

  /** Go to the next step — after a correct answer, or to skip. */
  next(): void {
    this.index++;
    this.matched = 0;
    this.missed = false;
    this.state = this.index < this.steps.length ? 'asking' : 'done';
  }
}
