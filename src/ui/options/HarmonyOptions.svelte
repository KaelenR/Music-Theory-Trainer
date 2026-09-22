<script lang="ts">
  import { DEFAULT_HARMONY_TONICS, HARMONY_TONICS, harmonyCandidates, type HarmonySettings } from '../../drill/harmony';
  import { romanNumeral, type Mode } from '../../music/harmony';
  import { parseNote, pitchName } from '../../music/note';
  import { toggle } from './choices';

  let { settings = $bindable() }: { settings: HarmonySettings } = $props();

  const DEGREES = [1, 2, 3, 4, 5, 6, 7];
  const poolSize = $derived(harmonyCandidates(settings).length);
  const keyLabel = (t: string) => pitchName(parseNote(`${t}4`));

  function setMode(m: Mode) {
    settings.mode = m;
    settings.tonics = [...DEFAULT_HARMONY_TONICS[m]];
  }
</script>

<section>
  <h2>Key type</h2>
  <div class="seg">
    <button class:selected={settings.mode === 'major'} onclick={() => setMode('major')}>Major keys</button>
    <button class:selected={settings.mode === 'minor'} onclick={() => setMode('minor')}>Minor keys</button>
  </div>
</section>

<section>
  <h2>Keys</h2>
  <div class="seg">
    {#each HARMONY_TONICS[settings.mode] as t}
      <button class:selected={settings.tonics.includes(t)} onclick={() => (settings.tonics = toggle(settings.tonics, t))}>
        {keyLabel(t)} {settings.mode}
      </button>
    {/each}
  </div>
</section>

<section>
  <h2>Chords</h2>
  <div class="seg">
    {#each DEGREES as d}
      <button class:selected={settings.degrees.includes(d)} onclick={() => (settings.degrees = toggle(settings.degrees, d))}>
        {romanNumeral(settings.mode, d)}
      </button>
    {/each}
  </div>
  <span class="muted">{poolSize} chords</span>
</section>

<section>
  <h2>Show</h2>
  <div class="seg">
    <button class:selected={settings.showKeyName} onclick={() => (settings.showKeyName = true)}>Numeral + key name</button>
    <button class:selected={!settings.showKeyName} onclick={() => (settings.showKeyName = false)}>Numeral + key signature only</button>
  </div>
  <div class="seg" style="margin-top: 0.75rem">
    <button class:selected={settings.clef === 'treble'} onclick={() => (settings.clef = 'treble')}>Treble</button>
    <button class:selected={settings.clef === 'bass'} onclick={() => (settings.clef = 'bass')}>Bass</button>
  </div>
</section>
