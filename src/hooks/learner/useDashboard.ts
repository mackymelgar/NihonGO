import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DashboardResult } from '@/lib/database.types';
import { useAuth } from '../useAuth';

/** Single-round-trip dashboard bundle (§9.4). */
export function useDashboard() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dashboard', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<DashboardResult> => {
      const { data, error } = await supabase.rpc('get_dashboard');
      if (error) throw error;
      return data as DashboardResult;
    },
    staleTime: 10_000,
  });
}
