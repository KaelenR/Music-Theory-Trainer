import {
  Accidental, Formatter, GhostNote, Renderer, Stave, StaveConnector, StaveNote, Voice,
  type RenderContext,
} from 'vexflow/bravura';
import { toMidi, type Note } from '../music/note';
import type { Highlight, StaffView } from './types';
import { accidentalOf, splitByStaff, toVexKey } from './vexKeys';

const LOGICAL_WIDTH = 260;

const COLORS: Record<Exclude<Highlight, null>, string> = {
  correct: '#1a9e4b',
  wrong: '#d03b3b',
  answer: '#2f6fd6',
};

// VexFlow's bravura entry registers its fonts asynchronously; wait before first draw.
export const staffReady: Promise<unknown> = Promise.all([
  document.fonts.load('30px Bravura'),
  document.fonts.load('12px Academico'),
]).catch(() => undefined);

function buildNote(notes: Note[], clef: 'treble' | 'bass', color: string | null): StaveNote | GhostNote {
  if (notes.length === 0) return new GhostNote('w');
  const sorted = [...notes].sort((a, b) => toMidi(a) - toMidi(b));
  const sn = new StaveNote({ keys: sorted.map(toVexKey), duration: 'w', clef });
  sorted.forEach((n, i) => {
    const acc = accidentalOf(n);
    if (acc) sn.addModifier(new Accidental(acc), i);
  });
  if (color) sn.setStyle({ fillStyle: color, strokeStyle: color });
  return sn;
}

function drawNotes(ctx: RenderContext, stave: Stave, note: StaveNote | GhostNote): void {
  const voice = new Voice({ numBeats: 4, beatValue: 4 }).addTickables([note]);
  new Formatter().joinVoices([voice]).formatToStave([voice], stave);
  voice.draw(ctx, stave);
}

export function renderStaff(
  el: HTMLElement,
  view: StaffView,
  pixelWidth: number,
  maxPixelHeight?: number,
): void {
  el.innerHTML = '';
  const grand = view.clef === 'grand';
  const logicalHeight = grand ? 280 : 170;
  const scale =
    maxPixelHeight != null
      ? Math.min(pixelWidth / LOGICAL_WIDTH, maxPixelHeight / logicalHeight)
      : pixelWidth / LOGICAL_WIDTH;
  const renderer = new Renderer(el as HTMLDivElement, Renderer.Backends.SVG);
  renderer.resize(LOGICAL_WIDTH * scale, logicalHeight * scale);
  const ctx = renderer.getContext();
  ctx.scale(scale, scale);

  const color = view.highlight ? COLORS[view.highlight] : null;
  const parts = splitByStaff(view);
  const x = 20;
  const w = LOGICAL_WIDTH - 30;

  if (view.clef === 'grand') {
    const treble = new Stave(x, 30, w).addClef('treble');
    const bass = new Stave(x, 140, w).addClef('bass');
    treble.setContext(ctx).draw();
    bass.setContext(ctx).draw();
    new StaveConnector(treble, bass).setType('brace').setContext(ctx).draw();
    new StaveConnector(treble, bass).setType('singleLeft').setContext(ctx).draw();
    new StaveConnector(treble, bass).setType('singleRight').setContext(ctx).draw();
    drawNotes(ctx, treble, buildNote(parts.treble, 'treble', color));
    drawNotes(ctx, bass, buildNote(parts.bass, 'bass', color));
  } else {
    const clef = view.clef;
    const stave = new Stave(x, 40, w).addClef(clef);
    stave.setContext(ctx).draw();
    drawNotes(ctx, stave, buildNote(parts[clef], clef, color));
  }
}
