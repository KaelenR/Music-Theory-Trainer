<script lang="ts">
  import { EXERCISE_LABELS, EXERCISE_TYPES, type ExerciseType } from '../drill/exercises';

  let { tuningOffset, onDrill, onCalibrate }: {
    tuningOffset: number;
    onDrill: (type: ExerciseType) => void;
    onCalibrate: () => void;
  } = $props();
</script>

<main class="screen home">
  <h1>Piano Trainer</h1>
  <div class="exercises">
    {#each EXERCISE_TYPES as t}
      <button class="primary big" onclick={() => onDrill(t)}>{EXERCISE_LABELS[t]}</button>
    {/each}
  </div>
  <div class="actions">
    <button onclick={onCalibrate}>Calibrate &amp; mic test</button>
  </div>
  <p class="tuning">Tuning: {tuningOffset === 0 ? 'A440' : `${tuningOffset > 0 ? '+' : ''}${tuningOffset} cents`}</p>
  <p class="build">Build {__BUILD__}</p>
</main>

<style>
  .exercises { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; max-width: 640px; }
  .actions { margin-top: 1.5rem; }
  .tuning { color: var(--muted); }
  .build { color: var(--muted); font-size: 0.8rem; }
</style>
