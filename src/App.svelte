<script lang="ts">
  import Home from './ui/Home.svelte';
  import Calibrate from './ui/Calibrate.svelte';
  import DrillSetup from './ui/DrillSetup.svelte';
  import Drill from './ui/Drill.svelte';
  import Results from './ui/Results.svelte';
  import { getSetting } from './progress/db';
  import { DEFAULT_LEVELS, type Levels } from './audio/calibration';
  import type { DrillConfig } from './drill/config';
  import type { SessionStats } from './drill/session';

  type Screen =
    | { name: 'home' }
    | { name: 'calibrate' }
    | { name: 'setup' }
    | { name: 'drill'; config: DrillConfig; run: number }
    | { name: 'results'; config: DrillConfig; stats: SessionStats };

  let screen: Screen = $state({ name: 'home' });
  let tuningOffset = $state(0);
  let runCounter = 0;
  let levels = $state<Levels>(DEFAULT_LEVELS);
  getSetting('tuningOffsetCents', 0).then((v) => (tuningOffset = v));
  getSetting<Levels>('levels', DEFAULT_LEVELS).then((v) => (levels = v));

  const home = () => (screen = { name: 'home' });
  const drill = (config: DrillConfig) => (screen = { name: 'drill', config, run: ++runCounter });
</script>

{#if screen.name === 'home'}
  <Home {tuningOffset} onDrill={() => (screen = { name: 'setup' })} onCalibrate={() => (screen = { name: 'calibrate' })} />
{:else if screen.name === 'calibrate'}
  <Calibrate
    {tuningOffset}
    {levels}
    onTuningChange={(c) => (tuningOffset = c)}
    onLevelsChange={(l) => (levels = l)}
    onBack={home}
  />
{:else if screen.name === 'setup'}
  <DrillSetup onStart={drill} onBack={home} />
{:else if screen.name === 'drill'}
  {@const s = screen}
  {#key s.run}
    <Drill
      config={s.config}
      {tuningOffset}
      {levels}
      onFinish={(stats) => (screen = { name: 'results', config: s.config, stats })}
      onExit={home}
    />
  {/key}
{:else if screen.name === 'results'}
  {@const s = screen}
  <Results stats={s.stats} onAgain={() => drill(s.config)} onHome={home} />
{/if}
