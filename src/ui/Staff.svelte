<script lang="ts">
  import { renderStaff, staffReady } from '../staff/renderStaff';
  import type { StaffView } from '../staff/types';

  let { view, maxHeight }: { view: StaffView; maxHeight?: number } = $props();

  let el: HTMLDivElement | undefined = $state();
  let width = $state(0);
  let ready = $state(false);
  staffReady.then(() => (ready = true));

  const effectiveMaxHeight = $derived(maxHeight ?? Math.round(window.innerHeight * 0.6));

  $effect(() => {
    if (el && ready && width > 0) renderStaff(el, view, width, effectiveMaxHeight);
  });
</script>

<div class="staff" bind:this={el} bind:clientWidth={width}></div>

<style>
  .staff { width: 100%; max-width: 900px; margin: 0 auto; display: flex; justify-content: center; }
</style>
