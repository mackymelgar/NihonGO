import { describe, it, expect } from 'vitest';
import { scoreSpeech, SPEECH_PASS } from './speechScore';

describe('scoreSpeech', () => {
  it('scores an exact kana match as perfect', () => {
    const r = scoreSpeech('わたし', ['私', 'わたし']);
    expect(r.similarity).toBe(1);
    expect(r.correct).toBe(true);
  });

  it('matches the kanji target when the recognizer returns kanji', () => {
    const r = scoreSpeech('私', ['私', 'わたし']);
    expect(r.correct).toBe(true);
  });

  it('accepts romaji-ish transcripts via normalization', () => {
    // "arigatou" normalizes to the same canonical form as ありがとう.
    expect(scoreSpeech('arigatou', 'ありがとう').correct).toBe(true);
  });

  it('fails an empty transcript', () => {
    expect(scoreSpeech('', 'わたし')).toEqual({ correct: false, similarity: 0 });
  });

  it('gives partial credit below threshold for a near miss', () => {
    const r = scoreSpeech('こんにち', 'こんにちは'); // dropped a mora
    expect(r.similarity).toBeGreaterThan(0);
    expect(r.similarity).toBeLessThan(1);
  });

  it('keeps the best of several targets', () => {
    const r = scoreSpeech('ねこ', ['いぬ', 'ねこ']);
    expect(r.correct).toBe(true);
  });

  it('exposes a sane pass threshold', () => {
    expect(SPEECH_PASS).toBeGreaterThan(0);
    expect(SPEECH_PASS).toBeLessThan(1);
  });
});
