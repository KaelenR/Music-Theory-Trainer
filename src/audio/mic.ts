import { PitchDetector } from 'pitchy';
import type { PitchFrame } from './noteTracker';

const FRAME_SIZE = 2048;

export class Mic {
  onFrame: ((f: PitchFrame) => void) | null = null;

  private ctx: AudioContext;
  private stream: MediaStream;
  private analyser: AnalyserNode;
  private buf: Float32Array<ArrayBuffer>;
  private detector: PitchDetector<Float32Array<ArrayBuffer>>;
  private raf = 0;

  private constructor(ctx: AudioContext, stream: MediaStream, analyser: AnalyserNode) {
    this.ctx = ctx;
    this.stream = stream;
    this.analyser = analyser;
    this.buf = new Float32Array(FRAME_SIZE);
    this.detector = PitchDetector.forFloat32Array(FRAME_SIZE);
  }

  /** Must be called from a user tap handler (iOS requirement). */
  static async open(): Promise<Mic> {
    const ctx = new AudioContext();
    void ctx.resume();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      await ctx.close();
      throw e;
    }
    await ctx.resume();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = FRAME_SIZE;
    source.connect(analyser);
    return new Mic(ctx, stream, analyser);
  }

  get state(): string {
    return this.ctx.state;
  }

  async resume(): Promise<void> {
    await this.ctx.resume();
  }

  start(): void {
    const loop = () => {
      this.analyser.getFloatTimeDomainData(this.buf);
      let sum = 0;
      for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i];
      const rms = Math.sqrt(sum / this.buf.length);
      const [freq, clarity] = this.detector.findPitch(this.buf, this.ctx.sampleRate);
      this.onFrame?.({ time: performance.now(), freq, clarity, rms });
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  async close(): Promise<void> {
    this.stop();
    this.stream.getTracks().forEach((t) => t.stop());
    if (this.ctx.state !== 'closed') await this.ctx.close();
  }
}
