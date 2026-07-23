import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ItemType, LearningItemRow, UserItemMasteryRow } from '@/lib/database.types';
import { isDue, isForgotten } from '@/lib/srs';
import { useAuth } from '../useAuth';

export type MasteryWithItem = UserItemMasteryRow & { item: LearningItemRow };

export type ReviewLobby = {
  due: MasteryWithItem[];
  countsByType: Record<string, number>;
  totalDue: number;
  forecast: { date: string; label: string; count: number }[];
  weak: MasteryWithItem[];
};

async function fetchMastery(userId: string): Promise<MasteryWithItem[]> {
  const { data, error } = await supabase
    .from('user_item_mastery')
    .select('*, item:learning_items(*)')
    .eq('user_id', userId)
    .not('next_review_at', 'is', null);
  if (error) throw error;
  return data as unknown as MasteryWithItem[];
}

export function useReviewLobby() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['review-lobby', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<ReviewLobby> => {
      const rows = await fetchMastery(user!.id);
      const now = new Date();

      const due = rows.filter((r) => isDue(r.next_review_at, now));
      // Forgotten first, then most-overdue.
      due.sort((a, b) => {
        const fa = isForgotten(a.srs_stage, a.next_review_at, now) ? 1 : 0;
        const fb = isForgotten(b.srs_stage, b.next_review_at, now) ? 1 : 0;
        if (fa !== fb) return fb - fa;
        return new Date(a.next_review_at!).getTime() - new Date(b.next_review_at!).getTime();
      });

      const countsByType: Record<string, number> = {};
      for (const r of due) countsByType[r.item.item_type] = (countsByType[r.item.item_type] ?? 0) + 1;

      // 7-day forecast (items becoming due each of the next 7 days, not incl. already-due).
      const forecast: ReviewLobby['forecast'] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(now);
        day.setHours(0, 0, 0, 0);
        day.setDate(day.getDate() + d);
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);
        const count = rows.filter((r) => {
          const t = new Date(r.next_review_at!).getTime();
          return t >= (d === 0 ? now.getTime() : day.getTime()) && t < nextDay.getTime();
        }).length;
        forecast.push({
          date: day.toISOString(),
          label: d === 0 ? 'Today' : day.toLocaleDateString(undefined, { weekday: 'short' }),
          count,
        });
      }

      const weak = rows.filter((r) => r.state === 'weak' || r.consecutive_wrong >= 2);

      return { due, countsByType, totalDue: due.length, forecast, weak };
    },
    staleTime: 15_000,
  });
}

/** Lightweight due count for the nav badge. */
export function useDueCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['due-count', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('user_item_mastery')
        .select('item_id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .lte('next_review_at', new Date().toISOString());
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30_000,
  });
}

export type ItemTypeFilter = ItemType | 'all';
