import { describe, it, expect } from 'vitest';
import { romajiToHiragana, katakanaToHiragana, normalizeAnswer, levenshtein } from './kana';

describe('romajiToHiragana', () => {
  it('converts basic vowels and syllables', () => {
    expect(romajiToHiragana('aiueo')).toBe('あいうえお');
    expect(romajiToHiragana('konnichiwa')).toBe('こんにちわ');
  });

  it('handles shi/si, tsu/tu, chi variants', () => {
    expect(romajiToHiragana('shi')).toBe('し');
    expect(romajiToHiragana('si')).toBe('し');
    expect(romajiToHiragana('tsu')).toBe('つ');
    expect(romajiToHiragana('tu')).toBe('つ');
    expect(romajiToHiragana('chi')).toBe('ち');
  });

  it('handles digraphs', () => {
    expect(romajiToHiragana('kya')).toBe('きゃ');
    expect(romajiToHiragana('sha')).toBe('しゃ');
    expect(romajiToHiragana('jyu')).toBe('じゅ');
  });

  it('handles double consonants (small tsu)', () => {
    expect(romajiToHiragana('kitte')).toBe('きって');
    expect(romajiToHiragana('gakkou')).toBe('がっこう');
  });

  it('handles n and n-apostrophe', () => {
    expect(romajiToHiragana('hon')).toBe('ほん');
    expect(romajiToHiragana("hon'ya")).toBe('ほんや');
    expect(romajiToHiragana('sensei')).toBe('せんせい');
  });
});

describe('katakanaToHiragana', () => {
  it('shifts the block', () => {
    expect(katakanaToHiragana('アイウエオ')).toBe('あいうえお');
    expect(katakanaToHiragana('コーヒー')).toBe('こーひー');
  });
});

describe('normalizeAnswer', () => {
  it('makes romaji, katakana, and hiragana comparable', () => {
    const target = normalizeAnswer('こんにちは');
    // Note: は particle vs wa sound — こんにちは normalizes to こんにちは
    expect(normalizeAnswer('konnichiha')).toBe(target);
  });

  it('resolves long-vowel marks', () => {
    expect(normalizeAnswer('コーヒー')).toBe(normalizeAnswer('こうひい'));
  });

  it('macron equals doubled vowel', () => {
    expect(normalizeAnswer('arigatō')).toBe(normalizeAnswer('arigatou'));
  });

  it('ignores spacing, case and punctuation', () => {
    expect(normalizeAnswer('  Su Shi! ')).toBe(normalizeAnswer('すし'));
  });
});

describe('levenshtein', () => {
  it('measures edit distance', () => {
    expect(levenshtein('shi', 'shi')).toBe(0);
    expect(levenshtein('shi', 'si')).toBe(1);
    expect(levenshtein('cat', 'dog')).toBe(3);
  });
});
