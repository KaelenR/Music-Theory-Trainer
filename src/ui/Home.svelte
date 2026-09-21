<script lang="ts">
  let { tuningOffset, onDrill, onCalibrate }: {
    tuningOffset: number;
    onDrill: (() => void) | null;
    onCalibrate: () => void;
  } = $props();
</script>

<main class="screen home">
  <h1>Piano Trainer</h1>
  <div class="actions">
    {#if onDrill}<button class="primary big" onclick={onDrill}>Note reading</button>{/if}
    <button onclick={onCalibrate}>Calibrate &amp; mic test</button>
  </div>
  <p class="tuning">Tuning: {tuningOffset === 0 ? 'A440' : `${tuningOffset > 0 ? '+' : ''}${tuningOffset} cents`}</p>
  <p class="build">Build {__BUILD__}</p>
</main>

<style>
  .actions { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
  .tuning { color: var(--muted); }
  .build { color: var(--muted); font-size: 0.8rem; }
</style>
