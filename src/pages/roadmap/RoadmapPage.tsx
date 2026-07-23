import { useNavigate } from 'react-router-dom';
import { Lock, Star, Map } from 'lucide-react';
import { useRoadmap, type RoadmapArea } from '@/hooks/learner/useRoadmap';
import { ProgressRing } from '@/components/ProgressRing';
import { CoachMarks } from '@/components/CoachMarks';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { cn } from '@/lib/utils';

export default function RoadmapPage() {
  const { data, isLoading, isError, refetch } = useRoadmap();
  const navigate = useNavigate();

  if (isLoading) return <LoadingState label="Charting your journey…" />;
  if (isError || !data) return <ErrorState message="Couldn't load the roadmap." onRetry={() => refetch()} />;

  if (data.areas.length === 0) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-extrabold">Roadmap</h1>
        <EmptyState
          icon={Map}
          title="No published areas yet"
          message="Once content is published in the admin CMS, your adventure map appears here."
        />
      </div>
    );
  }

  return (
    <div>
      <CoachMarks />
      <h1 className="mb-1 text-2xl font-extrabold">{data.course?.title ?? 'Your journey'}</h1>
      <p className="mb-6 text-ink-muted">Follow the path from village to fluency.</p>

      <div className="relative flex flex-col items-center gap-2">
        {data.areas.map((area, i) => (
          <div key={area.id} className="flex w-full flex-col items-center">
            <AreaNode
              area={area}
              side={i % 2 === 0 ? 'left' : 'right'}
              onClick={() => area.unlocked && navigate(`/roadmap/${area.slug}`)}
            />
            {i < data.areas.length - 1 && (
              <div className="h-8 w-1 rounded-full bg-black/10 dark:bg-white/15" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AreaNode({
  area,
  side,
  onClick,
}: {
  area: RoadmapArea;
  side: 'left' | 'right';
  onClick: () => void;
}) {
  const complete = area.progress.total > 0 && area.progress.done === area.progress.total;
  return (
    <button
      onClick={onClick}
      disabled={!area.unlocked}
      className={cn(
        'flex w-full max-w-md items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all',
        side === 'right' && 'sm:flex-row-reverse sm:text-right',
        area.unlocked
          ? 'border-black/10 bg-white/60 hover:border-accent hover:shadow-md dark:border-white/15 dark:bg-white/5'
          : 'border-black/10 bg-black/5 opacity-70 dark:border-white/10 dark:bg-white/5',
      )}
    >
      <ProgressRing fraction={area.progress.fraction} size={64}>
        <span className="text-2xl">
          {!area.unlocked ? <Lock className="h-6 w-6 text-ink-muted" /> : complete ? '⭐' : area.theme_icon ?? '📍'}
        </span>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-lg font-bold">{area.title}</h2>
          {complete && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
        </div>
        {area.subtitle && <p className="truncate text-sm text-ink-muted">{area.subtitle}</p>}
        <p className="mt-1 text-xs font-semibold text-ink-muted">
          {area.unlocked
            ? `${area.progress.done}/${area.progress.total} quests`
            : 'Locked — clear the previous area’s boss'}
        </p>
      </div>
    </button>
  );
}
