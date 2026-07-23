import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * True when the client is configured. When false, the app renders a friendly
 * setup screen instead of crashing on a null client — so a fresh clone with an
 * empty .env still boots.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Nihongo Hero] Supabase is not configured. Set VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_ANON_KEY in .env, then restart the dev server.',
  );
}

export const supabase = createClient<Database>(
  url || 'http://localhost:54321',
  anonKey || 'public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
