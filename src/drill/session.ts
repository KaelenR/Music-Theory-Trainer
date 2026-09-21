import type { Rng } from './random';
import type { Exercise, HeardNote, MissMode, Question, QuestionLogEntry, SessionLength } from './types';

export type SessionState = 'idle' | 'asking' | 'answered' | 'revealing' | 'done';

export interface SessionOptions {
  length: SessionLength;
  missMode: MissMode;
  weighting: boolean;
}

export interface SessionStats {
  asked: number;
  correct: number;
  accuracy: number;
  avgResponseMs: number;
  bestRun: number;
}

export class DrillSession {
  state: SessionState = 'idle';
  current: Question | null = null;
  readonly log: QuestionLogEntry[] = [];

  private exercise: Exercise;
  private opts: SessionOptions;
  private rng: Rng;
  private now: () => number;
  private missWeights = new Map<string, number>();
  private currentMisses = 0;
  private askedAt = 0;

  constructor(exercise: Exercise, opts: SessionOptions, rng: Rng = Math.random, now: () => number = () => Date.now()) {
    this.exercise = exercise;
    this.opts = opts;
    this.rng = rng;
    this.now = now;
  }

  start(): void {
    this.ask();
  }

  hear(h: HeardNote): 'correct' | 'wrong' | 'ignored' {
    if (this.state !== 'asking' || !this.current) return 'ignored';
    const key = this.current.itemKey;

    if (this.exercise.check(this.current, h) === 'correct') {
      if (this.currentMisses === 0) {
        const w = this.missWeights.get(key) ?? 0;
        if (w > 0) this.missWeights.set(key, w - 1);
      }
      this.record();
      this.state = 'answered';
      return 'correct';
    }

    this.currentMisses++;
    this.missWeights.set(key, (this.missWeights.get(key) ?? 0) + 1);
    if (this.opts.missMode === 'move-on') {
      this.record();
      this.state = 'revealing';
    }
    return 'wrong';
  }

  advance(): void {
    if (this.state !== 'answered' && this.state !== 'revealing') return;
    if (this.opts.length !== 'endless' && this.log.length >= this.opts.length) {
      this.state = 'done';
      return;
    }
    this.ask();
  }

  finish(): void {
    this.state = 'done';
  }

  stats(): SessionStats {
    const asked = this.log.length;
    let correct = 0;
    let run = 0;
    let bestRun = 0;
    let totalMs = 0;
    for (const e of this.log) {
      totalMs += e.responseMs;
      if (e.firstTryCorrect) {
        correct++;
        run++;
        bestRun = Math.max(bestRun, run);
      } else {
        run = 0;
      }
    }
    return {
      asked,
      correct,
      accuracy: asked ? correct / asked : 0,
      avgResponseMs: asked ? totalMs / asked : 0,
      bestRun,
    };
  }

  private ask(): void {
    const weights = this.opts.weighting ? this.missWeights : new Map<string, number>();
    this.current = this.exercise.nextQuestion(weights, this.rng, this.current);
    this.currentMisses = 0;
    this.askedAt = this.now();
    this.state = 'asking';
  }

  private record(): void {
    this.log.push({
      itemKey: this.current!.itemKey,
      firstTryCorrect: this.currentMisses === 0,
      misses: this.currentMisses,
      responseMs: this.now() - this.askedAt,
      askedAt: this.askedAt,
    });
  }
}
