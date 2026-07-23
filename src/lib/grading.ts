/** Pure answer-grading per activity type (§6). Unit-tested. */
import { normalizeAnswer, levenshtein } from './kana';

export type GradeResult = {
  correct: boolean;
  /** True when wrong but within edit-distance 1 → kinder feedback. */
  almost: boolean;
};

/** Typed / fill-in-blank: accept the correct answer or any alternate, in kana
 * or romaji, after normalization. */
export function gradeTyped(
  userAnswer: string,
  correctAnswer: string | null,
  acceptedAnswers: string[] = [],
): GradeResult {
  const user = normalizeAnswer(userAnswer);
  if (!user) return { correct: false, almost: false };
  const targets = [correctAnswer, ...acceptedAnswers]
    .filter((t): t is string => Boolean(t))
    .map(normalizeAnswer);

  if (targets.some((t) => t === user)) return { correct: true, almost: false };
  const almost = targets.some((t) => levenshtein(t, user) === 1);
  return { correct: false, almost };
}

/** Multiple choice / listen-and-choose: the chosen option must be correct. */
export function gradeChoice(chosen: { is_correct: boolean } | null | undefined): GradeResult {
  return { correct: Boolean(chosen?.is_correct), almost: false };
}

/** Sentence builder: the arranged token order must equal the target order. */
export function gradeSentence(arranged: string[], target: string[]): GradeResult {
  const correct =
    arranged.length === target.length && arranged.every((t, i) => t === target[i]);
  return { correct, almost: false };
}

/** Match-pair: every pair the learner made must share its match_key. A single
 * mismatch fails the whole item. */
export function gradeMatchPairs(
  pairs: { keyA: string; keyB: string }[],
  expectedCount: number,
): GradeResult {
  if (pairs.length < expectedCount) return { correct: false, almost: false };
  const correct = pairs.every((p) => p.keyA === p.keyB);
  return { correct, almost: false };
}
