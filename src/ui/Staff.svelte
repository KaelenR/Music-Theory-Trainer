<script lang="ts">
  import { renderStaff, staffReady } from '../staff/renderStaff';
  import type { StaffView } from '../staff/types';

  let { view }: { view: StaffView } = $props();

  let el: HTMLDivElement | undefined = $state();
  let width = $state(0);
  let ready = $state(false);
  staffReady.then(() => (ready = true));

  $effect(() => {
    if (el && ready && width > 0) renderStaff(el, view, width);
  });
</script>

<div class="staff" bind:this={el} bind:clientWidth={width}></div>

<style>
  .staff { width: 100%; max-width: 900px; margin: 0 auto; }
</style>
