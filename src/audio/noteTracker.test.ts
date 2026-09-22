import { describe, expect, it } from 'vitest';
import { NoteTracker, type NoteEvent, type PitchFrame } from './noteTracker';

const A4 = 440;
const B4 = 493.88;
const f = (time: number, freq: number, rms = 0.1, clarity = 0.95): PitchFrame => ({ time, freq, clarity, rms });
// These frames use a loud fixture scale (0.1 = playing, <0.01 = silent), so pin the cutoff.
const TEST_LEVELS = { silenceRms: 0.01 };

function run(tracker: NoteTracker, frames: PitchFrame[]): NoteEvent[] {
  return frames.map((fr) => tracker.push(fr)).filter((e): e is NoteEvent => e !== null);
}

describe('NoteTracker', () => {
  it('emits once after three stable frames', () => {
    const t = new NoteTracker(TEST_LEVELS);
    const events = run(t, [f(0, A4), f(16, A4), f(32, A4), f(48, A4), f(64, A4)]);
    expect(events).toHaveLength(1);
    expect(events[0].midi).toBe(69);
    expect(events[0].time).toBe(32);
  });

  it('ignores low-clarity frames', () => {
    const t = new NoteTracker(TEST_LEVELS);
    expect(run(t, [f(0, A4, 0.1, 0.5), f(16, A4, 0.1, 0.5), f(32, A4, 0.1, 0.5)])).toHaveLength(0);
  });

  it('ignores silent frames', () => {
    const t = new NoteTracker(TEST_LEVELS);
    expect(run(t, [f(0, A4, 0.001), f(16, A4, 0.001), f(32, A4, 0.001)])).toHaveLength(0);
  });

  it('rejects frames too far out of tune', () => {
    const t = new NoteTracker(TEST_LEVELS);
    expect(run(t, [f(0, 452), f(16, 452), f(32, 452)])).toHaveLength(0);
  });

  it('re-emits the same note after silence', () => {
    const t = new NoteTracker(TEST_LEVELS);
    const events = run(t, [
      f(0, A4), f(16, A4), f(32, A4),
      f(48, A4, 0.001),
      f(300, A4), f(316, A4), f(332, A4),
    ]);
    expect(events.map((e) => e.time)).toEqual([32, 332]);
  });

  it('re-emits the same note after an onset outside the rearm window', () => {
    const t = new NoteTracker(TEST_LEVELS);
    const events = run(t, [
      f(0, A4), f(16, A4), f(32, A4),
      f(200, A4, 0.05),
      f(216, A4, 0.2),
      f(232, A4, 0.2), f(248, A4, 0.2),
    ]);
    expect(events.map((e) => e.time)).toEqual([32, 248]);
  });

  it('ignores an onset inside the rearm window', () => {
    const t = new NoteTracker(TEST_LEVELS);
    const events = run(t, [
      f(0, A4), f(16, A4), f(32, A4),
      f(48, A4, 0.3), f(64, A4, 0.3), f(80, A4, 0.3),
    ]);
    expect(events).toHaveLength(1);
  });

  it('does not emit a pitch change without an onset (decay flip)', () => {
    const t = new NoteTracker(TEST_LEVELS);
    const frames = [f(0, A4), f(16, A4), f(32, A4)];
    for (let time = 48; time <= 160; time += 16) {
      frames.push(f(time, B4, 0.09));
    }
    const events = run(t, frames);
    expect(events).toHaveLength(1);
    expect(events[0].midi).toBe(69);
  });

  it('emits a new pitch after an onset', () => {
    const t = new NoteTracker(TEST_LEVELS);
    const events = run(t, [
      f(0, A4), f(16, A4), f(32, A4),
      f(150, B4, 0.1),
      f(166, B4, 0.3), f(182, B4, 0.3), f(198, B4, 0.3),
    ]);
    expect(events.map((e) => e.midi)).toEqual([69, 71]);
  });

  it('applies the tuning offset', () => {
    const t = new NoteTracker({ ...TEST_LEVELS, tuningOffsetCents: 19.6 });
    const events = run(t, [f(0, 445), f(16, 445), f(32, 445)]);
    expect(events[0].midi).toBe(69);
    expect(Math.abs(events[0].cents)).toBeLessThan(1);
  });

  it('re-emits a same-note re-strike that ramps up gradually over a ringing note', () => {
    const t = new NoteTracker(TEST_LEVELS);
    const events = run(t, [
      f(0, A4, 0.3), f(16, A4, 0.3), f(32, A4, 0.3),
      f(150, A4, 0.25), f(166, A4, 0.20), f(182, A4, 0.16), f(198, A4, 0.13),
      f(214, A4, 0.17), f(230, A4, 0.22), f(246, A4, 0.28), f(262, A4, 0.28), f(278, A4, 0.28),
    ]);
    expect(events).toHaveLength(2);
    expect(events[1].time).toBeGreaterThan(214);
  });

  it('does not re-trigger on a sustained louder note after an ignored onset', () => {
    const t = new NoteTracker(TEST_LEVELS);
    const frames = [f(0, A4, 0.1), f(16, A4, 0.1), f(32, A4, 0.1)];
    for (let time = 48; time <= 400; time += 16) {
      frames.push(f(time, A4, 0.3));
    }
    const events = run(t, frames);
    expect(events).toHaveLength(1);
  });

  it('ignores frames with non-positive frequency', () => {
    const t = new NoteTracker(TEST_LEVELS);
    expect(run(t, [f(0, 0, 0.1, 0.95), f(16, 0, 0.1, 0.95), f(32, 0, 0.1, 0.95)])).toHaveLength(0);
  });

  it('detects a note at real iPad input levels with default options', () => {
    // Measured on the user's iPad: a firm note arrived at rms ~0.0003 with clarity ~0.88.
    const t = new NoteTracker();
    const events = run(t, [f(0, A4, 0.0003, 0.88), f(16, A4, 0.0003, 0.88), f(32, A4, 0.0003, 0.88)]);
    expect(events.map((e) => e.midi)).toEqual([69]);
  });
});
