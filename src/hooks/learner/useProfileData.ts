import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { BadgeRow } from '@/lib/database.types';
import { localDateString } from '@/lib/dates';
import { useAuth } from '../useAuth';
import { useProfile } from '../useProfile';

export type EarnedBadge = BadgeRow & { earned: boolean; earnedAt: string | null };

/** All published badges, flagged with whether the current user has earned them. */
export function useEarnedBadges() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile-badges', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<EarnedBadge[]> => {
      const [badges, earned] = await Promise.all([
        supabase.from('badges').select('*').eq('status', 'published').is('deleted_at', null).order('title'),
        supabase.from('user_badges').select('badge_id, earned_at').eq('user_id', user!.id),
      ]);
      if (badges.error) throw badges.error;
      if (earned.error) throw earned.error;
      const map = new Map(earned.data.map((e) => [e.badge_id, e.earned_at]));
      return badges.data.map((b) => ({ ...b, earned: map.has(b.id), earnedAt: map.get(b.id) ?? null }));
    },
  });
}

/** Answer counts per local day for the last `days` days (contribution calendar). */
export function useActivityCalendar(days = 84) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const tz = profile?.timezone ?? 'UTC';
  return useQuery({
    queryKey: ['activity-calendar', user?.id, days],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Map<string, number>> => {
      const since = new Date(Date.now() - (days + 1) * 864e5).toISOString();
      const { data, error } = await supabase
        .from('answer_logs')
        .select('answered_at')
        .eq('user_id', user!.id)
        .gte('answered_at', since)
        .limit(10000);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const row of data) {
        const key = localDateString(tz, new Date(row.answered_at));
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return counts;
    },
  });
}
