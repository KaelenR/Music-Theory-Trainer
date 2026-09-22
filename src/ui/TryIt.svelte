<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Keyboard from './Keyboard.svelte';
  import Staff from './Staff.svelte';
  import { meterPercent, type Levels } from '../audio/calibration';
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
  const SILENCE_HINT_MS = 5000;

  // Steps, tuning and levels are fixed for the lifetime of this component.
  const session = new TryItSession(steps);
  const silenceRms = levels.silenceRms;
  const tracker = new NoteTracker({ tuningOffsetCents: tuningOffset, silenceRms });
  const chordTracker = new ChordTracker({ silenceRms });

  let mic: Mic | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastSound = 0;
  let starting = false;
  let destroyed = false;
  let wakeLock: WakeLockSentinel | null = null;

  let started = $state(false);
  let suspended = $state(false);
  let level = $state(0);
  let silentHint = $state(false);
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
    level = f.rms;
    if (f.rms >= silenceRms) {
      lastSound = f.time;
      silentHint = false;
    } else if (session.state === 'asking' && f.time - lastSound > SILENCE_HINT_MS) {
      silentHint = true;
    }
    const n = tracker.push(f);
    if (n) onHeard({ kind: 'note', midi: n.midi, time: n.time });
    const c = chordTracker.push(f);
    if (c) onHeard({ kind: 'chord', chroma: c.chroma, time: c.time });
  }

  function advance() {
    clearTimeout(timer);
    // No tracker reset here (as in Drill): a note or chord still ringing after "Nice!" must not
    // be heard again as the next step's answer.
    session.next();
    message = '';
    sync();
    if (session.state === 'done') finish();
  }

  function finish() {
    clearTimeout(timer);
    void wakeLock?.release();
    wakeLock = null;
    void mic?.close();
    mic = null;
    onDone();
  }

  async function lockScreen() {
    try {
      wakeLock = (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      wakeLock = null;
    }
  }

  function attach(m: Mic) {
    mic = m;
    mic.setTuningOffset(tuningOffset);
    mic.onFrame = onFrame;
    mic.onInterrupted = () => {
      if (started) suspended = true;
    };
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
    attach(m);
    lastSound = performance.now();
    m.start();
    started = true;
    starting = false;
    await lockScreen();
  }

  function onVisibility() {
    if (document.visibilityState !== 'visible') return;
    if (started && session.state !== 'done') void lockScreen();
    if (mic && !mic.healthy) suspended = true;
  }

  async function resume() {
    try {
      await mic?.resume();
    } catch {
      // handled by the health check below
    }
    if (!mic?.healthy) {
      try {
        void mic?.close();
        const m = await Mic.open();
        attach(m);
        m.start();
      } catch (e) {
        error = micErrorMessage(e);
        return;
      }
    }
    tracker.reset();
    chordTracker.reset();
    lastSound = performance.now();
    suspended = false;
  }

  onMount(() => document.addEventListener('visibilitychange', onVisibility));
  onDestroy(() => {
    destroyed = true;
    document.removeEventListener('visibilitychange', onVisibility);
    clearTimeout(timer);
    void wakeLock?.release();
    wakeLock = null;
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
  <header>
    <p class="count">Step {index + 1} of {steps.length}</p>
    <div class="level"><div style="width: {meterPercent(level, levels)}%"></div></div>
  </header>
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
  {#if silentHint}<p class="silent">Can't hear the piano. Check that the mic isn't covered.</p>{/if}
  <div class="actions"><button onclick={advance}>Skip →</button></div>
{/if}

{#if suspended}
  <div class="overlay">
    <button class="primary big" onclick={resume}>Tap to resume</button>
    {#if error}<p class="error">{error}</p>{/if}
  </div>
{/if}

<style>
  .center { display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-top: 3rem; text-align: center; }
  header { display: flex; align-items: center; gap: 1.5rem; }
  .count { color: var(--muted); margin: 0; }
  .level { flex: 1; max-width: 200px; height: 10px; background: #e5e7eb; border-radius: 5px; overflow: hidden; margin-left: auto; }
  .level div { height: 100%; background: var(--correct); }
  .prompt { font-size: 1.8rem; font-weight: 600; margin: 0.5rem 0; }
  .message { font-size: 1.3rem; min-height: 1.8rem; }
  .hint { color: var(--fg); background: #eef4ff; border-radius: 0.5rem; padding: 0.75rem 1rem; }
  .silent { color: var(--muted); }
  .actions { display: flex; justify-content: flex-end; }
  .overlay { position: fixed; inset: 0; background: rgba(251, 250, 247, 0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; }
</style>
