<script lang="ts">
  import type { SessionStats } from '../drill/session';
  import { CHECKPOINT_LENGTH, PASS_SCORE } from '../learn/progress';

  let { stats, checkpoint, onAgain, onHome, onNext = null, againLabel = 'Again', homeLabel = 'Home' }: {
    stats: SessionStats;
    checkpoint?: { passed: boolean; saveFailed: boolean };
    onAgain: () => void;
    onHome: () => void;
    onNext?: (() => void) | null;
    againLabel?: string;
    homeLabel?: string;
  } = $props();
</script>

<main class="screen results">
  {#if checkpoint}
    <p class="banner" class:pass={checkpoint.passed}>
      {checkpoint.passed ? 'Passed ✓ Lesson complete' : `Not yet — ${PASS_SCORE} of ${CHECKPOINT_LENGTH} needed`}
    </p>
    {#if checkpoint.saveFailed}<p class="muted">Couldn't save progress on this device.</p>{/if}
  {/if}
  <h1>{stats.correct} / {stats.asked} correct</h1>
  <dl>
    <dt>Accuracy</dt><dd>{Math.round(stats.accuracy * 100)}%</dd>
    <dt>Average time</dt><dd>{(stats.avgResponseMs / 1000).toFixed(1)} s</dd>
    <dt>Best run</dt><dd>{stats.bestRun} in a row</dd>
  </dl>
  <div class="actions">
    {#if onNext}<button class="primary big" onclick={onNext}>Next lesson</button>{/if}
    <button class:primary={!onNext} class:big={!onNext} onclick={onAgain}>{againLabel}</button>
    <button onclick={onHome}>{homeLabel}</button>
  </div>
</main>

<style>
  h1 { font-size: 3rem; }
  .banner { font-size: 1.5rem; font-weight: 700; color: var(--wrong); }
  .banner.pass { color: var(--correct); }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.5rem 1.5rem; font-size: 1.3rem; }
  dt { color: var(--muted); }
  dd { margin: 0; font-weight: 600; }
  .actions { display: flex; gap: 1rem; margin-top: 2rem; }
  .muted { color: var(--muted); }
</style>
