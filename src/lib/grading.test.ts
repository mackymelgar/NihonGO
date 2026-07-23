import { describe, it, expect } from 'vitest';
import { gradeTyped, gradeChoice, gradeSentence, gradeMatchPairs } from './grading';

describe('gradeTyped', () => {
  it('accepts kana or romaji forms of the target', () => {
    expect(gradeTyped('shi', 'し').correct).toBe(true);
    expect(gradeTyped('し', 'し').correct).toBe(true);
    expect(gradeTyped('si', 'し').correct).toBe(true);
  });

  it('accepts alternates', () => {
    expect(gradeTyped('arigatou', 'ありがとう', ['arigatō']).correct).toBe(true);
  });

  it('flags almost when edit distance is 1', () => {
    const r = gradeTyped('しa', 'し');
    expect(r.correct).toBe(false);
    expect(r.almost).toBe(true);
  });

  it('rejects empty answers', () => {
    expect(gradeTyped('', 'し').correct).toBe(false);
  });
});

describe('gradeChoice', () => {
  it('grades by the chosen option', () => {
    expect(gradeChoice({ is_correct: true }).correct).toBe(true);
    expect(gradeChoice({ is_correct: false }).correct).toBe(false);
    expect(gradeChoice(null).correct).toBe(false);
  });
});

describe('gradeSentence', () => {
  it('requires exact token order', () => {
    expect(gradeSentence(['私', 'は', 'マック', 'です'], ['私', 'は', 'マック', 'です']).correct).toBe(true);
    expect(gradeSentence(['は', '私', 'マック', 'です'], ['私', 'は', 'マック', 'です']).correct).toBe(false);
  });
});

describe('gradeMatchPairs', () => {
  it('passes when all pairs share keys', () => {
    expect(
      gradeMatchPairs([{ keyA: 'a', keyB: 'a' }, { keyA: 'b', keyB: 'b' }], 2).correct,
    ).toBe(true);
  });
  it('fails on any mismatch or incomplete', () => {
    expect(gradeMatchPairs([{ keyA: 'a', keyB: 'b' }], 2).correct).toBe(false);
    expect(gradeMatchPairs([{ keyA: 'a', keyB: 'a' }], 2).correct).toBe(false);
  });
});
