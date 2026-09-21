<script lang="ts">
  import { onMount } from 'svelte';
  import { DEFAULT_DRILL_CONFIG, type DrillConfig } from '../drill/config';
  import { candidateNotes, CLEF_DEFAULT_RANGES } from '../drill/noteReading';
  import { parseNote, STEPS, toMidi } from '../music/note';
  import { getSetting, setSetting } from '../progress/db';
  import type { StaffClef } from '../staff/types';
  import type { MissMode, SessionLength } from '../drill/types';

  let { onStart, onBack }: { onStart: (c: DrillConfig) => void; onBack: () => void } = $props();

  let config: DrillConfig = $state(structuredClone(DEFAULT_DRILL_CONFIG));
  onMount(async () => {
    const saved = await getSetting<DrillConfig | null>('noteReadingSetup', null);
    if (saved) config = { exercise: { ...DEFAULT_DRILL_CONFIG.exercise, ...saved.exercise }, session: { ...DEFAULT_DRILL_CONFIG.session, ...saved.session } };
  });

  const RANGE_NOTES: string[] = [];
  for (let o = 2; o <= 6; o++) for (const s of STEPS) RANGE_NOTES.push(`${s}${o}`);
  RANGE_NOTES.push('C7');

  const CLEFS: { value: StaffClef; label: string }[] = [
    { value: 'treble', label: 'Treble' },
    { value: 'bass', label: 'Bass' },
    { value: 'grand', label: 'Grand staff' },
  ];
  const LENGTHS: { value: SessionLength; label: string }[] = [
    { value: 10, label: '10' },
    { value: 20, label: '20' },
    { value: 50, label: '50' },
    { value: 'endless', label: 'Endless' },
  ];
  const MISS_MODES: { value: MissMode; label: string }[] = [
    { value: 'retry', label: 'Retry until correct' },
    { value: 'move-on', label: 'Show answer & move on' },
  ];

  const poolSize = $derived(
    toMidi(parseNote(config.exercise.low)) <= toMidi(parseNote(config.exercise.high))
      ? candidateNotes(config.exercise).length
      : 0,
  );

  function setClef(c: StaffClef) {
    config.exercise.clef = c;
    config.exercise.low = CLEF_DEFAULT_RANGES[c].low;
    config.exercise.high = CLEF_DEFAULT_RANGES[c].high;
  }

  function start() {
    const snap = $state.snapshot(config) as DrillConfig;
    onStart(snap);
    void setSetting('noteReadingSetup', snap).catch(() => undefined);
  }
</script>

<main class="screen">
  <button onclick={onBack}>← Back</button>
  <h1>Note reading</h1>

  <section>
    <h2>Clef</h2>
    <div class="seg">
      {#each CLEFS as c}
        <button class:selected={config.exercise.clef === c.value} onclick={() => setClef(c.value)}>{c.label}</button>
      {/each}
    </div>
  </section>

  <section>
    <h2>Range</h2>
    <label>From <select bind:value={config.exercise.low}>{#each RANGE_NOTES as n}<option value={n}>{n}</option>{/each}</select></label>
    <label>to <select bind:value={config.exercise.high}>{#each RANGE_NOTES as n}<option value={n}>{n}</option>{/each}</select></label>
    <span class="muted">{poolSize} notes</span>
    <label class="check"><input type="checkbox" bind:checked={config.exercise.accidentals} /> Sharps &amp; flats</label>
    <label class="check"><input type="checkbox" bind:checked={config.exercise.anyOctave} /> Accept any octave</label>
  </section>

  <section>
    <h2>Length</h2>
    <div class="seg">
      {#each LENGTHS as l}
        <button class:selected={config.session.length === l.value} onclick={() => (config.session.length = l.value)}>{l.label}</button>
      {/each}
    </div>
  </section>

  <section>
    <h2>On a wrong note</h2>
    <div class="seg">
      {#each MISS_MODES as m}
        <button class:selected={config.session.missMode === m.value} onclick={() => (config.session.missMode = m.value)}>{m.label}</button>
      {/each}
    </div>
    <label class="check"><input type="checkbox" bind:checked={config.session.weighting} /> Repeat notes I miss more often</label>
  </section>

  <button class="primary big" disabled={poolSize === 0} onclick={start}>Start</button>
</main>

<style>
  section { margin: 1.25rem 0; }
  h2 { font-size: 1rem; color: var(--muted); margin: 0 0 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .seg { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .seg button.selected { background: var(--fg); color: #fff; border-color: var(--fg); }
  label { margin-right: 1rem; }
  label.check { display: inline-flex; align-items: center; gap: 0.4rem; margin-top: 0.75rem; }
  input[type='checkbox'] { width: 24px; height: 24px; min-height: 0; }
  .muted { color: var(--muted); }
</style>
