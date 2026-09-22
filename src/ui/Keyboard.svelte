<script lang="ts">
  import { keyboardLayout, keyboardRange, type KeyRect } from './keyboardLayout';

  let { highlight = [], marks = {}, labels = {}, range }: {
    highlight?: number[];
    marks?: Record<number, 'correct' | 'wrong'>;
    labels?: Record<number, string>;
    range?: { low: number; high: number };
  } = $props();

  const WHITE_HEIGHT = 100;
  const BLACK_HEIGHT = 62;

  const r = $derived(range ?? keyboardRange([...highlight, ...Object.keys(marks).map(Number)]));
  const layout = $derived(keyboardLayout(r.low, r.high));

  function fill(k: KeyRect): string {
    const mark = marks[k.midi];
    if (mark === 'correct') return 'var(--correct)';
    if (mark === 'wrong') return 'var(--wrong)';
    if (highlight.includes(k.midi)) return 'var(--accent)';
    return k.black ? '#1f2a44' : '#ffffff';
  }

  function colored(k: KeyRect): boolean {
    return k.black || marks[k.midi] !== undefined || highlight.includes(k.midi);
  }
</script>

<svg class="keyboard" viewBox="-1 -1 {layout.width + 2} {WHITE_HEIGHT + 2}" role="img" aria-label="Piano keyboard">
  {#each layout.keys as k (k.midi)}
    <rect x={k.x} y="0" width={k.width} height={k.black ? BLACK_HEIGHT : WHITE_HEIGHT} rx="2" fill={fill(k)} stroke="#1f2a44" stroke-width="1" />
    {#if labels[k.midi]}
      <text
        x={k.x + k.width / 2}
        y={k.black ? BLACK_HEIGHT - 6 : WHITE_HEIGHT - 8}
        text-anchor="middle"
        font-size={k.black ? 7 : 10}
        fill={colored(k) ? '#ffffff' : '#1f2a44'}
      >{labels[k.midi]}</text>
    {/if}
  {/each}
</svg>

<style>
  .keyboard { display: block; width: 100%; max-width: 520px; height: auto; margin: 0.5rem auto; }
</style>
