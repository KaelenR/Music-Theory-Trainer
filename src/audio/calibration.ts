export interface CalibrationSample {
  freq: number;
  clarity: number;
}

export function computeTuningOffset(samples: CalibrationSample[], minSamples = 10): number | null {
  const cents = samples
    .filter((s) => s.clarity >= 0.9 && s.freq > 0)
    .map((s) => 1200 * Math.log2(s.freq / 440))
    .filter((c) => Math.abs(c) <= 100)
    .sort((a, b) => a - b);
  if (cents.length < minSamples) return null;
  const mid = Math.floor(cents.length / 2);
  const median = cents.length % 2 ? cents[mid] : (cents[mid - 1] + cents[mid]) / 2;
  return Math.round(median * 10) / 10;
}
