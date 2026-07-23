import type { GradeResult } from '@/lib/grading';
import type { PlayerActivity } from '@/hooks/learner/useQuestPlayer';

/** Contract every activity component implements. It collects one answer and
 * calls `onAnswer` exactly once with the grade + the raw user answer string. */
export type QuizActivityProps = {
  activity: PlayerActivity;
  disabled: boolean;
  /** Highlight the correct answer (lesson/review feedback; false in boss mode). */
  reveal: boolean;
  onAnswer: (result: GradeResult, rawAnswer: string) => void;
};
