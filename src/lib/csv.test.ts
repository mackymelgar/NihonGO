import { describe, it, expect } from 'vitest';
import { parseCsv, parseCsvToObjects } from './csv';

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('handles quoted fields with commas and newlines', () => {
    const out = parseCsv('name,note\n"Smith, J","line1\nline2"');
    expect(out).toEqual([
      ['name', 'note'],
      ['Smith, J', 'line1\nline2'],
    ]);
  });

  it('handles doubled quotes', () => {
    expect(parseCsv('x\n"say ""hi"""')).toEqual([['x'], ['say "hi"']]);
  });

  it('maps to objects by header', () => {
    const objs = parseCsvToObjects('japanese_text,romaji\nあ,a\nい,i');
    expect(objs).toEqual([
      { japanese_text: 'あ', romaji: 'a' },
      { japanese_text: 'い', romaji: 'i' },
    ]);
  });
});
