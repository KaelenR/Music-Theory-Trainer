<script lang="ts">
  import { chordCandidates, type ChordSettings } from '../../drill/chords';
  import { CHORD_QUALITIES, CHORD_QUALITY_NAMES } from '../../music/chord';
  import { CLEF_CHOICES, toggle } from './choices';

  let { settings = $bindable() }: { settings: ChordSettings } = $props();

  const poolSize = $derived(chordCandidates(settings).length);
</script>

<section>
  <h2>Chord types</h2>
  <div class="seg">
    {#each CHORD_QUALITY_NAMES as q}
      <button class:selected={settings.qualities.includes(q)} onclick={() => (settings.qualities = toggle(settings.qualities, q))}>
        {CHORD_QUALITIES[q].label}
      </button>
    {/each}
  </div>
  <span class="muted">{poolSize} chords</span>
</section>

<section>
  <h2>Show</h2>
  <div class="seg">
    <button class:selected={!settings.showName} onclick={() => (settings.showName = false)}>Notes on the staff</button>
    <button class:selected={settings.showName} onclick={() => (settings.showName = true)}>Chord name only</button>
  </div>
  <label class="check"><input type="checkbox" bind:checked={settings.accidentalRoots} /> Include B♭, E♭, A♭, D♭, F♯ roots</label>
  <label class="check"><input type="checkbox" bind:checked={settings.inversions} disabled={settings.showName} /> Inversions</label>
</section>

<section>
  <h2>Clef</h2>
  <div class="seg">
    {#each CLEF_CHOICES as c}
      <button class:selected={settings.clef === c.value} onclick={() => (settings.clef = c.value)}>{c.label}</button>
    {/each}
  </div>
</section>
