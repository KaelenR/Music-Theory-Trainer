<script lang="ts">
  import { onMount } from 'svelte';
  import { defaultConfig, type DrillConfig } from '../drill/config';
  import { createExercise, EXERCISE_LABELS, setupKey, type ExerciseSettings, type ExerciseType } from '../drill/exercises';
  import type { MissMode, SessionLength } from '../drill/types';
  import { getSetting, setSetting } from '../progress/db';
  import ChordOptions from './options/ChordOptions.svelte';
  import HarmonyOptions from './options/HarmonyOptions.svelte';
  import IntervalOptions from './options/IntervalOptions.svelte';
  import NoteReadingOptions from './options/NoteReadingOptions.svelte';
  import ScaleOptions from './options/ScaleOptions.svelte';

  let { type, onStart, onBack }: { type: ExerciseType; onStart: (c: DrillConfig) => void; onBack: () => void } = $props();

  // The screen is remounted per exercise type, so reading `type` once is intended.
  let config = $state<DrillConfig>(defaultConfig(type));
  onMount(async () => {
    const saved = await getSetting<DrillConfig | null>(setupKey(type), null);
    if (!saved) return;
    const d = defaultConfig(type);
    config = {
      exercise: { ...d.exercise, ...saved.exercise, type } as ExerciseSettings,
      session: { ...d.session, ...saved.session },
    };
  });

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

  const startable = $derived.by(() => {
    try {
      createExercise($state.snapshot(config.exercise) as ExerciseSettings);
      return true;
    } catch {
      return false;
    }
  });

  function start() {
    const snap = $state.snapshot(config) as DrillConfig;
    onStart(snap);
    void setSetting(setupKey(type), snap).catch(() => undefined);
  }
</script>

<main class="screen setup">
  <button onclick={onBack}>← Back</button>
  <h1>{EXERCISE_LABELS[type]}</h1>

  {#if config.exercise.type === 'note-reading'}
    <NoteReadingOptions bind:settings={config.exercise} />
  {:else if config.exercise.type === 'intervals'}
    <IntervalOptions bind:settings={config.exercise} />
  {:else if config.exercise.type === 'chords'}
    <ChordOptions bind:settings={config.exercise} />
  {:else if config.exercise.type === 'scales'}
    <ScaleOptions bind:settings={config.exercise} />
  {:else}
    <HarmonyOptions bind:settings={config.exercise} />
  {/if}

  <section>
    <h2>Length</h2>
    <div class="seg">
      {#each LENGTHS as l}
        <button class:selected={config.session.length === l.value} onclick={() => (config.session.length = l.value)}>{l.label}</button>
      {/each}
    </div>
  </section>

  <section>
    <h2>On a wrong answer</h2>
    <div class="seg">
      {#each MISS_MODES as m}
        <button class:selected={config.session.missMode === m.value} onclick={() => (config.session.missMode = m.value)}>{m.label}</button>
      {/each}
    </div>
    <label class="check"><input type="checkbox" bind:checked={config.session.weighting} /> Repeat what I miss more often</label>
  </section>

  <button class="primary big" disabled={!startable} onclick={start}>Start</button>
</main>
