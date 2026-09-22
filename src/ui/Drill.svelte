<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Staff from './Staff.svelte';
  import { Mic } from '../audio/mic';
  import { micErrorMessage } from '../audio/micErrors';
  import { NoteTracker, type PitchFrame } from '../audio/noteTracker';
  import { meterPercent, type Levels } from '../audio/calibration';
  import type { DrillConfig } from '../drill/config';
  import { createNoteReading } from '../drill/noteReading';
  import { DrillSession, type SessionStats } from '../drill/session';
  import { displayName, fromMidi } from '../music/note';
  import type { StaffView } from '../staff/types';

  let { config, tuningOffset, levels, onFinish, onExit }: {
    config: DrillConfig;
    tuningOffset: number;
    levels: Levels;
    onFinish: (stats: SessionStats) => void;
    onExit: () => void;
  } = $props();

  const SILENCE_HINT_MS = 5000;
  // Spec calls for showing the answer "~1 s" before moving on in move-on mode.
  const REVEAL_MS = 1000;

  // Config, tuning and levels are fixed for the lifetime of a drill.
  const session = new DrillSession(createNoteReading(config.exercise), config.session);
  const tracker = new NoteTracker({ tuningOffsetCents: tuningOffset, silenceRms: levels.silenceRms });
  const silenceRms = levels.silenceRms;
  const lengthLabel = config.session.length === 'endless' ? '' : ` / ${config.session.length}`;

  let mic: Mic | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastSound = 0;
  let starting = false;
  let destroyed = false;
  let wakeLock: WakeLockSentinel | null = null;

  let started = $state(false);
  let suspended = $state(false);
  let error = $state('');
  // Typed via $state<T | null>(...) rather than `let view: StaffView | null = $state(null)`
  // to avoid a TS 6 + svelte-check 4.7.6 narrowing bug that infers `never` for the latter form.
  let view = $state<StaffView | null>(null);
  let feedback: 'correct' | 'wrong' | null = $state(null);
  let message = $state('');
  let correct = $state(0);
  let answered = $state(0);
  let level = $state(0);
  let silentHint = $state(false);

  function showQuestion() {
    const q = session.current!;
    view = { clef: q.clef, notes: q.notes, highlight: null };
    feedback = null;
    message = '';
  }

  function syncScore() {
    const s = session.stats();
    correct = s.correct;
    answered = s.asked;
  }

  function onFrame(f: PitchFrame) {
    level = f.rms;
    if (f.rms >= silenceRms) {
      lastSound = f.time;
      silentHint = false;
    } else if (session.state === 'asking' && f.time - lastSound > SILENCE_HINT_MS) {
      silentHint = true;
    }
    const ev = tracker.push(f);
    if (ev) onNote(ev.midi, ev.time);
  }

  async function lockScreen() {
    try {
      wakeLock = (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      wakeLock = null;
    }
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
    mic.onFrame = onFrame;
    mic.onInterrupted = () => {
      if (started) suspended = true;
    };
    session.start();
    showQuestion();
    lastSound = performance.now();
    mic.start();
    started = true;
    starting = false;
    await lockScreen();
  }

  function onNote(midi: number, time: number) {
    const q = session.current;
    const result = session.hear({ midi, time });
    if (result === 'ignored' || !q || !view) return;
    syncScore();
    const played = displayName(fromMidi(midi));

    if (result === 'correct') {
      feedback = 'correct';
      message = '';
      view = { ...view, highlight: 'correct' };
      clearTimeout(timer);
      timer = setTimeout(next, 450);
    } else if (session.state === 'revealing') {
      feedback = 'wrong';
      message = `You played ${played}. Answer: ${displayName(q.notes[0])}`;
      view = { ...view, highlight: 'answer' };
      clearTimeout(timer);
      timer = setTimeout(next, REVEAL_MS);
    } else {
      feedback = 'wrong';
      message = `You played ${played}. Try again.`;
      view = { ...view, highlight: 'wrong' };
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (session.state === 'asking' && view) {
          feedback = null;
          view = { ...view, highlight: null };
        }
      }, 500);
    }
  }

  function next() {
    session.advance();
    if (session.state === 'done') {
      finish();
      return;
    }
    showQuestion();
  }

  function finish() {
    clearTimeout(timer);
    session.finish();
    void wakeLock?.release();
    wakeLock = null;
    void mic?.close();
    mic = null;
    const stats = session.stats();
    if (stats.asked === 0) onExit();
    else onFinish(stats);
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
        mic = m;
        mic.onFrame = onFrame;
        mic.onInterrupted = () => {
          if (started) suspended = true;
        };
        mic.start();
      } catch (e) {
        error = micErrorMessage(e);
        return;
      }
    }
    tracker.reset();
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

<div class="drill" class:correct={feedback === 'correct'} class:wrong={feedback === 'wrong'}>
  <header>
    <button onclick={finish}>✕ End</button>
    <span class="score">{correct} correct · {answered}{lengthLabel}</span>
    <div class="level"><div style="width: {meterPercent(level, levels)}%"></div></div>
  </header>

  {#if !started}
    <div class="center">
      <button class="primary big" onclick={start}>Tap to start</button>
      {#if error}<p class="error">{error}</p>{/if}
    </div>
  {:else}
    {#if view}<Staff {view} />{/if}
    <p class="message">{message}</p>
    {#if silentHint}<p class="hint">Can't hear the piano. Check that the mic isn't covered.</p>{/if}
  {/if}

  {#if suspended}
    <div class="overlay"><button class="primary big" onclick={resume}>Tap to resume</button></div>
  {/if}
</div>

<style>
  .drill { min-height: 100vh; padding: 1rem 1.5rem; transition: background 150ms; }
  .drill.correct { background: #e8f7ee; }
  .drill.wrong { background: #fbeaea; }
  header { display: flex; align-items: center; gap: 1.5rem; }
  .score { font-size: 1.4rem; font-weight: 600; }
  .level { flex: 1; max-width: 200px; height: 10px; background: #e5e7eb; border-radius: 5px; overflow: hidden; margin-left: auto; }
  .level div { height: 100%; background: var(--correct); }
  .center { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; }
  .message { text-align: center; font-size: 1.5rem; min-height: 2rem; }
  .hint { text-align: center; color: var(--muted); }
  .overlay { position: fixed; inset: 0; background: rgba(251, 250, 247, 0.9); display: flex; align-items: center; justify-content: center; }
</style>
