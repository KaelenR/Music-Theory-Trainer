<script lang="ts">
  import Keyboard from './Keyboard.svelte';
  import RichText from './RichText.svelte';
  import Staff from './Staff.svelte';
  import TryIt from './TryIt.svelte';
  import type { Levels } from '../audio/calibration';
  import { CHECKPOINT_LENGTH, PASS_SCORE } from '../learn/progress';
  import type { Lesson } from '../learn/types';

  let { lesson, unitTitle, mode, tuningOffset, levels, onCheckpoint, onBack }: {
    lesson: Lesson;
    unitTitle: string;
    mode: 'lesson' | 'reference';
    tuningOffset: number;
    levels: Levels;
    onCheckpoint: () => void;
    onBack: () => void;
  } = $props();

  let phase = $state<'cards' | 'try' | 'ready'>('cards');
  let cardIndex = $state(0);
  let innerHeight = $state(window.innerHeight);

  const card = $derived(lesson.cards[cardIndex]);
  const lastCard = $derived(cardIndex === lesson.cards.length - 1);

  function next() {
    if (!lastCard) cardIndex++;
    else phase = 'try';
  }
</script>

<svelte:window bind:innerHeight />

<main class="screen lesson">
  <header>
    <button onclick={onBack}>← {mode === 'lesson' ? 'Lessons' : 'Library'}</button>
    <div>
      <p class="unit">{unitTitle}</p>
      <h1>{lesson.title}</h1>
    </div>
  </header>

  {#if mode === 'lesson'}
    <ol class="steps">
      <li class:active={phase === 'cards'}>Concepts</li>
      <li class:active={phase === 'try'}>Try it</li>
      <li class:active={phase === 'ready'}>Checkpoint</li>
    </ol>
  {/if}

  {#if phase === 'cards'}
    <div class="card">
      <div class="text"><RichText text={card.text} /></div>
      {#if card.staff || card.keys}
        <div class="visual">
          {#if card.staff}<Staff view={card.staff} maxHeight={Math.round(innerHeight * 0.35)} />{/if}
          {#if card.keys}<Keyboard highlight={card.keys.midis} labels={card.keys.labels} />{/if}
        </div>
      {/if}
    </div>
    <nav>
      <button onclick={() => cardIndex--} disabled={cardIndex === 0}>← Back</button>
      <span class="muted">{cardIndex + 1} / {lesson.cards.length}</span>
      {#if mode === 'reference'}
        {#if lastCard}
          <button class="primary" onclick={onCheckpoint}>Practice this</button>
        {:else}
          <button class="primary" onclick={() => cardIndex++}>Next →</button>
        {/if}
      {:else}
        <button class="primary" onclick={next}>{lastCard ? 'Try it at the piano →' : 'Next →'}</button>
      {/if}
    </nav>
  {:else if phase === 'try'}
    <TryIt steps={lesson.tryIt} {tuningOffset} {levels} onDone={() => (phase = 'ready')} />
  {:else}
    <div class="ready">
      <h2>Checkpoint</h2>
      <p>{CHECKPOINT_LENGTH} questions. Get {PASS_SCORE} right to complete the lesson.</p>
      <button class="primary big" onclick={onCheckpoint}>Start checkpoint</button>
      <button onclick={() => { phase = 'cards'; cardIndex = 0; }}>Review the concepts</button>
    </div>
  {/if}
</main>

<style>
  header { display: flex; align-items: center; gap: 1.5rem; }
  header h1 { margin: 0; }
  .unit { margin: 0; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.85rem; }
  .steps { display: flex; gap: 1.5rem; list-style: none; padding: 0; color: var(--muted); }
  .steps li.active { color: var(--fg); font-weight: 700; }
  .card { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 2rem; align-items: center; min-height: 50vh; }
  .card:has(.visual) { grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); }
  .card:not(:has(.visual)) { grid-template-columns: 1fr; max-width: 700px; }
  .text { font-size: 1.3rem; line-height: 1.6; }
  nav { display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; }
  .ready { display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-top: 3rem; }
  .muted { color: var(--muted); }
</style>
