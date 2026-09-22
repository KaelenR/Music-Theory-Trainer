<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Staff from './Staff.svelte';
  import { meterPercent, type Levels } from '../audio/calibration';
  import { ChordTracker } from '../audio/chordTracker';
  import { Mic, type AudioFrame } from '../audio/mic';
  import { micErrorMessage } from '../audio/micErrors';
  import { NoteTracker } from '../audio/noteTracker';
  import { describeReveal, heardPitchClasses, pitchClassNames } from '../drill/answer';
  import type { DrillConfig } from '../drill/config';
  import { createExercise } from '../drill/exercises';
  import { DrillSession, type SessionStats } from '../drill/session';
  import type { Heard, Question } from '../drill/types';
  import { displayName, fromMidi, type Note } from '../music/note';
  import type { Highlight, StaffView } from '../staff/types';

  let { config, tuningOffset, levels, onFinish, onExit }: {
    config: DrillConfig;
    tuningOffset: number;
    levels: Levels;
    onFinish: (stats: SessionStats) => void;
    onExit: () => void;
  } = $props();

  const SILENCE_HINT_MS = 5000;
  const CORRECT_MS = 450;
  // Spec calls for showing the answer "~1 s" before moving on in move-on mode.
  const REVEAL_MS = 1000;
  const WRONG_FLASH_MS = 500;

  // Config, tuning and levels are fixed for the lifetime of a drill.
  const session = new DrillSession(createExercise(config.exercise), config.session);
  const silenceRms = levels.silenceRms;
  const tracker = new NoteTracker({ tuningOffsetCents: tuningOffset, silenceRms });
  const chordTracker = new ChordTracker({ silenceRms });
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
  // Typed via $state<T | null>(...) to avoid a TS 6 + svelte-check 4.7.6 narrowing bug.
  let view = $state<StaffView | null>(null);
  let prompt = $state('');
  let feedback: 'correct' | 'wrong' | null = $state(null);
  let message = $state('');
  let correct = $state(0);
  let answered = $state(0);
  let level = $state(0);
  let silentHint = $state(false);

  /** Staff for a question; the first `greenCount` items are marked correct, the rest get `highlight`. */
  function staffView(q: Question, items: Note[][], highlight: Highlight = null, greenCount = 0): StaffView {
    return {
      clef: q.clef,
      keySignature: q.keySignature,
      items: items.map((notes, i) => ({ notes, highlight: i < greenCount ? 'correct' : highlight })),
    };
  }

  /**
   * Staff while asking: notes already played are green and, when `wrong`, the note expected next is red.
   * Questions that show nothing to play from (a key signature only) reveal the notes as they are played.
   */
  function askingView(q: Question, wrong = false): StaffView {
    const matched = session.matched;
    if (q.answer.kind === 'notes' && q.display.length === 0) {
      return staffView(q, q.reveal.slice(0, matched), null, matched);
    }
    const v = staffView(q, q.display, null, matched);
    if (wrong && matched < v.items.length) v.items[matched] = { ...v.items[matched], highlight: 'wrong' };
    return v;
  }

  function showQuestion() {
    const q = session.current!;
    view = staffView(q, q.display);
    prompt = q.prompt ?? '';
    feedback = null;
    message = '';
  }

  function syncScore() {
    const s = session.stats();
    correct = s.correct;
    answered = s.asked;
  }

  function onFrame(f: AudioFrame) {
    level = f.rms;
    if (f.rms >= silenceRms) {
      lastSound = f.time;
      silentHint = false;
    } else if (session.state === 'asking' && f.time - lastSound > SILENCE_HINT_MS) {
      silentHint = true;
    }
    const noteEvent = tracker.push(f);
    if (noteEvent) onHeard({ kind: 'note', midi: noteEvent.midi, time: noteEvent.time });
    const chordEvent = chordTracker.push(f);
    if (chordEvent) onHeard({ kind: 'chord', chroma: chordEvent.chroma, time: chordEvent.time });
  }

  function heardText(h: Heard): string {
    if (h.kind === 'note') return displayName(fromMidi(h.midi));
    return pitchClassNames(heardPitchClasses(h.chroma)) || 'nothing clear';
  }

  function onHeard(h: Heard) {
    const q = session.current;
    const result = session.hear(h);
    if (result === 'ignored' || !q) return;
    syncScore();

    if (result === 'progress') {
      view = askingView(q);
      feedback = null;
      message = '';
      return;
    }

    clearTimeout(timer);
    if (result === 'correct') {
      feedback = 'correct';
      message = '';
      view = staffView(q, q.reveal, 'correct');
      timer = setTimeout(next, CORRECT_MS);
    } else if (session.state === 'revealing') {
      feedback = 'wrong';
      message = `You played ${heardText(h)}. Answer: ${describeReveal(q)}`;
      view = staffView(q, q.reveal, 'answer');
      timer = setTimeout(next, REVEAL_MS);
    } else {
      feedback = 'wrong';
      message = `You played ${heardText(h)}. Try again.`;
      view = askingView(q, true);
      timer = setTimeout(() => {
        if (session.state === 'asking') {
          feedback = null;
          view = askingView(q);
        }
      }, WRONG_FLASH_MS);
    }
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
    session.start();
    showQuestion();
    lastSound = performance.now();
    m.start();
    started = true;
    starting = false;
    await lockScreen();
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
    {#if prompt}<p class="prompt">{prompt}</p>{/if}
    {#if view}<Staff {view} />{/if}
    <p class="message">{message}</p>
    {#if silentHint}<p class="hint">Can't hear the piano. Check that the mic isn't covered.</p>{/if}
  {/if}

  {#if suspended}
    <div class="overlay">
      <button class="primary big" onclick={resume}>Tap to resume</button>
      {#if error}<p class="error">{error}</p>{/if}
    </div>
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
  .prompt { text-align: center; font-size: 2rem; font-weight: 600; margin: 1rem 0 0; }
  .message { text-align: center; font-size: 1.5rem; min-height: 2rem; }
  .hint { text-align: center; color: var(--muted); }
  .overlay { position: fixed; inset: 0; background: rgba(251, 250, 247, 0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; }
</style>
