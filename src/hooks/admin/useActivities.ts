import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ActivityChoiceRow, ActivityRow } from '@/lib/database.types';

export type ActivityWithChoices = ActivityRow & { choices: ActivityChoiceRow[] };

const activityKey = (id: string) => ['admin', 'activity', id] as const;

/** Full activity incl. its choices. */
export function useActivity(id: string | null) {
  return useQuery({
    queryKey: activityKey(id ?? ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<ActivityWithChoices> => {
      const { data, error } = await supabase
        .from('activities')
        .select('*, choices:activity_choices(*)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      const row = data as unknown as ActivityWithChoices;
      row.choices = [...(row.choices ?? [])].sort((a, b) => a.sort_order - b.sort_order);
      return row;
    },
  });
}

/** Activities attached to a quest. */
export function useQuestActivities(questId: string | null) {
  return useQuery({
    queryKey: ['admin', 'quest-activities', questId],
    enabled: Boolean(questId),
    queryFn: async (): Promise<ActivityRow[]> => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('quest_id', questId!)
        .is('deleted_at', null)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return (activityId?: string, questId?: string | null) => {
    if (activityId) qc.invalidateQueries({ queryKey: activityKey(activityId) });
    if (questId) qc.invalidateQueries({ queryKey: ['admin', 'quest-activities', questId] });
    qc.invalidateQueries({ queryKey: ['admin', 'pool-activities'] });
  };
}

/** Create/update an activity and replace its choices in one call. */
export function useSaveActivity() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      activity,
      choices,
    }: {
      activity: Partial<ActivityRow> & Pick<ActivityRow, 'activity_type' | 'skills' | 'prompt_md'>;
      choices?: Omit<ActivityChoiceRow, 'id' | 'activity_id'>[];
    }) => {
      const { data, error } = activity.id
        ? await supabase
            .from('activities')
            .update(activity)
            .eq('id', activity.id)
            .select('*')
            .single()
        : await supabase.from('activities').insert(activity).select('*').single();
      if (error) throw error;
      const saved = data;

      if (choices) {
        // Replace-all strategy: delete then re-insert choices.
        await supabase.from('activity_choices').delete().eq('activity_id', saved.id);
        if (choices.length) {
          const payload = choices.map((c, i) => ({
            ...c,
            activity_id: saved.id,
            sort_order: c.sort_order ?? i,
          }));
          const { error: cErr } = await supabase.from('activity_choices').insert(payload);
          if (cErr) throw cErr;
        }
      }
      return saved;
    },
    onSuccess: (saved) => invalidate(saved.id, saved.quest_id),
  });
}

export function useArchiveActivity() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, questId }: { id: string; questId: string | null }) => {
      const { error } = await supabase
        .from('activities')
        .update({ status: 'archived', deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { id, questId };
    },
    onSuccess: ({ id, questId }) => invalidate(id, questId),
  });
}
