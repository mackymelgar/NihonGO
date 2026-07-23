import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/** Persistent nudge for anonymous users to save their progress. */
export function GuestBanner() {
  const { isGuest } = useAuth();
  if (!isGuest) return null;
  return (
    <Link
      to="/profile"
      className="mb-4 block rounded-2xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-200"
    >
      👋 You're a guest — save your progress by creating a free account →
    </Link>
  );
}
