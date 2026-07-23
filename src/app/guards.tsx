import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { LoadingState, ErrorState } from '@/components/ui/states';

/** Requires an authenticated (or guest) user; else redirects to /auth. */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreen><LoadingState label="Restoring your session…" /></FullScreen>;
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Sends first-run users to onboarding until they complete it. */
export function RequireOnboarding() {
  const { data: profile, isLoading, isError, refetch } = useProfile();

  if (isLoading) return <FullScreen><LoadingState label="Loading your profile…" /></FullScreen>;
  if (isError)
    return (
      <FullScreen>
        <ErrorState message="Couldn't load your profile." onRetry={() => refetch()} />
      </FullScreen>
    );
  if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

/** Admin-only route group. */
export function RequireAdmin() {
  const { data: profile, isLoading } = useProfile();
  if (isLoading) return <FullScreen><LoadingState /></FullScreen>;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'content_reviewer';
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center p-6">{children}</div>;
}
