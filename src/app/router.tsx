import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { RequireAuth, RequireOnboarding, RequireAdmin } from './guards';
import { LoadingState } from '@/components/ui/states';

const AuthPage = lazy(() => import('@/pages/auth/AuthPage'));
const OnboardingPage = lazy(() => import('@/pages/onboarding/OnboardingPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const RoadmapPage = lazy(() => import('@/pages/roadmap/RoadmapPage'));
const AreaPage = lazy(() => import('@/pages/roadmap/AreaPage'));
const LessonPlayerPage = lazy(() => import('@/pages/quest/LessonPlayerPage'));
const BossPage = lazy(() => import('@/pages/boss/BossPage'));
const ReviewPage = lazy(() => import('@/pages/review/ReviewPage'));
const ReviewSessionPage = lazy(() => import('@/pages/review/ReviewSessionPage'));
const LibraryPage = lazy(() => import('@/pages/library/LibraryPage'));
const LibraryItemPage = lazy(() => import('@/pages/library/LibraryItemPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const SetupGate = lazy(() => import('@/pages/SetupGate'));

// Admin CMS
const AdminHome = lazy(() => import('@/pages/admin/AdminHome'));
const ContentTreePage = lazy(() => import('@/pages/admin/ContentTreePage'));
const QuestEditorPage = lazy(() => import('@/pages/admin/QuestEditorPage'));
const ItemsPage = lazy(() => import('@/pages/admin/ItemsPage'));
const BadgesPage = lazy(() => import('@/pages/admin/BadgesPage'));
const LearnersPage = lazy(() => import('@/pages/admin/LearnersPage'));
const AnalyticsPage = lazy(() => import('@/pages/admin/AnalyticsPage'));

function Lazy({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingState />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

const router = createBrowserRouter([
  { path: '/auth', element: <Lazy><AuthPage /></Lazy> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/onboarding', element: <Lazy><OnboardingPage /></Lazy> },
      {
        element: <RequireOnboarding />,
        children: [
          // Full-screen, distraction-free experiences (no tab shell).
          { path: '/quest/:questSlug', element: <Lazy><LessonPlayerPage /></Lazy> },
          { path: '/boss/:questSlug', element: <Lazy><BossPage /></Lazy> },
          { path: '/review/session', element: <Lazy><ReviewSessionPage /></Lazy> },
          {
            element: <AppShell />,
            children: [
              { path: '/', element: <Lazy><DashboardPage /></Lazy> },
              { path: '/roadmap', element: <Lazy><RoadmapPage /></Lazy> },
              { path: '/roadmap/:areaSlug', element: <Lazy><AreaPage /></Lazy> },
              { path: '/review', element: <Lazy><ReviewPage /></Lazy> },
              { path: '/library', element: <Lazy><LibraryPage /></Lazy> },
              { path: '/library/item/:id', element: <Lazy><LibraryItemPage /></Lazy> },
              { path: '/profile', element: <Lazy><ProfilePage /></Lazy> },
            ],
          },
          // Admin CMS — its own layout, role-guarded.
          {
            element: <RequireAdmin />,
            children: [
              { path: '/admin/quest/:id', element: <Lazy><QuestEditorPage /></Lazy> },
              {
                element: <AdminLayout />,
                children: [
                  { path: '/admin', element: <Lazy><AdminHome /></Lazy> },
                  { path: '/admin/content', element: <Lazy><ContentTreePage /></Lazy> },
                  { path: '/admin/items', element: <Lazy><ItemsPage /></Lazy> },
                  { path: '/admin/badges', element: <Lazy><BadgesPage /></Lazy> },
                  { path: '/admin/learners', element: <Lazy><LearnersPage /></Lazy> },
                  { path: '/admin/analytics', element: <Lazy><AnalyticsPage /></Lazy> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  if (!isSupabaseConfigured) {
    return (
      <Lazy>
        <SetupGate />
      </Lazy>
    );
  }
  return <RouterProvider router={router} />;
}
