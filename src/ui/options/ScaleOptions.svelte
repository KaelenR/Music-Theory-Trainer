<script lang="ts">
  import { scaleCandidates, type ScaleSettings } from '../../drill/scales';
  import { SCALE_TYPE_NAMES, SCALE_TYPES } from '../../music/scale';
  import { toggle } from './choices';

  let { settings = $bindable() }: { settings: ScaleSettings } = $props();

  const poolSize = $derived(scaleCandidates(settings).length);
</script>

<section>
  <h2>Scale types</h2>
  <div class="seg">
    {#each SCALE_TYPE_NAMES as t}
      <button class:selected={settings.types.includes(t)} onclick={() => (settings.types = toggle(settings.types, t))}>
        {SCALE_TYPES[t].label}
      </button>
    {/each}
  </div>
  <label class="check"><input type="checkbox" bind:checked={settings.moreKeys} /> More keys (A♭, D♭, G♭, F♯, C♯)</label>
  <span class="muted">{poolSize} scales</span>
</section>

<section>
  <h2>Play</h2>
  <div class="seg">
    <button class:selected={settings.direction === 'up'} onclick={() => (settings.direction = 'up')}>Up one octave</button>
    <button class:selected={settings.direction === 'up-down'} onclick={() => (settings.direction = 'up-down')}>Up and back down</button>
  </div>
</section>

<section>
  <h2>Show</h2>
  <div class="seg">
    <button class:selected={!settings.keySignatureOnly} onclick={() => (settings.keySignatureOnly = false)}>Notes</button>
    <button class:selected={settings.keySignatureOnly} onclick={() => (settings.keySignatureOnly = true)}>Key signature only</button>
  </div>
  <div class="seg" style="margin-top: 0.75rem">
    <button class:selected={settings.clef === 'treble'} onclick={() => (settings.clef = 'treble')}>Treble</button>
    <button class:selected={settings.clef === 'bass'} onclick={() => (settings.clef = 'bass')}>Bass</button>
  </div>
</section>
