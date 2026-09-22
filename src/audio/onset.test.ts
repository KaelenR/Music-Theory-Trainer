import { describe, expect, it } from 'vitest';
import { OnsetDetector } from './onset';

const make = () => new OnsetDetector({ silenceRms: 0.01, onsetRatio: 1.5, rearmMs: 100 });

describe('OnsetDetector', () => {
  it('reports silence below the cutoff', () => {
    expect(make().push(0.001, 0)).toBe('silent');
  });
  it('treats the first sound as sustain and a later jump as an onset', () => {
    const d = make();
    expect(d.push(0.1, 0)).toBe('sustain');
    expect(d.push(0.05, 16)).toBe('sustain');
    expect(d.push(0.2, 32)).toBe('onset');
  });
  it('suppresses onsets inside the re-arm window after an emission', () => {
    const d = make();
    d.push(0.1, 0);
    d.markEmitted(0.1, 10);
    expect(d.push(0.3, 50)).toBe('sustain');
    expect(d.push(0.1, 200)).toBe('sustain');
    expect(d.push(0.3, 216)).toBe('onset');
  });
  it('re-arms after silence', () => {
    const d = make();
    d.push(0.1, 0);
    d.push(0.001, 16);
    expect(d.push(0.1, 32)).toBe('sustain');
    expect(d.push(0.3, 48)).toBe('onset');
  });
});
