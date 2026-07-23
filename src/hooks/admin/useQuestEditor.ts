import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  LearningItemRow,
  LessonStepRow,
  QuestItemRow,
  QuestRow,
} from '@/lib/database.types';

export type QuestItemWithItem = QuestItemRow & { item: LearningItemRow };

export type QuestDetail = {
  quest: QuestRow;
  steps: LessonStepRow[];
  items: QuestItemWithItem[];
};

const detailKey = (id: string) => ['admin', 'quest', id] as const;

export function useQuestDetail(questId: string | null) {
  return useQuery({
    queryKey: detailKey(questId ?? ''),
    enabled: Boolean(questId),
    queryFn: async (): Promise<QuestDetail> => {
      const [quest, steps, items] = await Promise.all([
        supabase.from('quests').select('*').eq('id', questId!).single(),
        supabase
          .from('lesson_steps')
          .select('*')
          .eq('quest_id', questId!)
          .is('deleted_at', null)
          .order('sort_order'),
        supabase
          .from('quest_items')
          .select('*, item:learning_items(*)')
          .eq('quest_id', questId!)
          .order('sort_order'),
      ]);
      if (quest.error) throw quest.error;
      if (steps.error) throw steps.error;
      if (items.error) throw items.error;
      return {
        quest: quest.data,
        steps: steps.data,
        items: items.data as unknown as QuestItemWithItem[],
      };
    },
  });
}

function useInvalidateQuest() {
  const qc = useQueryClient();
  return (questId: string) => qc.invalidateQueries({ queryKey: detailKey(questId) });
}

// ---------- Lesson steps ----------
export function useSaveLessonStep() {
  const invalidate = useInvalidateQuest();
  return useMutation({
    mutationFn: async (
      input: Partial<LessonStepRow> & Pick<LessonStepRow, 'quest_id' | 'step_type'>,
    ) => {
      const { data, error } = input.id
        ? await supabase
            .from('lesson_steps')
            .update(input)
            .eq('id', input.id)
            .select('*')
            .single()
        : await supabase.from('lesson_steps').insert(input).select('*').single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => invalidate(data.quest_id),
  });
}

export function useDeleteLessonStep() {
  const invalidate = useInvalidateQuest();
  return useMutation({
    mutationFn: async ({ id, questId }: { id: string; questId: string }) => {
      const { error } = await supabase
        .from('lesson_steps')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return questId;
    },
    onSuccess: (questId) => invalidate(questId),
  });
}

/** Persist the full step order as sequential sort_order (drag-to-reorder). */
export function useReorderLessonSteps() {
  const invalidate = useInvalidateQuest();
  return useMutation({
    mutationFn: async ({ questId, ids }: { questId: string; ids: string[] }) => {
      const results = await Promise.all(
        ids.map((id, i) => supabase.from('lesson_steps').update({ sort_order: i }).eq('id', id)),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      return questId;
    },
    onSuccess: (questId) => invalidate(questId),
  });
}

// ---------- Quest items ----------
export function useAttachQuestItem() {
  const invalidate = useInvalidateQuest();
  return useMutation({
    mutationFn: async ({
      questId,
      itemId,
      sortOrder,
    }: {
      questId: string;
      itemId: string;
      sortOrder: number;
    }) => {
      const { error } = await supabase
        .from('quest_items')
        .insert({ quest_id: questId, item_id: itemId, sort_order: sortOrder });
      if (error) throw error;
      return questId;
    },
    onSuccess: (questId) => invalidate(questId),
  });
}

export function useDetachQuestItem() {
  const invalidate = useInvalidateQuest();
  return useMutation({
    mutationFn: async ({ questId, itemId }: { questId: string; itemId: string }) => {
      const { error } = await supabase
        .from('quest_items')
        .delete()
        .eq('quest_id', questId)
        .eq('item_id', itemId);
      if (error) throw error;
      return questId;
    },
    onSuccess: (questId) => invalidate(questId),
  });
}
