import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ProfileRow, UserStatsRow } from '@/lib/database.types';

export type LearnerSummary = ProfileRow & { stats: UserStatsRow | null };

/** Read-only learner list with progress summary (admin RLS permits reads). */
export function useLearners() {
  return useQuery({
    queryKey: ['admin', 'learners'],
    queryFn: async (): Promise<LearnerSummary[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, stats:user_stats(*)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as unknown as (ProfileRow & { stats: UserStatsRow[] | UserStatsRow | null })[]).map(
        (r) => ({
          ...r,
          stats: Array.isArray(r.stats) ? (r.stats[0] ?? null) : r.stats,
        }),
      );
    },
  });
}

export type AnalyticsSummary = {
  totalLearners: number;
  publishedQuests: number;
  publishedItems: number;
  answersLast7d: number;
  hardestActivities: { activity_id: string; prompt: string; correctRate: number; n: number }[];
  eventCounts: { event_name: string; count: number }[];
};

/** Simple analytics rollups. Heavy aggregation would move to SQL views/RPCs later. */
export function useAnalytics() {
  return useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async (): Promise<AnalyticsSummary> => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 864e5).toISOString();

      const [learners, quests, items, recentAnswers, recentEvents] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase
          .from('quests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'published')
          .is('deleted_at', null),
        supabase
          .from('learning_items')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'published')
          .is('deleted_at', null),
        supabase
          .from('answer_logs')
          .select('activity_id, is_correct')
          .gte('answered_at', sevenDaysAgo)
          .limit(5000),
        supabase
          .from('analytics_events')
          .select('event_name')
          .gte('created_at', sevenDaysAgo)
          .limit(5000),
      ]);

      if (recentAnswers.error) throw recentAnswers.error;

      // Hardest activities: lowest correct-rate among those with ≥ 3 answers.
      const byActivity = new Map<string, { correct: number; n: number }>();
      for (const a of recentAnswers.data ?? []) {
        if (!a.activity_id) continue;
        const cur = byActivity.get(a.activity_id) ?? { correct: 0, n: 0 };
        cur.n += 1;
        if (a.is_correct) cur.correct += 1;
        byActivity.set(a.activity_id, cur);
      }
      const hardestIds = [...byActivity.entries()]
        .filter(([, v]) => v.n >= 3)
        .map(([id, v]) => ({ activity_id: id, correctRate: v.correct / v.n, n: v.n }))
        .sort((a, b) => a.correctRate - b.correctRate)
        .slice(0, 10);

      let prompts: Record<string, string> = {};
      if (hardestIds.length) {
        const { data: acts } = await supabase
          .from('activities')
          .select('id, prompt_md')
          .in(
            'id',
            hardestIds.map((h) => h.activity_id),
          );
        prompts = Object.fromEntries((acts ?? []).map((a) => [a.id, a.prompt_md]));
      }

      const eventMap = new Map<string, number>();
      for (const e of recentEvents.data ?? [])
        eventMap.set(e.event_name, (eventMap.get(e.event_name) ?? 0) + 1);

      return {
        totalLearners: learners.count ?? 0,
        publishedQuests: quests.count ?? 0,
        publishedItems: items.count ?? 0,
        answersLast7d: recentAnswers.data?.length ?? 0,
        hardestActivities: hardestIds.map((h) => ({
          ...h,
          prompt: prompts[h.activity_id] ?? h.activity_id.slice(0, 8),
        })),
        eventCounts: [...eventMap.entries()]
          .map(([event_name, count]) => ({ event_name, count }))
          .sort((a, b) => b.count - a.count),
      };
    },
  });
}
