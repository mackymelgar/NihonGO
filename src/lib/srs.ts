/** Spaced-repetition scheduling (§7.2). Pure, unit-tested. Mirrored in SQL by
 * submit_review_result. */

export const MAX_STAGE = 6;

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** Interval before the next review, by SRS stage (1..6). Stage 0 = new. */
export const SRS_INTERVAL_MS: Record<number, number> = {
  1: 4 * HOUR,
  2: 1 * DAY,
  3: 3 * DAY,
  4: 7 * DAY,
  5: 14 * DAY,
  6: 30 * DAY,
};

/** Interval applied when an answer is wrong: always 4 hours. */
export const WRONG_INTERVAL_MS = 4 * HOUR;

/**
 * Next stage after a review.
 * - correct → stage + 1 (capped at 6)
 * - wrong   → stage − 2 (floored at 1)
 */
export function nextStage(stage: number, correct: boolean): number {
  if (correct) return Math.min(MAX_STAGE, stage + 1);
  return Math.max(1, stage - 2);
}

/**
 * When the next review is due. Correct advances by the new stage's interval;
 * wrong always comes back in 4 hours.
 */
export function nextReviewAt(newStage: number, correct: boolean, now: Date = new Date()): Date {
  const ms = correct ? (SRS_INTERVAL_MS[newStage] ?? SRS_INTERVAL_MS[1]) : WRONG_INTERVAL_MS;
  return new Date(now.getTime() + ms);
}

/**
 * A learned item is "forgotten" (display state, prioritized first in the queue)
 * when it is overdue by more than 2× its stage interval.
 */
export function isForgotten(
  stage: number,
  nextReview: string | Date | null,
  now: Date = new Date(),
): boolean {
  if (!nextReview || stage < 1) return false;
  const due = typeof nextReview === 'string' ? new Date(nextReview) : nextReview;
  const interval = SRS_INTERVAL_MS[stage] ?? SRS_INTERVAL_MS[1];
  return now.getTime() - due.getTime() > 2 * interval;
}

/** Is the item due for review now? */
export function isDue(nextReview: string | Date | null, now: Date = new Date()): boolean {
  if (!nextReview) return false;
  const due = typeof nextReview === 'string' ? new Date(nextReview) : nextReview;
  return due.getTime() <= now.getTime();
}
