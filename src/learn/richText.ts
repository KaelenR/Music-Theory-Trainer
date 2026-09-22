export interface Segment {
  text: string;
  bold: boolean;
}

/** Paragraphs split on blank lines; `**bold**` spans. Plain text only — never HTML. */
export function parseRichText(text: string): Segment[][] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) =>
      p
        .split(/(\*\*[^*]+\*\*)/)
        .filter((s) => s.length > 0)
        .map((s) => (/^\*\*[^*]+\*\*$/.test(s) ? { text: s.slice(2, -2), bold: true } : { text: s, bold: false })),
    );
}
