<script lang="ts">
  import Staff from './ui/Staff.svelte';
  import { parseNote } from './music/note';
</script>

<main class="screen">
  <h1>Staff demo</h1>
  <Staff view={{ clef: 'treble', notes: [parseNote('F#5')] }} />
  <Staff view={{ clef: 'bass', notes: [parseNote('Bb2')], highlight: 'correct' }} />
  <Staff view={{ clef: 'grand', notes: [parseNote('E2'), parseNote('C4'), parseNote('A5')], highlight: 'answer' }} />
  <Staff view={{ clef: 'treble', notes: [parseNote('C6')], highlight: 'wrong' }} />
</main>
