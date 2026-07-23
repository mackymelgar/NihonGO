import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { BadgeRow } from '@/lib/database.types';

const badgesKey = ['admin', 'badges'] as const;

export function useBadges() {
  return useQuery({
    queryKey: badgesKey,
    queryFn: async (): Promise<BadgeRow[]> => {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .is('deleted_at', null)
        .order('title');
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<BadgeRow> & Pick<BadgeRow, 'slug' | 'title' | 'description'>,
    ) => {
      const { data, error } = input.id
        ? await supabase.from('badges').update(input).eq('id', input.id).select('*').single()
        : await supabase.from('badges').insert(input).select('*').single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: badgesKey }),
  });
}

export function useArchiveBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('badges')
        .update({ status: 'archived', deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: badgesKey }),
  });
}
