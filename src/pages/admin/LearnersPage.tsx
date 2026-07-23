import { useLearners } from '@/hooks/admin/useAdminInsights';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { Users } from 'lucide-react';

export default function LearnersPage() {
  const { data, isLoading, isError, refetch } = useLearners();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold">Learners</h1>
      {isLoading ? (
        <LoadingState />
      ) : isError || !data ? (
        <ErrorState message="Couldn't load learners." onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyState icon={Users} title="No learners yet" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-parchment-200 text-xs uppercase text-ink-muted dark:bg-white/10">
              <tr>
                <th className="p-2">Learner</th>
                <th className="p-2">Level</th>
                <th className="p-2">XP</th>
                <th className="p-2">Streak</th>
                <th className="hidden p-2 sm:table-cell">Lessons</th>
                <th className="hidden p-2 sm:table-cell">Reviews</th>
              </tr>
            </thead>
            <tbody>
              {data.map((l) => (
                <tr key={l.id} className="border-t border-black/5 dark:border-white/10">
                  <td className="p-2">
                    <span className="mr-1">{l.avatar_emoji}</span>
                    {l.display_name}
                  </td>
                  <td className="p-2">{l.stats?.level ?? 1}</td>
                  <td className="p-2">{l.stats?.total_xp ?? 0}</td>
                  <td className="p-2">🔥 {l.stats?.current_streak ?? 0}</td>
                  <td className="hidden p-2 sm:table-cell">{l.stats?.lessons_completed ?? 0}</td>
                  <td className="hidden p-2 sm:table-cell">{l.stats?.reviews_completed ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
