import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { ActivityType, SkillType } from '@/lib/database.types';
import { useAuth } from '../useAuth';

export type AnswerLogInput = {
  activityId?: string | null;
  itemId?: string | null;
  questId?: string | null;
  context: 'lesson' | 'review' | 'boss' | 'daily';
  activityType: ActivityType;
  skills: SkillType[];
  isCorrect: boolean;
  userAnswer?: string | null;
  responseMs?: number | null;
};

/** Fire-and-forget answer logging. Never throws to the caller (a failed log
 * must not interrupt the lesson). */
export function useLogAnswer() {
  const { user } = useAuth();
  return useCallback(
    (input: AnswerLogInput) => {
      if (!user) return;
      void supabase
        .from('answer_logs')
        .insert({
          user_id: user.id,
          activity_id: input.activityId ?? null,
          item_id: input.itemId ?? null,
          quest_id: input.questId ?? null,
          context: input.context,
          activity_type: input.activityType,
          skills: input.skills,
          is_correct: input.isCorrect,
          user_answer: input.userAnswer ?? null,
          response_ms: input.responseMs ?? null,
        })
        .then(({ error }) => {
          if (error) console.warn('answer log failed', error.message);
        });
    },
    [user],
  );
}
