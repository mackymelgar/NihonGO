import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Star, Map, Check } from 'lucide-react';
import { useRoadmap, type RoadmapArea, type RoadmapCourse } from '@/hooks/learner/useRoadmap';
import { ProgressRing } from '@/components/ProgressRing';
import { CoachMarks } from '@/components/CoachMarks';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { cn } from '@/lib/utils';

const levelLabel = (c: RoadmapCourse) => (c.jlpt_level ? `N${c.jlpt_level}` : c.title.slice(0, 6));

export default function RoadmapPage() {
  const { data, isLoading, isError, refetch } = useRoadmap();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Default to the first unlocked, not-yet-complete course.
  const activeId = useMemo(() => {
    if (!data) return null;
    if (selectedId && data.courses.some((c) => c.id === selectedId)) return selectedId;
    return (
      data.courses.find((c) => c.unlocked && !c.complete)?.id ??
      data.courses.find((c) => c.unlocked)?.id ??
      data.courses[0]?.id ??
      null
    );
  }, [data, selectedId]);

  if (isLoading) return <LoadingState label="Charting your journey…" />;
  if (isError || !data) return <ErrorState message="Couldn't load the roadmap." onRetry={() => refetch()} />;

  if (data.courses.length === 0) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-extrabold">Roadmap</h1>
        <EmptyState
          icon={Map}
          title="No published courses yet"
          message="Once content is published in the admin CMS, your adventure map appears here."
        />
      </div>
    );
  }

  const course = data.courses.find((c) => c.id === activeId) ?? data.courses[0];

  return (
    <div>
      <CoachMarks />
      <h1 className="mb-3 text-2xl font-extrabold">Roadmap</h1>

      {/* Course switcher */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {data.courses.map((c) => {
          const active = c.id === course.id;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-2xl border-2 px-4 py-2 text-sm font-bold transition-colors',
                active ? 'border-accent bg-accent/10 text-accent' : 'border-black/10 text-ink-muted hover:border-accent/50 dark:border-white/15',
              )}
            >
              {!c.unlocked ? <Lock className="h-4 w-4" /> : c.complete ? <Check className="h-4 w-4 text-green-600" /> : null}
              {levelLabel(c)}
            </button>
          );
        })}
      </div>

      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-xl font-extrabold">{course.title}</h2>
        {course.complete && <Star className="h-5 w-5 fill-amber-400 text-amber-400" />}
      </div>
      {course.description && <p className="mb-6 text-sm text-ink-muted">{course.description}</p>}

      {!course.unlocked ? (
        <div className="rounded-2xl border-2 border-dashed border-black/10 p-8 text-center dark:border-white/15">
          <Lock className="mx-auto mb-2 h-8 w-8 text-ink-muted" />
          <p className="font-bold">This course is locked</p>
          <p className="mt-1 text-sm text-ink-muted">
            Complete the previous course to unlock {course.title}.
          </p>
        </div>
      ) : (
        <div className="relative flex flex-col items-center gap-2">
          {course.areas.map((area, i) => (
            <div key={area.id} className="flex w-full flex-col items-center">
              <AreaNode
                area={area}
                side={i % 2 === 0 ? 'left' : 'right'}
                onClick={() => area.unlocked && navigate(`/roadmap/${area.slug}`)}
              />
              {i < course.areas.length - 1 && (
                <div className="h-8 w-1 rounded-full bg-black/10 dark:bg-white/15" />
              )}
            </div>
          ))}
        </div>
      )}
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
