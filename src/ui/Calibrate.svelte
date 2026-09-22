<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Mic } from '../audio/mic';
  import { micErrorMessage } from '../audio/micErrors';
  import { NoteTracker, type PitchFrame } from '../audio/noteTracker';
  import {
    calibrateFrom, CLARITY_MIN, formatDb, meterPercent, type Levels, type PianoSample,
  } from '../audio/calibration';
  import { displayName, freqToMidi, fromMidi } from '../music/note';
  import { setSetting } from '../progress/db';

  let { tuningOffset, levels, onTuningChange, onLevelsChange, onBack }: {
    tuningOffset: number;
    levels: Levels;
    onTuningChange: (cents: number) => void;
    onLevelsChange: (levels: Levels) => void;
    onBack: () => void;
  } = $props();

  const QUIET_MS = 1200;
  const HOLD_MS = 2500;
  const SAVE_FAILED = " (Couldn't save. It will reset next time the app opens.)";

  let mic: Mic | null = null;
  const tracker = new NoteTracker();
  let starting = false;
  let destroyed = false;
  let running = $state(false);
  let error = $state('');
  let frame = $state<PitchFrame | null>(null);
  let heard: string[] = $state([]);
  let calPhase = $state<'idle' | 'quiet' | 'piano'>('idle');
  let calMessage = $state('');
  let quietRms: number[] = [];
  let pianoSamples: PianoSample[] = [];
  let calTimer: ReturnType<typeof setTimeout> | undefined;

  const live = $derived(
    frame && frame.clarity >= CLARITY_MIN && frame.rms >= levels.silenceRms
      ? freqToMidi(frame.freq, 440 * 2 ** (tuningOffset / 1200))
      : null,
  );

  async function startMic() {
    if (starting || running) return;
    starting = true;
    error = '';
    let m: Mic;
    try {
      m = await Mic.open();
    } catch (e) {
      error = micErrorMessage(e);
      starting = false;
      return;
    }
    if (destroyed) {
      void m.close();
      return;
    }
    mic = m;
    tracker.setTuningOffset(tuningOffset);
    tracker.setSilenceRms(levels.silenceRms);
    mic.onFrame = (f) => {
      frame = f;
      if (calPhase === 'quiet') quietRms.push(f.rms);
      else if (calPhase === 'piano') pianoSamples.push({ freq: f.freq, clarity: f.clarity, rms: f.rms });
      const ev = tracker.push(f);
      if (ev) heard = [displayName(fromMidi(ev.midi)), ...heard].slice(0, 8);
    };
    mic.start();
    running = true;
    starting = false;
  }

  function calibrate() {
    quietRms = [];
    pianoSamples = [];
    calPhase = 'quiet';
    calMessage = 'Stay quiet for a moment…';
    calTimer = setTimeout(() => {
      calPhase = 'piano';
      calMessage = 'Now play and hold A4 (the A above middle C)…';
      calTimer = setTimeout(finishCalibration, HOLD_MS);
    }, QUIET_MS);
  }

  async function finishCalibration() {
    calPhase = 'idle';
    const result = calibrateFrom(quietRms, pianoSamples);
    if (result === null) {
      calMessage = "Couldn't hear a steady A4. Try again, a little louder.";
      return;
    }
    const { tuningOffsetCents: offset, levels: measured } = result;
    tracker.setTuningOffset(offset);
    tracker.setSilenceRms(measured.silenceRms);
    onTuningChange(offset);
    onLevelsChange(measured);
    calMessage = `Saved: your piano is ${offset >= 0 ? '+' : ''}${offset} cents from A440, at ${formatDb(measured.pianoRms)} on the iPad.`;
    if (!measured.clearOfNoise) {
      calMessage += ' It is barely louder than the room here, so move the iPad closer to the piano for reliable detection.';
    }
    try {
      await setSetting('tuningOffsetCents', offset);
      await setSetting('levels', measured);
    } catch {
      calMessage += SAVE_FAILED;
    }
  }

  async function resetTuning() {
    tracker.setTuningOffset(0);
    onTuningChange(0);
    calMessage = 'Reset to A440.';
    try {
      await setSetting('tuningOffsetCents', 0);
    } catch {
      calMessage += SAVE_FAILED;
    }
  }

  onDestroy(() => {
    destroyed = true;
    clearTimeout(calTimer);
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
    <div class="level"><div style="width: {meterPercent(frame?.rms ?? 0, levels)}%"></div></div>
    <p class="live">
      {#if live}
        <strong>{displayName(fromMidi(live.midi))}</strong>
        <span>{live.cents >= 0 ? '+' : ''}{live.cents.toFixed(0)}¢</span>
      {:else}
        <span class="muted">—</span>
      {/if}
    </p>
    <p class="muted">
      freq {frame?.freq.toFixed(1) ?? '–'} Hz · clarity {frame?.clarity.toFixed(2) ?? '–'} · level {frame ? formatDb(frame.rms) : '–'}
    </p>
    <p>Detected notes: {heard.join('  ') || '(play something)'}</p>

    <div class="actions">
      <button class="primary" onclick={calibrate} disabled={calPhase !== 'idle'}>Calibrate with A4</button>
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
