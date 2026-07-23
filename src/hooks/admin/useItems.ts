import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ContentStatus, ItemType, LearningItemRow } from '@/lib/database.types';

export type ItemFilters = {
  search?: string;
  itemType?: ItemType | 'all';
  status?: ContentStatus | 'all';
  jlptLevel?: number | 'all';
};

const itemsKey = (f: ItemFilters) => ['admin', 'items', f] as const;

export function useItems(filters: ItemFilters = {}) {
  return useQuery({
    queryKey: itemsKey(filters),
    queryFn: async (): Promise<LearningItemRow[]> => {
      let q = supabase.from('learning_items').select('*').is('deleted_at', null);
      if (filters.itemType && filters.itemType !== 'all') q = q.eq('item_type', filters.itemType);
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters.jlptLevel && filters.jlptLevel !== 'all')
        q = q.eq('jlpt_level', filters.jlptLevel);
      if (filters.search) {
        const s = `%${filters.search}%`;
        q = q.or(
          `japanese_text.ilike.${s},kana_reading.ilike.${s},romaji.ilike.${s},english_meaning.ilike.${s}`,
        );
      }
      const { data, error } = await q.order('updated_at', { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });
}

/** Lightweight item search for attach-pickers (quest_items, activity item link). */
export function useItemSearch(search: string) {
  return useQuery({
    queryKey: ['admin', 'item-search', search],
    enabled: search.length > 0,
    queryFn: async (): Promise<LearningItemRow[]> => {
      const s = `%${search}%`;
      const { data, error } = await supabase
        .from('learning_items')
        .select('*')
        .is('deleted_at', null)
        .or(`japanese_text.ilike.${s},kana_reading.ilike.${s},english_meaning.ilike.${s}`)
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
}

function useInvalidateItems() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['admin', 'items'] });
}

export function useSaveItem() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: async (
      input: Partial<LearningItemRow> &
        Pick<
          LearningItemRow,
          'item_type' | 'japanese_text' | 'kana_reading' | 'romaji' | 'english_meaning' | 'tts_text'
        >,
    ) => {
      const { data, error } = input.id
        ? await supabase
            .from('learning_items')
            .update(input)
            .eq('id', input.id)
            .select('*')
            .single()
        : await supabase.from('learning_items').insert(input).select('*').single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useArchiveItem() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('learning_items')
        .update({ status: 'archived', deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Bulk insert imported items (all as drafts). Returns inserted count. */
export function useImportItems() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: async (rows: Partial<LearningItemRow>[]) => {
      const payload = rows.map((r) => ({ ...r, status: 'draft' as const }));
      const { data, error } = await supabase
        .from('learning_items')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(payload as any)
        .select('id');
      if (error) throw error;
      return data.length;
    },
    onSuccess: invalidate,
  });
}
