<script lang="ts">
  import Home from './ui/Home.svelte';
  import Calibrate from './ui/Calibrate.svelte';
  import DrillSetup from './ui/DrillSetup.svelte';
  import Drill from './ui/Drill.svelte';
  import Results from './ui/Results.svelte';
  import Path from './ui/Path.svelte';
  import Library from './ui/Library.svelte';
  import Lesson from './ui/Lesson.svelte';
  import { getAllLessonProgress, getSetting, recordLessonAttempt, type LessonProgress } from './progress/db';
  import { DEFAULT_LEVELS, type Levels } from './audio/calibration';
  import type { DrillConfig } from './drill/config';
  import type { ExerciseType } from './drill/exercises';
  import type { SessionStats } from './drill/session';
  import { UNITS } from './learn/curriculum';
  import { checkpointConfig, findLesson, lessonAfter } from './learn/path';
  import { isPassing } from './learn/progress';

  type Origin = 'path' | 'library';
  interface Checkpoint {
    lessonId: string;
    origin: Origin;
  }
  type Screen =
    | { name: 'home' }
    | { name: 'calibrate' }
    | { name: 'setup'; type: ExerciseType }
    | { name: 'drill'; config: DrillConfig; run: number; checkpoint?: Checkpoint }
    | { name: 'results'; config: DrillConfig; stats: SessionStats; checkpoint?: Checkpoint & { passed: boolean; saveFailed: boolean } }
    | { name: 'path' }
    | { name: 'library' }
    | { name: 'lesson'; lessonId: string; mode: 'lesson' | 'reference' };

  let screen: Screen = $state({ name: 'home' });
  let tuningOffset = $state(0);
  let runCounter = 0;
  let levels = $state<Levels>(DEFAULT_LEVELS);
  let progress = $state(new Map<string, LessonProgress>());
  getSetting('tuningOffsetCents', 0).then((v) => (tuningOffset = v));
  getSetting<Levels>('levels', DEFAULT_LEVELS).then((v) => (levels = v));
  getAllLessonProgress().then((list) => (progress = new Map(list.map((p) => [p.lessonId, p]))));

  const home = () => (screen = { name: 'home' });
  const drill = (config: DrillConfig, checkpoint?: Checkpoint) =>
    (screen = { name: 'drill', config, run: ++runCounter, checkpoint });
  const openLesson = (lessonId: string, mode: 'lesson' | 'reference' = 'lesson') => (screen = { name: 'lesson', lessonId, mode });
  const backTo = (origin: Origin) => (screen = origin === 'path' ? { name: 'path' } : { name: 'library' });

  function startCheckpoint(lessonId: string, origin: Origin) {
    const found = findLesson(UNITS, lessonId);
    if (found) drill(checkpointConfig(found.lesson), { lessonId, origin });
  }

  async function finished(config: DrillConfig, stats: SessionStats, checkpoint?: Checkpoint) {
    if (!checkpoint) {
      screen = { name: 'results', config, stats };
      return;
    }
    const passed = isPassing(stats.correct);
    let saveFailed = false;
    try {
      const p = await recordLessonAttempt(checkpoint.lessonId, stats.correct, passed);
      progress = new Map(progress).set(p.lessonId, p);
    } catch {
      saveFailed = true;
      const prev = progress.get(checkpoint.lessonId);
      progress = new Map(progress).set(checkpoint.lessonId, {
        lessonId: checkpoint.lessonId,
        bestScore: Math.max(prev?.bestScore ?? 0, stats.correct),
        attempts: (prev?.attempts ?? 0) + 1,
        passedAt: prev?.passedAt ?? (passed ? Date.now() : null),
      });
    }
    screen = { name: 'results', config, stats, checkpoint: { ...checkpoint, passed, saveFailed } };
  }
</script>

{#if screen.name === 'home'}
  <Home
    {tuningOffset}
    onLearn={() => (screen = { name: 'path' })}
    onDrill={(type) => (screen = { name: 'setup', type })}
    onCalibrate={() => (screen = { name: 'calibrate' })}
  />
{:else if screen.name === 'calibrate'}
  <Calibrate
    {tuningOffset}
    {levels}
    onTuningChange={(c) => (tuningOffset = c)}
    onLevelsChange={(l) => (levels = l)}
    onBack={home}
  />
{:else if screen.name === 'setup'}
  {@const s = screen}
  {#key s.type}
    <DrillSetup type={s.type} onStart={drill} onBack={home} />
  {/key}
{:else if screen.name === 'drill'}
  {@const s = screen}
  {#key s.run}
    <Drill
      config={s.config}
      {tuningOffset}
      {levels}
      onFinish={(stats) => void finished(s.config, stats, s.checkpoint)}
      onExit={() => (s.checkpoint ? backTo(s.checkpoint.origin) : home())}
    />
  {/key}
{:else if screen.name === 'results'}
  {@const s = screen}
  {#if s.checkpoint}
    {@const cp = s.checkpoint}
    {@const next = cp.passed && cp.origin === 'path' ? lessonAfter(UNITS, cp.lessonId) : null}
    <Results
      stats={s.stats}
      checkpoint={cp}
      againLabel="Retake checkpoint"
      homeLabel={cp.origin === 'library' ? 'Back to library' : 'Back to lessons'}
      onAgain={() => startCheckpoint(cp.lessonId, cp.origin)}
      onHome={() => backTo(cp.origin)}
      onNext={next ? () => openLesson(next.id) : null}
    />
  {:else}
    <Results stats={s.stats} onAgain={() => drill(s.config)} onHome={home} />
  {/if}
{:else if screen.name === 'path'}
  <Path units={UNITS} {progress} onOpen={(id) => openLesson(id)} onLibrary={() => (screen = { name: 'library' })} onBack={home} />
{:else if screen.name === 'library'}
  <Library units={UNITS} onOpen={(id) => openLesson(id, 'reference')} onBack={() => (screen = { name: 'path' })} />
{:else if screen.name === 'lesson'}
  {@const s = screen}
  {@const found = findLesson(UNITS, s.lessonId)}
  {#if found}
    {#key `${s.lessonId}:${s.mode}`}
      <Lesson
        lesson={found.lesson}
        unitTitle={found.unit.title}
        mode={s.mode}
        {tuningOffset}
        {levels}
        onCheckpoint={() => startCheckpoint(s.lessonId, s.mode === 'lesson' ? 'path' : 'library')}
        onBack={() => backTo(s.mode === 'lesson' ? 'path' : 'library')}
      />
    {/key}
  {/if}
{/if}
