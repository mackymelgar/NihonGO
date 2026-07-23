import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { UserStatsRow } from '@/lib/database.types';
import { useAuth } from './useAuth';

export function useStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['stats', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<UserStatsRow | null> => {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
