import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ActivityChoiceRow, BossAttemptResult, QuestRow, UserQuestProgressRow } from '@/lib/database.types';
import type { PlayerActivity } from './useQuestPlayer';
import { useAuth } from '../useAuth';

export type BossData = {
  quest: QuestRow;
  activities: PlayerActivity[];
  progress: UserQuestProgressRow | null;
};

/** Loads a boss quest and its mixed activities for the exam runner. */
export function useBossChallenge(slug: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['boss', slug],
    enabled: Boolean(slug),
    queryFn: async (): Promise<BossData> => {
      const quest = await supabase
        .from('quests')
        .select('*')
        .eq('slug', slug!)
        .eq('status', 'published')
        .is('deleted_at', null)
        .single();
      if (quest.error) throw quest.error;

      const [activities, progress] = await Promise.all([
        supabase
          .from('activities')
          .select('*, choices:activity_choices(*)')
          .eq('quest_id', quest.data.id)
          .eq('status', 'published')
          .is('deleted_at', null)
          .order('sort_order'),
        user
          ? supabase
              .from('user_quest_progress')
              .select('*')
              .eq('user_id', user.id)
              .eq('quest_id', quest.data.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (activities.error) throw activities.error;

      const acts = (activities.data as unknown as PlayerActivity[]).map((a) => ({
        ...a,
        choices: [...((a as { choices?: ActivityChoiceRow[] }).choices ?? [])].sort(
          (x, y) => x.sort_order - y.sort_order,
        ),
      }));

      return {
        quest: quest.data,
        activities: acts,
        progress: (progress.data as UserQuestProgressRow | null) ?? null,
      };
    },
  });
}

export type BossAnswers = Record<string, { answer: string | null; client_correct: boolean }>;

export function useSubmitBoss() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      questId,
      answers,
    }: {
      questId: string;
      answers: BossAnswers;
    }): Promise<BossAttemptResult> => {
      const { data, error } = await supabase.rpc('submit_boss_attempt', {
        p_quest_id: questId,
        p_answers: answers,
      });
      if (error) throw error;
      return data as BossAttemptResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roadmap'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['due-count'] });
    },
  });
}
