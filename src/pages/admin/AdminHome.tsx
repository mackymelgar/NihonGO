import { Link } from 'react-router-dom';
import { FolderTree, BookMarked, Award, BarChart3 } from 'lucide-react';

const CARDS = [
  { to: '/admin/content', icon: FolderTree, title: 'Content', body: 'Courses, areas, quests, lesson steps.' },
  { to: '/admin/items', icon: BookMarked, title: 'Items', body: 'Kana, vocab, grammar, kanji + CSV import.' },
  { to: '/admin/badges', icon: Award, title: 'Badges', body: 'Achievement badges.' },
  { to: '/admin/analytics', icon: BarChart3, title: 'Analytics', body: 'Funnels, hardest questions, activity.' },
];

export default function AdminHome() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold">Admin CMS</h1>
      <p className="mb-6 text-ink-muted">Author the entire curriculum — no code changes needed.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {CARDS.map(({ to, icon: Icon, title, body }) => (
          <Link
            key={to}
            to={to}
            className="rounded-2xl border border-black/10 bg-white/50 p-5 transition-colors hover:border-accent dark:border-white/10 dark:bg-white/5"
          >
            <Icon className="mb-2 h-6 w-6 text-accent" />
            <h2 className="font-bold">{title}</h2>
            <p className="text-sm text-ink-muted">{body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
