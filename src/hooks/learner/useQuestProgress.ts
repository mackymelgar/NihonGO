import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CompleteQuestResult } from '@/lib/database.types';
import { useAuth } from '../useAuth';

/** Persist the current step index mid-lesson (resume support). Fire-and-forget. */
export function useSaveStepProgress() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ questId, stepIndex }: { questId: string; stepIndex: number }) => {
      if (!user) return;
      const { error } = await supabase.from('user_quest_progress').upsert(
        {
          user_id: user.id,
          quest_id: questId,
          current_step_index: stepIndex,
          status: 'in_progress',
        },
        { onConflict: 'user_id,quest_id', ignoreDuplicates: false },
      );
      if (error) throw error;
    },
  });
}

/** Complete a quest via the atomic server RPC. */
export function useCompleteQuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      questId,
      score = 1,
    }: {
      questId: string;
      score?: number;
    }): Promise<CompleteQuestResult> => {
      const { data, error } = await supabase.rpc('complete_quest', {
        p_quest_id: questId,
        p_score: score,
      });
      if (error) throw error;
      return data as CompleteQuestResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roadmap'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
