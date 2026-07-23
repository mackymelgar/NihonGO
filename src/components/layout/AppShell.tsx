import { NavLink, Outlet } from 'react-router-dom';
import {
  Home,
  Map,
  Swords,
  Library,
  User,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { useDueCount } from '@/hooks/learner/useReview';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Optional live badge (e.g. review due count). */
  badge?: number;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/roadmap', label: 'Roadmap', icon: Map },
  { to: '/review', label: 'Review', icon: Swords },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/profile', label: 'Profile', icon: User },
];

function NavItemLink({ item, orientation }: { item: NavItem; orientation: 'row' | 'col' }) {
  const { icon: Icon, label, badge, to } = item;
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 rounded-2xl font-semibold transition-colors',
          orientation === 'row'
            ? 'min-w-[44px] flex-1 flex-col justify-center gap-1 py-2 text-xs'
            : 'px-4 py-3 text-base',
          isActive
            ? 'text-accent'
            : 'text-ink-muted hover:text-ink dark:hover:text-parchment-100',
        )
      }
    >
      <span className="relative">
        <Icon className={orientation === 'row' ? 'h-6 w-6' : 'h-5 w-5'} />
        {badge != null && badge > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span className={orientation === 'col' ? 'flex-1' : ''}>{label}</span>
    </NavLink>
  );
}

export function AppShell() {
  const { data: profile } = useProfile();
  const { data: dueCount } = useDueCount();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'content_reviewer';

  const nav = NAV.map((item) =>
    item.to === '/review' ? { ...item, badge: dueCount } : item,
  );

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 flex-col border-r border-black/5 p-4 dark:border-white/10 md:flex">
        <div className="mb-6 px-2 text-2xl font-extrabold">
          日本語 <span className="text-accent">Hero</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <NavItemLink key={item.to} item={item} orientation="col" />
          ))}
          {isAdmin && (
            <NavItemLink
              item={{ to: '/admin', label: 'Admin', icon: Shield }}
              orientation="col"
            />
          )}
        </nav>
      </aside>

      {/* Main content */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-4 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 flex border-t border-black/5 bg-parchment/95 px-2 py-1 backdrop-blur dark:border-white/10 dark:bg-[#161327]/95 md:hidden">
        {nav.map((item) => (
          <NavItemLink key={item.to} item={item} orientation="row" />
        ))}
      </nav>
    </div>
  );
}
