import { describe, expect, it } from 'vitest';
import { ChordTracker, type ChordEvent, type ChromaFrame } from './chordTracker';

const C_MAJOR = Array.from({ length: 12 }, (_, pc) => ([0, 4, 7].includes(pc) ? 1 : 0));
const fr = (time: number, rms = 0.1, chroma: number[] = C_MAJOR): ChromaFrame => ({ time, rms, chroma });
const make = () => new ChordTracker({ silenceRms: 0.01, settleMs: 120, averageFrames: 3 });

function run(t: ChordTracker, frames: ChromaFrame[]): ChordEvent[] {
  return frames.map((f) => t.push(f)).filter((e): e is ChordEvent => e !== null);
}
const every16 = (from: number, to: number, rms = 0.1) =>
  Array.from({ length: Math.floor((to - from) / 16) + 1 }, (_, i) => fr(from + i * 16, rms));

describe('ChordTracker', () => {
  it('emits once, after settling and averaging', () => {
    const events = run(make(), every16(0, 400));
    expect(events).toHaveLength(1);
    expect(events[0].time).toBe(160);
    expect(Array.from(events[0].chroma)).toEqual(C_MAJOR);
  });

  it('averages the chroma frames after settling', () => {
    const t = make();
    const frames = [fr(0), fr(128, 0.1, C_MAJOR.map((v) => v * 2)), fr(144), fr(160)];
    const [e] = run(t, frames);
    expect(e.chroma[0]).toBeCloseTo(4 / 3, 5);
  });

  it('emits again after a re-strike', () => {
    const events = run(make(), [...every16(0, 384), fr(400, 0.05), ...every16(416, 640, 0.2)]);
    expect(events.map((e) => e.time)).toEqual([160, 576]);
  });

  it('resets on silence', () => {
    const events = run(make(), [...every16(0, 208), fr(224, 0.001), ...every16(240, 480)]);
    expect(events.map((e) => e.time)).toEqual([160, 400]);
  });

  it('stays quiet in silence', () => {
    expect(run(make(), every16(0, 400, 0.001))).toHaveLength(0);
  });
});
