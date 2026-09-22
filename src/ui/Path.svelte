<script lang="ts">
  import { nextLesson } from '../learn/path';
  import { CHECKPOINT_LENGTH } from '../learn/progress';
  import type { Unit } from '../learn/types';
  import type { LessonProgress } from '../progress/db';

  let { units, progress, onOpen, onLibrary, onBack }: {
    units: Unit[];
    progress: Map<string, LessonProgress>;
    onOpen: (lessonId: string) => void;
    onLibrary: () => void;
    onBack: () => void;
  } = $props();

  const passed = $derived(new Set([...progress.values()].filter((p) => p.passedAt !== null).map((p) => p.lessonId)));
  const next = $derived(nextLesson(units, passed));
</script>

<main class="screen path">
  <header class="top">
    <button onclick={onBack}>← Home</button>
    <h1>Learn</h1>
    <button onclick={onLibrary}>Library</button>
  </header>

  {#if next}
    <button class="primary big continue" onclick={() => onOpen(next.id)}>Continue: {next.title}</button>
  {:else}
    <p class="done">Every lesson is complete. Revisit any of them anytime.</p>
  {/if}

  {#each units as unit, u}
    <section>
      <h2>{u + 1}. {unit.title}</h2>
      <ul>
        {#each unit.lessons as lesson}
          {@const p = progress.get(lesson.id)}
          <li>
            <button class="lesson" class:passed={passed.has(lesson.id)} onclick={() => onOpen(lesson.id)}>
              <span class="mark">{passed.has(lesson.id) ? '✓' : '○'}</span>
              <span class="title">{lesson.title}</span>
              {#if p}<span class="score">best {p.bestScore}/{CHECKPOINT_LENGTH}</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
</main>

<style>
  .top { display: flex; align-items: center; justify-content: space-between; }
  .continue { margin: 1rem 0; }
  .done { color: var(--correct); font-weight: 600; }
  section h2 { font-size: 1.1rem; margin: 1.5rem 0 0.5rem; }
  ul { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; }
  .lesson { width: 100%; display: flex; align-items: center; gap: 0.75rem; text-align: left; }
  .lesson.passed { border-color: var(--correct); }
  .mark { font-weight: 700; color: var(--correct); width: 1.2rem; }
  .title { flex: 1; }
  .score { color: var(--muted); font-size: 0.9rem; }
</style>
