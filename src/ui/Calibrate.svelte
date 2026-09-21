<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Mic } from '../audio/mic';
  import { micErrorMessage } from '../audio/micErrors';
  import { NoteTracker, type PitchFrame } from '../audio/noteTracker';
  import { computeTuningOffset, type CalibrationSample } from '../audio/calibration';
  import { displayName, freqToMidi, fromMidi } from '../music/note';
  import { setSetting } from '../progress/db';

  let { tuningOffset, onTuningChange, onBack }: {
    tuningOffset: number;
    onTuningChange: (cents: number) => void;
    onBack: () => void;
  } = $props();

  let mic: Mic | null = null;
  const tracker = new NoteTracker();
  let running = $state(false);
  let error = $state('');
  let frame = $state<PitchFrame | null>(null);
  let heard: string[] = $state([]);
  let calibrating = $state(false);
  let calMessage = $state('');
  let samples: CalibrationSample[] = [];

  const live = $derived(
    frame && frame.clarity >= 0.9 && frame.rms >= 0.01
      ? freqToMidi(frame.freq, 440 * 2 ** (tuningOffset / 1200))
      : null,
  );

  async function startMic() {
    error = '';
    try {
      mic = await Mic.open();
    } catch (e) {
      error = micErrorMessage(e);
      return;
    }
    tracker.setTuningOffset(tuningOffset);
    mic.onFrame = (f) => {
      frame = f;
      if (calibrating) samples.push({ freq: f.freq, clarity: f.clarity });
      const ev = tracker.push(f);
      if (ev) heard = [displayName(fromMidi(ev.midi)), ...heard].slice(0, 8);
    };
    mic.start();
    running = true;
  }

  function calibrate() {
    samples = [];
    calibrating = true;
    calMessage = 'Play and hold A4 (the A above middle C)…';
    setTimeout(async () => {
      calibrating = false;
      const offset = computeTuningOffset(samples);
      if (offset === null) {
        calMessage = "Couldn't hear a steady A4. Try again, a little louder.";
        return;
      }
      await setSetting('tuningOffsetCents', offset);
      tracker.setTuningOffset(offset);
      onTuningChange(offset);
      calMessage = `Saved: your piano is ${offset >= 0 ? '+' : ''}${offset} cents from A440.`;
    }, 2500);
  }

  async function resetTuning() {
    await setSetting('tuningOffsetCents', 0);
    tracker.setTuningOffset(0);
    onTuningChange(0);
    calMessage = 'Reset to A440.';
  }

  onDestroy(() => {
    void mic?.close();
  });
</script>

<main class="screen">
  <button onclick={onBack}>← Back</button>
  <h1>Calibrate &amp; mic test</h1>

  {#if !running}
    <button class="primary big" onclick={startMic}>Start microphone</button>
    {#if error}<p class="error">{error}</p>{/if}
  {:else}
    <div class="level"><div style="width: {Math.min(100, (frame?.rms ?? 0) * 400)}%"></div></div>
    <p class="live">
      {#if live}
        <strong>{displayName(fromMidi(live.midi))}</strong>
        <span>{live.cents >= 0 ? '+' : ''}{live.cents.toFixed(0)}¢</span>
      {:else}
        <span class="muted">—</span>
      {/if}
    </p>
    <p class="muted">
      freq {frame?.freq.toFixed(1) ?? '–'} Hz · clarity {frame?.clarity.toFixed(2) ?? '–'} · level {frame?.rms.toFixed(3) ?? '–'}
    </p>
    <p>Detected notes: {heard.join('  ') || '(play something)'}</p>

    <div class="actions">
      <button class="primary" onclick={calibrate} disabled={calibrating}>Calibrate with A4</button>
      <button onclick={resetTuning}>Reset to A440</button>
    </div>
    {#if calMessage}<p>{calMessage}</p>{/if}
  {/if}
</main>

<style>
  .level { height: 14px; background: #e5e7eb; border-radius: 7px; overflow: hidden; margin: 1rem 0; }
  .level div { height: 100%; background: var(--correct); transition: width 60ms linear; }
  .live { font-size: 3rem; margin: 0.5rem 0; display: flex; gap: 1rem; align-items: baseline; }
  .live span { font-size: 1.5rem; color: var(--muted); }
  .muted { color: var(--muted); }
  .actions { display: flex; gap: 1rem; }
</style>
