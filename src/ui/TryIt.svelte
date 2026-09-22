<script lang="ts">
  import { onDestroy } from 'svelte';
  import Keyboard from './Keyboard.svelte';
  import Staff from './Staff.svelte';
  import type { Levels } from '../audio/calibration';
  import { ChordTracker } from '../audio/chordTracker';
  import { Mic, type AudioFrame } from '../audio/mic';
  import { micErrorMessage } from '../audio/micErrors';
  import { NoteTracker } from '../audio/noteTracker';
  import { heardPitchClasses, pitchClassNames } from '../drill/answer';
  import type { Heard } from '../drill/types';
  import { TryItSession } from '../learn/tryItSession';
  import type { TryStep } from '../learn/types';
  import { displayName, fromMidi } from '../music/note';
  import type { StaffView } from '../staff/types';
  import { keyboardRange } from './keyboardLayout';

  let { steps, tuningOffset, levels, onDone }: {
    steps: TryStep[];
    tuningOffset: number;
    levels: Levels;
    onDone: () => void;
  } = $props();

  const NEXT_MS = 1000;

  // Steps, tuning and levels are fixed for the lifetime of this component.
  const session = new TryItSession(steps);
  const tracker = new NoteTracker({ tuningOffsetCents: tuningOffset, silenceRms: levels.silenceRms });
  const chordTracker = new ChordTracker({ silenceRms: levels.silenceRms });

  let mic: Mic | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let starting = false;
  let destroyed = false;

  let started = $state(false);
  let error = $state('');
  let index = $state(0);
  let matched = $state(0);
  let correct = $state(false);
  let missed = $state(false);
  let message = $state('');
  let innerHeight = $state(window.innerHeight);

  const step = $derived(steps[index]);
  const targets = $derived(step ? step.keys?.midis ?? (step.answer.kind === 'notes' ? step.answer.midis : []) : []);
  const marks = $derived.by(() => {
    const m: Record<number, 'correct'> = {};
    if (!step) return m;
    if (correct) for (const k of targets) m[k] = 'correct';
    else if (step.answer.kind === 'notes') for (const k of step.answer.midis.slice(0, matched)) m[k] = 'correct';
    return m;
  });
  const staffView = $derived.by((): StaffView | null => {
    if (!step?.staff) return null;
    return {
      ...step.staff,
      items: step.staff.items.map((item, i) => ({ ...item, highlight: correct || i < matched ? 'correct' : null })),
    };
  });

  function sync() {
    index = session.index;
    matched = session.matched;
    correct = session.state === 'correct';
    missed = session.missed;
  }

  function heardText(h: Heard): string {
    if (h.kind === 'note') return displayName(fromMidi(h.midi));
    return pitchClassNames(heardPitchClasses(h.chroma)) || 'nothing clear';
  }

  function onHeard(h: Heard) {
    const result = session.hear(h);
    if (result === 'ignored') return;
    message = result === 'wrong' ? `You played ${heardText(h)}.` : '';
    sync();
    if (result === 'correct') {
      clearTimeout(timer);
      timer = setTimeout(advance, NEXT_MS);
    }
  }

  function onFrame(f: AudioFrame) {
    const n = tracker.push(f);
    if (n) onHeard({ kind: 'note', midi: n.midi, time: n.time });
    const c = chordTracker.push(f);
    if (c) onHeard({ kind: 'chord', chroma: c.chroma, time: c.time });
  }

  function advance() {
    clearTimeout(timer);
    session.next();
    tracker.reset();
    chordTracker.reset();
    message = '';
    sync();
    if (session.state === 'done') finish();
  }

  function finish() {
    void mic?.close();
    mic = null;
    onDone();
  }

  async function start() {
    if (starting || started) return;
    starting = true;
    error = '';
    let m: Mic;
    try {
      m = await Mic.open();
    } catch (e) {
      error = micErrorMessage(e);
      starting = false;
      return;
    }
    if (destroyed) {
      void m.close();
      return;
    }
    mic = m;
    m.setTuningOffset(tuningOffset);
    m.onFrame = onFrame;
    m.start();
    started = true;
    starting = false;
  }

  onDestroy(() => {
    destroyed = true;
    clearTimeout(timer);
    void mic?.close();
  });
</script>

<svelte:window bind:innerHeight />

{#if !started}
  <div class="center">
    <p>Try it at the piano: {steps.length} short steps. Take your time — there is no score.</p>
    <button class="primary big" onclick={start}>Tap to start</button>
    {#if error}
      <p class="error">{error}</p>
      <button onclick={onDone}>Skip to the checkpoint</button>
    {/if}
  </div>
{:else if step}
  <p class="count">Step {index + 1} of {steps.length}</p>
  <p class="prompt">{step.prompt}</p>
  {#if staffView}<Staff view={staffView} maxHeight={Math.round(innerHeight * 0.3)} />{/if}
  {#if targets.length > 0}
    <Keyboard
      highlight={missed && !correct ? targets : []}
      {marks}
      labels={missed || correct ? step.keys?.labels : undefined}
      range={keyboardRange(targets)}
    />
  {/if}
  <p class="message">{correct ? 'Nice!' : message}</p>
  {#if missed && !correct}<p class="hint"><strong>Hint:</strong> {step.hint}</p>{/if}
  <div class="actions"><button onclick={advance}>Skip →</button></div>
{/if}

<style>
  .center { display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-top: 3rem; text-align: center; }
  .count { color: var(--muted); margin: 0; }
  .prompt { font-size: 1.8rem; font-weight: 600; margin: 0.5rem 0; }
  .message { font-size: 1.3rem; min-height: 1.8rem; }
  .hint { color: var(--fg); background: #eef4ff; border-radius: 0.5rem; padding: 0.75rem 1rem; }
  .actions { display: flex; justify-content: flex-end; }
</style>
