<script lang="ts">
  import Home from './ui/Home.svelte';
  import Calibrate from './ui/Calibrate.svelte';
  import { getSetting } from './progress/db';

  type Screen = { name: 'home' } | { name: 'calibrate' };

  let screen: Screen = $state({ name: 'home' });
  let tuningOffset = $state(0);
  getSetting('tuningOffsetCents', 0).then((v) => (tuningOffset = v));
</script>

{#if screen.name === 'home'}
  <Home {tuningOffset} onDrill={null} onCalibrate={() => (screen = { name: 'calibrate' })} />
{:else if screen.name === 'calibrate'}
  <Calibrate
    {tuningOffset}
    onTuningChange={(c) => (tuningOffset = c)}
    onBack={() => (screen = { name: 'home' })}
  />
{/if}
