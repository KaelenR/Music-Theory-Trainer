<script lang="ts">
  import { EXERCISE_LABELS, EXERCISE_TYPES, type ExerciseType } from '../drill/exercises';

  let { tuningOffset, onLearn, onDrill, onCalibrate }: {
    tuningOffset: number;
    onLearn: () => void;
    onDrill: (type: ExerciseType) => void;
    onCalibrate: () => void;
  } = $props();
</script>

<main class="screen home">
  <h1>Piano Trainer</h1>
  <button class="primary big learn" onclick={onLearn}>Learn</button>
  <h2 class="section">Practice drills</h2>
  <div class="exercises">
    {#each EXERCISE_TYPES as t}
      <button class="big" onclick={() => onDrill(t)}>{EXERCISE_LABELS[t]}</button>
    {/each}
  </div>
  <div class="actions">
    <button onclick={onCalibrate}>Calibrate &amp; mic test</button>
  </div>
  <p class="tuning">Tuning: {tuningOffset === 0 ? 'A440' : `${tuningOffset > 0 ? '+' : ''}${tuningOffset} cents`}</p>
  <p class="build">Build {__BUILD__}</p>
</main>

<style>
  .learn { width: 100%; max-width: 640px; margin-bottom: 1rem; }
  .section { font-size: 1rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .exercises { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; max-width: 640px; }
  .actions { margin-top: 1.5rem; }
  .tuning { color: var(--muted); }
  .build { color: var(--muted); font-size: 0.8rem; }
</style>
