export interface OnsetOptions {
  silenceRms: number;
  onsetRatio: number;
  rearmMs: number;
}

export type OnsetState = 'silent' | 'onset' | 'sustain';

/**
 * Loudness gate shared by the note and chord trackers. An onset is a rise above the quietest
 * level since the last event (the trough), so a key struck while another still rings counts.
 */
export class OnsetDetector {
  private opts: OnsetOptions;
  private trough = Infinity;
  private lastEmitTime = -Infinity;

  constructor(opts: OnsetOptions) {
    this.opts = { ...opts };
  }

  setSilenceRms(rms: number): void {
    this.opts.silenceRms = rms;
  }

  push(rms: number, time: number): OnsetState {
    if (rms < this.opts.silenceRms) {
      this.trough = Infinity;
      return 'silent';
    }
    if (this.trough !== Infinity && rms > this.trough * this.opts.onsetRatio) {
      this.trough = rms;
      return time - this.lastEmitTime >= this.opts.rearmMs ? 'onset' : 'sustain';
    }
    this.trough = Math.min(this.trough, rms);
    return 'sustain';
  }

  /** Call when the consumer emits an event: rebases the trough and starts the re-arm window. */
  markEmitted(rms: number, time: number): void {
    this.trough = rms;
    this.lastEmitTime = time;
  }
}
