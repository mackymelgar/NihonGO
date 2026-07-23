import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AnswerLogRow, LearningItemRow, UserItemMasteryRow } from '@/lib/database.types';
import { isForgotten } from '@/lib/srs';
import { useAuth } from '../useAuth';

export type LibraryEntry = UserItemMasteryRow & {
  item: LearningItemRow;
  /** Display state with the computed `forgotten` override applied. */
  displayState: UserItemMasteryRow['state'];
};

/** All items the learner has unlocked, with mastery + computed forgotten state. */
export function useLibrary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['library', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<LibraryEntry[]> => {
      const { data, error } = await supabase
        .from('user_item_mastery')
        .select('*, item:learning_items(*)')
        .eq('user_id', user!.id)
        .order('unlocked_at', { ascending: false });
      if (error) throw error;
      const now = new Date();
      return (data as unknown as (UserItemMasteryRow & { item: LearningItemRow })[])
        .filter((r) => r.item)
        .map((r) => ({
          ...r,
          displayState: isForgotten(r.srs_stage, r.next_review_at, now) ? 'forgotten' : r.state,
        }));
    },
  });
}

export type ItemDetail = {
  mastery: UserItemMasteryRow;
  item: LearningItemRow;
  history: Pick<AnswerLogRow, 'is_correct' | 'answered_at'>[];
};

export function useItemDetail(itemId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['library-item', user?.id, itemId],
    enabled: Boolean(user?.id && itemId),
    queryFn: async (): Promise<ItemDetail> => {
      const [mastery, history] = await Promise.all([
        supabase
          .from('user_item_mastery')
          .select('*, item:learning_items(*)')
          .eq('user_id', user!.id)
          .eq('item_id', itemId!)
          .single(),
        supabase
          .from('answer_logs')
          .select('is_correct, answered_at')
          .eq('user_id', user!.id)
          .eq('item_id', itemId!)
          .order('answered_at', { ascending: false })
          .limit(30),
      ]);
      if (mastery.error) throw mastery.error;
      const row = mastery.data as unknown as UserItemMasteryRow & { item: LearningItemRow };
      return {
        mastery: row,
        item: row.item,
        history: (history.data ?? []).reverse(),
      };
    },
  });
}
