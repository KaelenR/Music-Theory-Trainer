<script lang="ts">
  import type { SessionStats } from '../drill/session';

  let { stats, onAgain, onHome }: { stats: SessionStats; onAgain: () => void; onHome: () => void } = $props();
</script>

<main class="screen results">
  <h1>{stats.correct} / {stats.asked} correct</h1>
  <dl>
    <dt>Accuracy</dt><dd>{Math.round(stats.accuracy * 100)}%</dd>
    <dt>Average time</dt><dd>{(stats.avgResponseMs / 1000).toFixed(1)} s</dd>
    <dt>Best run</dt><dd>{stats.bestRun} in a row</dd>
  </dl>
  <div class="actions">
    <button class="primary big" onclick={onAgain}>Again</button>
    <button onclick={onHome}>Home</button>
  </div>
</main>

<style>
  h1 { font-size: 3rem; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.5rem 1.5rem; font-size: 1.3rem; }
  dt { color: var(--muted); }
  dd { margin: 0; font-weight: 600; }
  .actions { display: flex; gap: 1rem; margin-top: 2rem; }
</style>
