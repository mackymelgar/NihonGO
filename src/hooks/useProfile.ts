import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ProfileRow, ProfileUpdate } from '@/lib/database.types';
import { detectTimezone } from '@/lib/dates';
import { useAuth } from './useAuth';

export const profileKey = (userId: string | undefined) => ['profile', userId] as const;

/**
 * Loads the current user's profile. A DB trigger creates the row on signup, but
 * we defensively insert one if it's missing (e.g. a race on anonymous signin)
 * so downstream screens never hit a null profile.
 */
async function fetchOrBootstrapProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .insert({ id: userId, timezone: detectTimezone() })
    .select('*')
    .single();

  if (insertError) throw insertError;
  return inserted;
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: profileKey(user?.id),
    enabled: Boolean(user?.id),
    queryFn: () => fetchOrBootstrapProfile(user!.id),
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ProfileUpdate) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', user!.id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(profileKey(user?.id), data);
    },
  });
}
