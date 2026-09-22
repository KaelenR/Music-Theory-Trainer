export const CHECKPOINT_LENGTH = 10;
export const PASS_SCORE = 8;

export function isPassing(correct: number): boolean {
  return correct >= PASS_SCORE;
}
