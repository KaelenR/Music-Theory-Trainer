<script lang="ts">
  import { parseRichText } from '../learn/richText';

  let { text }: { text: string } = $props();
  const paragraphs = $derived(parseRichText(text));
</script>

{#each paragraphs as segments}
  <p>{#each segments as s}{#if s.bold}<strong>{s.text}</strong>{:else}{s.text}{/if}{/each}</p>
{/each}
