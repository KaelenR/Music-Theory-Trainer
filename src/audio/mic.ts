import { PitchDetector } from 'pitchy';
import { CHROMA_FFT_SIZE, chromaFromSpectrum, createChromaMap } from './chroma';
import type { PitchFrame } from './noteTracker';

const FRAME_SIZE = 2048;

export interface AudioFrame extends PitchFrame {
  chroma: Float32Array;
}

export class Mic {
  onFrame: ((f: AudioFrame) => void) | null = null;
  onInterrupted: (() => void) | null = null;

  private ctx: AudioContext;
  private stream: MediaStream;
  private analyser: AnalyserNode;
  private buf: Float32Array<ArrayBuffer>;
  private detector: PitchDetector<Float32Array<ArrayBuffer>>;
  private chromaAnalyser: AnalyserNode;
  private spectrum: Float32Array<ArrayBuffer>;
  private chromaMap: Int8Array;
  private raf = 0;

  private constructor(ctx: AudioContext, stream: MediaStream, analyser: AnalyserNode, chromaAnalyser: AnalyserNode) {
    this.ctx = ctx;
    this.stream = stream;
    this.analyser = analyser;
    this.buf = new Float32Array(FRAME_SIZE);
    this.detector = PitchDetector.forFloat32Array(FRAME_SIZE);
    this.chromaAnalyser = chromaAnalyser;
    this.spectrum = new Float32Array(chromaAnalyser.frequencyBinCount);
    this.chromaMap = createChromaMap(ctx.sampleRate, CHROMA_FFT_SIZE);

    this.ctx.onstatechange = () => {
      if (this.ctx.state !== 'running' && this.ctx.state !== 'closed') this.onInterrupted?.();
    };
    this.stream.getAudioTracks().forEach((t) => {
      t.onended = () => this.onInterrupted?.();
      t.onmute = () => this.onInterrupted?.();
    });
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
    const chromaAnalyser = ctx.createAnalyser();
    chromaAnalyser.fftSize = CHROMA_FFT_SIZE;
    chromaAnalyser.smoothingTimeConstant = 0;
    source.connect(chromaAnalyser);
    return new Mic(ctx, stream, analyser, chromaAnalyser);
  }

  get state(): string {
    return this.ctx.state;
  }

  get healthy(): boolean {
    return (
      this.ctx.state === 'running' &&
      this.stream.getAudioTracks().some((t) => t.readyState === 'live' && t.enabled && !t.muted)
    );
  }

  async resume(): Promise<void> {
    await this.ctx.resume();
  }

  /** Align chroma bins with the calibrated tuning. */
  setTuningOffset(cents: number): void {
    this.chromaMap = createChromaMap(this.ctx.sampleRate, CHROMA_FFT_SIZE, 440 * 2 ** (cents / 1200));
  }

  start(): void {
    const loop = () => {
      this.analyser.getFloatTimeDomainData(this.buf);
      let sum = 0;
      for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i];
      const rms = Math.sqrt(sum / this.buf.length);
      const [freq, clarity] = this.detector.findPitch(this.buf, this.ctx.sampleRate);
      this.chromaAnalyser.getFloatFrequencyData(this.spectrum);
      const chroma = chromaFromSpectrum(this.spectrum, this.chromaMap);
      this.onFrame?.({ time: performance.now(), freq, clarity, rms, chroma });
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
