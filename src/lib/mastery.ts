/** Four-skill mastery scoring + state derivation (§7.1, §7.3). Pure,
 * unit-tested. Mirrored in SQL by submit_review_result. */
import type { MasteryState, SkillType, UserItemMasteryRow } from './database.types';
import { nextStage, nextReviewAt } from './srs';

/** Exponential-moving-average skill-score update (§7.1). */
export function updateSkillScore(score: number, correct: boolean): number {
  const next = correct ? score + (100 - score) * 0.3 : score * 0.65;
  return Math.max(0, Math.min(100, Math.round(next * 100) / 100));
}

/** Average of the four skill scores. */
export function averageSkill(row: {
  reading_score: number;
  writing_score: number;
  listening_score: number;
  speaking_score: number;
}): number {
  return (row.reading_score + row.writing_score + row.listening_score + row.speaking_score) / 4;
}

/** The weakest of the four skills (lowest score). */
export function weakestSkill(row: {
  reading_score: number;
  writing_score: number;
  listening_score: number;
  speaking_score: number;
}): SkillType {
  const entries: [SkillType, number][] = [
    ['reading', row.reading_score],
    ['writing', row.writing_score],
    ['listening', row.listening_score],
    ['speaking', row.speaking_score],
  ];
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0][0];
}

/**
 * Derive the mastery gem state (§7.3). `forgotten` is computed at display time
 * (see srs.isForgotten) and overrides this.
 */
export function deriveMasteryState(input: {
  stage: number;
  consecutiveWrong: number;
  avgScore: number;
  everStudied: boolean;
}): MasteryState {
  if (!input.everStudied) return 'new';
  if (input.consecutiveWrong >= 2) return 'weak';
  if (input.stage >= 6 && input.avgScore >= 80) return 'mastered';
  if (input.stage >= 5) return 'strong';
  if (input.stage >= 3) return 'familiar';
  if (input.stage >= 1) return 'learning';
  return 'new';
}

export type ReviewOutcome = Pick<
  UserItemMasteryRow,
  | 'state'
  | 'reading_score'
  | 'writing_score'
  | 'listening_score'
  | 'speaking_score'
  | 'srs_stage'
  | 'consecutive_correct'
  | 'consecutive_wrong'
  | 'total_correct'
  | 'total_wrong'
  | 'next_review_at'
  | 'last_reviewed_at'
>;

/**
 * Apply one graded review answer to a mastery row and return the new field
 * values. This is the single source of truth for the review math; the SQL RPC
 * mirrors it exactly.
 */
export function applyReview(
  row: UserItemMasteryRow,
  answer: { correct: boolean; skills: SkillType[] },
  now: Date = new Date(),
): ReviewOutcome {
  const scores = {
    reading_score: row.reading_score,
    writing_score: row.writing_score,
    listening_score: row.listening_score,
    speaking_score: row.speaking_score,
  };
  const colOf: Record<SkillType, keyof typeof scores> = {
    reading: 'reading_score',
    writing: 'writing_score',
    listening: 'listening_score',
    speaking: 'speaking_score',
  };
  for (const skill of answer.skills) {
    const col = colOf[skill];
    scores[col] = updateSkillScore(scores[col], answer.correct);
  }

  const stage = nextStage(row.srs_stage, answer.correct);
  const consecutive_correct = answer.correct ? row.consecutive_correct + 1 : 0;
  const consecutive_wrong = answer.correct ? 0 : row.consecutive_wrong + 1;

  const state = deriveMasteryState({
    stage,
    consecutiveWrong: consecutive_wrong,
    avgScore: averageSkill(scores),
    everStudied: true,
  });

  return {
    ...scores,
    srs_stage: stage,
    consecutive_correct,
    consecutive_wrong,
    total_correct: row.total_correct + (answer.correct ? 1 : 0),
    total_wrong: row.total_wrong + (answer.correct ? 0 : 1),
    next_review_at: nextReviewAt(stage, answer.correct, now).toISOString(),
    last_reviewed_at: now.toISOString(),
    state,
  };
}
