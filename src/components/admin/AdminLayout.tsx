import { NavLink, Outlet, Link } from 'react-router-dom';
import { FolderTree, BookMarked, Award, Users, BarChart3, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/admin/content', label: 'Content', icon: FolderTree },
  { to: '/admin/items', label: 'Items', icon: BookMarked },
  { to: '/admin/badges', label: 'Badges', icon: Award },
  { to: '/admin/learners', label: 'Learners', icon: Users },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

export function AdminLayout() {
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 z-10 flex h-auto w-full flex-row gap-1 overflow-x-auto border-b border-black/5 bg-parchment/95 p-3 backdrop-blur dark:border-white/10 dark:bg-[#161327]/95 md:h-screen md:w-56 md:flex-col md:border-b-0 md:border-r">
        <Link
          to="/"
          className="mb-2 hidden items-center gap-2 px-2 text-sm font-semibold text-ink-muted hover:text-ink md:flex"
        >
          <ArrowLeft className="h-4 w-4" /> Back to app
        </Link>
        <div className="mb-2 hidden px-2 text-lg font-extrabold md:block">Admin CMS</div>
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-ink-muted hover:bg-black/5 dark:hover:bg-white/10',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </aside>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
