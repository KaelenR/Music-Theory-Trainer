import { freqToMidi } from '../music/note';

export interface PitchFrame {
  time: number;
  freq: number;
  clarity: number;
  rms: number;
}

export interface NoteEvent {
  midi: number;
  cents: number;
  time: number;
}

export interface TrackerOptions {
  clarityMin: number;
  stableFrames: number;
  centsTolerance: number;
  silenceRms: number;
  onsetRatio: number;
  rearmMs: number;
  tuningOffsetCents: number;
}

export const DEFAULT_TRACKER_OPTIONS: TrackerOptions = {
  clarityMin: 0.9,
  stableFrames: 3,
  centsTolerance: 40,
  silenceRms: 0.01,
  onsetRatio: 1.5,
  rearmMs: 100,
  tuningOffsetCents: 0,
};

export class NoteTracker {
  private opts: TrackerOptions;
  private candidate: number | null = null;
  private count = 0;
  private emitted: number | null = null;
  private lastEmitTime = -Infinity;
  private prevRms = 0;

  constructor(opts: Partial<TrackerOptions> = {}) {
    this.opts = { ...DEFAULT_TRACKER_OPTIONS, ...opts };
  }

  setTuningOffset(cents: number): void {
    this.opts.tuningOffsetCents = cents;
  }

  reset(): void {
    this.candidate = null;
    this.count = 0;
    this.emitted = null;
  }

  push(f: PitchFrame): NoteEvent | null {
    const o = this.opts;
    const silent = f.rms < o.silenceRms;
    const onset = !silent && this.prevRms > 0 && f.rms > this.prevRms * o.onsetRatio;
    this.prevRms = f.rms;

    if (silent) {
      this.reset();
      return null;
    }
    if (onset && f.time - this.lastEmitTime >= o.rearmMs) this.reset();

    if (f.clarity < o.clarityMin) {
      this.candidate = null;
      this.count = 0;
      return null;
    }

    const a4 = 440 * 2 ** (o.tuningOffsetCents / 1200);
    const { midi, cents } = freqToMidi(f.freq, a4);
    if (Math.abs(cents) > o.centsTolerance) {
      this.candidate = null;
      this.count = 0;
      return null;
    }

    if (midi === this.candidate) this.count++;
    else {
      this.candidate = midi;
      this.count = 1;
    }

    if (this.count >= o.stableFrames && midi !== this.emitted) {
      this.emitted = midi;
      this.lastEmitTime = f.time;
      return { midi, cents, time: f.time };
    }
    return null;
  }
}
