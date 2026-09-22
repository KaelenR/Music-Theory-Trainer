<script lang="ts">
  import type { Unit } from '../learn/types';

  let { units, onOpen, onBack }: { units: Unit[]; onOpen: (lessonId: string) => void; onBack: () => void } = $props();
</script>

<main class="screen library">
  <header class="top">
    <button onclick={onBack}>← Lessons</button>
    <h1>Library</h1>
  </header>
  {#each units as unit, u}
    <section>
      <h2>{u + 1}. {unit.title}</h2>
      <div class="topics">
        {#each unit.lessons as lesson}
          <button onclick={() => onOpen(lesson.id)}>{lesson.title}</button>
        {/each}
      </div>
    </section>
  {/each}
</main>

<style>
  .top { display: flex; align-items: center; gap: 1.5rem; }
  section h2 { font-size: 1.1rem; margin: 1.5rem 0 0.5rem; }
  .topics { display: flex; flex-wrap: wrap; gap: 0.5rem; }
</style>
