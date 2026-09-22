<script lang="ts">
  import { candidateNotes, CLEF_DEFAULT_RANGES, type NoteReadingSettings } from '../../drill/noteReading';
  import { parseNote, toMidi } from '../../music/note';
  import type { StaffClef } from '../../staff/types';
  import { CLEF_CHOICES, RANGE_NOTES } from './choices';

  let { settings = $bindable() }: { settings: NoteReadingSettings } = $props();

  const poolSize = $derived(
    toMidi(parseNote(settings.low)) <= toMidi(parseNote(settings.high)) ? candidateNotes(settings).length : 0,
  );

  function setClef(c: StaffClef) {
    settings.clef = c;
    settings.low = CLEF_DEFAULT_RANGES[c].low;
    settings.high = CLEF_DEFAULT_RANGES[c].high;
  }
</script>

<section>
  <h2>Clef</h2>
  <div class="seg">
    {#each CLEF_CHOICES as c}
      <button class:selected={settings.clef === c.value} onclick={() => setClef(c.value)}>{c.label}</button>
    {/each}
  </div>
</section>

<section>
  <h2>Range</h2>
  <label>From <select bind:value={settings.low}>{#each RANGE_NOTES as n}<option value={n}>{n}</option>{/each}</select></label>
  <label>to <select bind:value={settings.high}>{#each RANGE_NOTES as n}<option value={n}>{n}</option>{/each}</select></label>
  <span class="muted">{poolSize} notes</span>
  <label class="check"><input type="checkbox" bind:checked={settings.accidentals} /> Sharps &amp; flats</label>
  <label class="check"><input type="checkbox" bind:checked={settings.anyOctave} /> Accept any octave</label>
</section>
