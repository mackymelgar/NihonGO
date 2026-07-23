import { useAnalytics } from '@/hooks/admin/useAdminInsights';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { Users, BookOpen, ListChecks, Activity } from 'lucide-react';

export default function AnalyticsPage() {
  const { data, isLoading, isError, refetch } = useAnalytics();

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState message="Couldn't load analytics." onRetry={() => refetch()} />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold">Analytics</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Users className="h-5 w-5" />} label="Learners" value={data.totalLearners} />
        <Stat icon={<BookOpen className="h-5 w-5" />} label="Published quests" value={data.publishedQuests} />
        <Stat icon={<ListChecks className="h-5 w-5" />} label="Published items" value={data.publishedItems} />
        <Stat icon={<Activity className="h-5 w-5" />} label="Answers (7d)" value={data.answersLast7d} />
      </div>

      <section>
        <h2 className="mb-2 font-bold">Hardest questions (last 7 days)</h2>
        {data.hardestActivities.length === 0 ? (
          <p className="text-sm text-ink-muted">Not enough answer data yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.hardestActivities.map((h) => (
              <div key={h.activity_id} className="flex items-center gap-3 rounded-2xl border border-black/10 p-3 dark:border-white/10">
                <span className="flex-1 truncate text-sm">{h.prompt}</span>
                <span className="text-xs text-ink-muted">n={h.n}</span>
                <span className={'font-bold ' + (h.correctRate < 0.5 ? 'text-red-500' : 'text-amber-500')}>
                  {Math.round(h.correctRate * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-bold">Events (last 7 days)</h2>
        {data.eventCounts.length === 0 ? (
          <p className="text-sm text-ink-muted">No events tracked yet.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {data.eventCounts.map((e) => {
              const max = data.eventCounts[0]?.count || 1;
              return (
                <div key={e.event_name} className="flex items-center gap-2 text-sm">
                  <span className="w-40 truncate">{e.event_name}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-parchment-200 dark:bg-white/10">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(e.count / max) * 100}%` }} />
                  </div>
                  <span className="w-10 text-right font-semibold">{e.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
      <div className="mb-1 text-accent">{icon}</div>
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-ink-muted">{label}</div>
    </div>
  );
}
