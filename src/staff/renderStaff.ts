import {
  Accidental, Formatter, GhostNote, Renderer, Stave, StaveConnector, StaveNote, Voice,
  type RenderContext,
} from 'vexflow/bravura';
import { toMidi, type Note } from '../music/note';
import type { Highlight, StaffClef, StaffView } from './types';
import { accidentalsFor, staffForNote, toVexKey, type AccidentalCode } from './vexKeys';

const SINGLE_ITEM_WIDTH = 260;
const SEQUENCE_BASE_WIDTH = 110;
const WIDTH_PER_ITEM = 38;
const WIDTH_PER_KEY_ACCIDENTAL = 9;

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

interface Placed {
  note: Note;
  accidental: AccidentalCode | null;
}

function logicalWidth(view: StaffView): number {
  const keyAccidentals = view.keySignature ? Object.keys(view.keySignature.alters).length : 0;
  const n = view.items.length;
  const notesWidth = n <= 1 ? SINGLE_ITEM_WIDTH : SEQUENCE_BASE_WIDTH + WIDTH_PER_ITEM * n;
  return notesWidth + keyAccidentals * WIDTH_PER_KEY_ACCIDENTAL;
}

function placeOn(clef: StaffClef, note: Note): 'treble' | 'bass' {
  return clef === 'grand' ? staffForNote(note) : clef;
}

function buildNote(
  placed: Placed[],
  clef: 'treble' | 'bass',
  duration: string,
  highlight: Highlight | undefined,
): StaveNote | GhostNote {
  if (placed.length === 0) return new GhostNote(duration);
  const sorted = [...placed].sort((a, b) => toMidi(a.note) - toMidi(b.note));
  const sn = new StaveNote({ keys: sorted.map((p) => toVexKey(p.note)), duration, clef });
  sorted.forEach((p, i) => {
    if (p.accidental) sn.addModifier(new Accidental(p.accidental), i);
  });
  if (highlight) sn.setStyle({ fillStyle: COLORS[highlight], strokeStyle: COLORS[highlight] });
  return sn;
}

function voiceFor(view: StaffView, staff: 'treble' | 'bass', stave: Stave): Voice {
  const duration = view.items.length > 1 ? 'q' : 'w';
  const accidentals = accidentalsFor(view.items.map((i) => i.notes), view.keySignature?.alters);
  const tickables = view.items.map((item, i) =>
    buildNote(
      item.notes
        .map((note, j) => ({ note, accidental: accidentals[i][j] }))
        .filter((p) => placeOn(view.clef, p.note) === staff),
      staff,
      duration,
      item.highlight,
    ),
  );
  const voice = new Voice({ numBeats: 4, beatValue: 4 });
  voice.setMode(Voice.Mode.SOFT);
  voice.addTickables(tickables.length > 0 ? tickables : [new GhostNote('w')]);
  voice.setStave(stave);
  return voice;
}

function stave(ctx: RenderContext, clef: 'treble' | 'bass', y: number, width: number, view: StaffView): Stave {
  const s = new Stave(20, y, width - 30).addClef(clef);
  if (view.keySignature) s.addKeySignature(view.keySignature.vexKey);
  s.setContext(ctx);
  return s;
}

export function renderStaff(
  el: HTMLElement,
  view: StaffView,
  pixelWidth: number,
  maxPixelHeight?: number,
): void {
  el.innerHTML = '';
  const width = logicalWidth(view);
  const height = view.clef === 'grand' ? 280 : 170;
  const scale =
    maxPixelHeight != null
      ? Math.min(pixelWidth / width, maxPixelHeight / height)
      : pixelWidth / width;
  const renderer = new Renderer(el as HTMLDivElement, Renderer.Backends.SVG);
  renderer.resize(width * scale, height * scale);
  const ctx = renderer.getContext();
  ctx.scale(scale, scale);

  if (view.clef === 'grand') {
    const treble = stave(ctx, 'treble', 30, width, view);
    const bass = stave(ctx, 'bass', 140, width, view);
    Stave.formatBegModifiers([treble, bass]);
    treble.draw();
    bass.draw();
    new StaveConnector(treble, bass).setType('brace').setContext(ctx).draw();
    new StaveConnector(treble, bass).setType('singleLeft').setContext(ctx).draw();
    new StaveConnector(treble, bass).setType('singleRight').setContext(ctx).draw();
    const tv = voiceFor(view, 'treble', treble);
    const bv = voiceFor(view, 'bass', bass);
    new Formatter()
      .joinVoices([tv])
      .joinVoices([bv])
      .format([tv, bv], treble.getNoteEndX() - treble.getNoteStartX() - 10);
    tv.draw(ctx, treble);
    bv.draw(ctx, bass);
  } else {
    const s = stave(ctx, view.clef, 40, width, view);
    s.draw();
    const v = voiceFor(view, view.clef, s);
    new Formatter().joinVoices([v]).formatToStave([v], s);
    v.draw(ctx, s);
  }
}
