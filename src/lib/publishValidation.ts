/** Pure publish guard-rail checks for quests (§10 workflow). */
import type { ActivityRow, LessonStepRow, QuestRow } from './database.types';

export type ValidationIssue = { level: 'error' | 'warning'; message: string };

/**
 * Validates whether a quest is publishable. Errors block publishing; warnings
 * are advisory. `stepActivities` maps a practice step's activity_id to its row.
 */
export function validateQuestForPublish(input: {
  quest: QuestRow;
  steps: LessonStepRow[];
  activities: ActivityRow[];
  questItemCount: number;
}): ValidationIssue[] {
  const { quest, steps, activities, questItemCount } = input;
  const issues: ValidationIssue[] = [];

  if (steps.length === 0) {
    issues.push({ level: 'error', message: 'Quest has no lesson steps.' });
  }

  const practiceSteps = steps.filter((s) => s.step_type === 'practice');
  if (practiceSteps.length === 0 && activities.length === 0) {
    issues.push({ level: 'error', message: 'Quest has no practice activity.' });
  }

  // Every practice step must point at an activity that's published (or publishing).
  const activityById = new Map(activities.map((a) => [a.id, a]));
  for (const step of practiceSteps) {
    if (!step.activity_id) {
      issues.push({
        level: 'error',
        message: `Practice step "${step.title ?? step.id.slice(0, 8)}" has no activity attached.`,
      });
      continue;
    }
    const act = activityById.get(step.activity_id);
    if (act && act.status === 'draft') {
      issues.push({
        level: 'error',
        message: `Practice activity for step "${step.title ?? step.id.slice(0, 8)}" is still a draft.`,
      });
    }
  }

  // Every example step with Japanese must carry kana + TTS text.
  for (const step of steps) {
    if (step.japanese_text && (!step.kana_reading || !step.tts_text)) {
      issues.push({
        level: 'error',
        message: `Step "${step.title ?? step.id.slice(0, 8)}" has Japanese text but is missing kana reading or TTS text.`,
      });
    }
  }

  if (questItemCount === 0) {
    issues.push({
      level: quest.quest_type === 'boss' ? 'warning' : 'error',
      message: 'Quest teaches no items (nothing to schedule for review).',
    });
  }

  return issues;
}

export function hasBlockingErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.level === 'error');
}
