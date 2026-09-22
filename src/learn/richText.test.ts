import { describe, expect, it } from 'vitest';
import { parseRichText } from './richText';

describe('parseRichText', () => {
  it('splits paragraphs on blank lines and marks bold', () => {
    expect(parseRichText('A **bold** word.\n\nSecond para.')).toEqual([
      [{ text: 'A ', bold: false }, { text: 'bold', bold: true }, { text: ' word.', bold: false }],
      [{ text: 'Second para.', bold: false }],
    ]);
  });
  it('treats stray asterisks as text', () => {
    expect(parseRichText('5 * 3')).toEqual([[{ text: '5 * 3', bold: false }]]);
  });
});
