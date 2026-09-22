<script lang="ts">
  import { INTERVAL_CLEF_RANGES, intervalCandidates, type IntervalDirection, type IntervalSettings } from '../../drill/intervals';
  import { INTERVAL_NAMES, INTERVALS } from '../../music/interval';
  import { parseNote, toMidi } from '../../music/note';
  import type { StaffClef } from '../../staff/types';
  import { CLEF_CHOICES, RANGE_NOTES, toggle } from './choices';

  let { settings = $bindable() }: { settings: IntervalSettings } = $props();

  const DIRECTIONS: { value: IntervalDirection; label: string }[] = [
    { value: 'up', label: 'Up' },
    { value: 'down', label: 'Down' },
    { value: 'both', label: 'Both' },
  ];

  const poolSize = $derived(
    toMidi(parseNote(settings.low)) <= toMidi(parseNote(settings.high)) ? intervalCandidates(settings).length : 0,
  );

  function setClef(c: StaffClef) {
    settings.clef = c;
    settings.low = INTERVAL_CLEF_RANGES[c].low;
    settings.high = INTERVAL_CLEF_RANGES[c].high;
  }
</script>

<section>
  <h2>Intervals</h2>
  <div class="seg">
    {#each INTERVAL_NAMES as name}
      <button class:selected={settings.intervals.includes(name)} onclick={() => (settings.intervals = toggle(settings.intervals, name))}>
        {INTERVALS[name].label}
      </button>
    {/each}
  </div>
</section>

<section>
  <h2>Direction</h2>
  <div class="seg">
    {#each DIRECTIONS as d}
      <button class:selected={settings.direction === d.value} onclick={() => (settings.direction = d.value)}>{d.label}</button>
    {/each}
  </div>
  <label class="check"><input type="checkbox" bind:checked={settings.harmonic} /> Play both notes together</label>
  <label class="check"><input type="checkbox" bind:checked={settings.showTarget} /> Show both notes (reading practice)</label>
</section>

<section>
  <h2>Clef &amp; starting notes</h2>
  <div class="seg">
    {#each CLEF_CHOICES as c}
      <button class:selected={settings.clef === c.value} onclick={() => setClef(c.value)}>{c.label}</button>
    {/each}
  </div>
  <label>From <select bind:value={settings.low}>{#each RANGE_NOTES as n}<option value={n}>{n}</option>{/each}</select></label>
  <label>to <select bind:value={settings.high}>{#each RANGE_NOTES as n}<option value={n}>{n}</option>{/each}</select></label>
  <span class="muted">{poolSize} intervals</span>
</section>
