import { DEFAULT_LEVELS } from './calibration';
import { OnsetDetector, type OnsetOptions } from './onset';

export interface ChromaFrame {
  time: number;
  rms: number;
  chroma: ArrayLike<number>;
}

export interface ChordEvent {
  chroma: Float32Array;
  time: number;
}

export interface ChordTrackerOptions extends OnsetOptions {
  /** Wait this long after the attack before listening, so hammer noise doesn't count. */
  settleMs: number;
  averageFrames: number;
  /** Only emit if the loudest frame since the attack reaches this multiple of silenceRms. */
  minPeakRatio: number;
}

export const DEFAULT_CHORD_TRACKER_OPTIONS: ChordTrackerOptions = {
  silenceRms: DEFAULT_LEVELS.silenceRms,
  onsetRatio: 1.5,
  rearmMs: 100,
  // 8192 samples ≈ 171 ms at 48 kHz: wait until the FFT window holds only the new chord.
  settleMs: 180,
  averageFrames: 3,
  minPeakRatio: 2,
};

export class ChordTracker {
  private opts: ChordTrackerOptions;
  private onset: OnsetDetector;
  private armedAt: number | null = null;
  private emitted = false;
  private sum = new Float32Array(12);
  private count = 0;
  /** Loudest RMS since the attack. */
  private peak = 0;

  constructor(opts: Partial<ChordTrackerOptions> = {}) {
    this.opts = { ...DEFAULT_CHORD_TRACKER_OPTIONS, ...opts };
    this.onset = new OnsetDetector(this.opts);
  }

  setSilenceRms(rms: number): void {
    this.opts.silenceRms = rms;
    this.onset.setSilenceRms(rms);
  }

  reset(): void {
    this.armedAt = null;
    this.emitted = false;
    this.sum.fill(0);
    this.count = 0;
    this.peak = 0;
  }

  push(f: ChromaFrame): ChordEvent | null {
    const state = this.onset.push(f.rms, f.time);
    if (state === 'silent') {
      this.reset();
      return null;
    }
    if (state === 'onset' || (this.armedAt === null && !this.emitted)) {
      this.reset();
      this.armedAt = f.time;
    }
    this.peak = Math.max(this.peak, f.rms);
    if (this.emitted || this.armedAt === null || f.time - this.armedAt < this.opts.settleMs) return null;

    for (let pc = 0; pc < 12; pc++) this.sum[pc] += f.chroma[pc];
    this.count++;
    if (this.count < this.opts.averageFrames) return null;
    if (this.peak < this.opts.minPeakRatio * this.opts.silenceRms) {
      // Too faint to be a deliberate chord (a stray sound): keep listening with a fresh average.
      this.sum.fill(0);
      this.count = 0;
      return null;
    }

    this.emitted = true;
    this.onset.markEmitted(f.rms, f.time);
    const n = this.count;
    return { chroma: this.sum.map((v) => v / n), time: f.time };
  }
}
