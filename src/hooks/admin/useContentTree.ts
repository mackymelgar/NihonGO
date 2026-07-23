import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AreaRow, ContentStatus, CourseRow, QuestRow } from '@/lib/database.types';

const treeKey = ['admin', 'content-tree'] as const;

export type ContentTree = {
  courses: CourseRow[];
  areas: AreaRow[];
  quests: QuestRow[];
};

/** Loads the whole authorable tree in one shot (admins see all statuses). */
export function useContentTree() {
  return useQuery({
    queryKey: treeKey,
    queryFn: async (): Promise<ContentTree> => {
      const [courses, areas, quests] = await Promise.all([
        supabase.from('courses').select('*').is('deleted_at', null).order('sort_order'),
        supabase.from('areas').select('*').is('deleted_at', null).order('sort_order'),
        supabase.from('quests').select('*').is('deleted_at', null).order('sort_order'),
      ]);
      if (courses.error) throw courses.error;
      if (areas.error) throw areas.error;
      if (quests.error) throw quests.error;
      return { courses: courses.data, areas: areas.data, quests: quests.data };
    },
  });
}

function useInvalidateTree() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: treeKey });
}

// ---------- Courses ----------
export function useSaveCourse() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: async (input: Partial<CourseRow> & { slug: string; title: string }) => {
      const { data, error } = input.id
        ? await supabase.from('courses').update(input).eq('id', input.id).select('*').single()
        : await supabase.from('courses').insert(input).select('*').single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

// ---------- Areas ----------
export function useSaveArea() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: async (
      input: Partial<AreaRow> & { course_id: string; slug: string; title: string },
    ) => {
      const { data, error } = input.id
        ? await supabase.from('areas').update(input).eq('id', input.id).select('*').single()
        : await supabase.from('areas').insert(input).select('*').single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

// ---------- Quests ----------
export function useSaveQuest() {
  const invalidate = useInvalidateTree();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<QuestRow> & { area_id: string; slug: string; title: string },
    ) => {
      const { data, error } = input.id
        ? await supabase.from('quests').update(input).eq('id', input.id).select('*').single()
        : await supabase.from('quests').insert(input).select('*').single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['admin', 'quest', data.id] });
    },
  });
}

// ---------- Generic status transition (courses/areas/quests) ----------
type ContentTable = 'courses' | 'areas' | 'quests';
export function useSetContentStatus() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: async ({
      table,
      id,
      status,
    }: {
      table: ContentTable;
      id: string;
      status: ContentStatus;
    }) => {
      const patch =
        status === 'archived'
          ? { status, deleted_at: new Date().toISOString() }
          : { status, deleted_at: null };
      const { error } = await supabase.from(table).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Soft-delete (archive) any tree node. */
export function useArchiveNode() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: async ({ table, id }: { table: ContentTable; id: string }) => {
      const { error } = await supabase
        .from(table)
        .update({ status: 'archived', deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Persist a whole sibling list order as sequential sort_order (drag-to-reorder). */
export function useReorderList() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: async ({ table, ids }: { table: ContentTable; ids: string[] }) => {
      const results = await Promise.all(
        ids.map((id, i) => supabase.from(table).update({ sort_order: i }).eq('id', id)),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: invalidate,
  });
}
