/** Pronunciation scoring for the speaking skill. Pure, unit-tested.
 *
 * A ja-JP speech recognizer may transcribe the same utterance as kana or kanji
 * (e.g. わたし vs 私), so we score against every acceptable target and keep the
 * best match. Comparison runs through the shared kana normalizer. */
import { normalizeAnswer, levenshtein } from './kana';

export type SpeechScore = { correct: boolean; similarity: number };

/** Similarity threshold above which a spoken answer counts as correct. */
export const SPEECH_PASS = 0.6;

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const dist = levenshtein(a, b);
  return Math.max(0, 1 - dist / Math.max(a.length, b.length));
}

/**
 * Score a transcript against one or more acceptable targets (japanese and/or
 * kana). Returns the best similarity found and whether it passes.
 */
export function scoreSpeech(transcript: string, targets: string | string[]): SpeechScore {
  const spoken = normalizeAnswer(transcript);
  if (!spoken) return { correct: false, similarity: 0 };

  const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
  let best = 0;
  for (const target of list) {
    best = Math.max(best, similarity(spoken, normalizeAnswer(target)));
  }
  return { correct: best >= SPEECH_PASS, similarity: best };
}
