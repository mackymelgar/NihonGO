import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Lock, Check, Clock, Sparkles, Swords } from 'lucide-react';
import { useRoadmap } from '@/hooks/learner/useRoadmap';
import type { QuestRow } from '@/lib/database.types';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { cn } from '@/lib/utils';

export default function AreaPage() {
  const { areaSlug } = useParams<{ areaSlug: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useRoadmap();

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState message="Couldn't load this area." onRetry={() => refetch()} />;

  const area = data.areas.find((a) => a.slug === areaSlug);
  if (!area) return <ErrorState title="Area not found" onRetry={() => navigate('/roadmap')} />;

  return (
    <div>
      <Link to="/roadmap" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Roadmap
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <span className="text-4xl">{area.theme_icon ?? '📍'}</span>
        <div>
          <h1 className="text-2xl font-extrabold">{area.title}</h1>
          {area.subtitle && <p className="text-ink-muted">{area.subtitle}</p>}
        </div>
      </header>

      <div className="flex flex-col gap-3">
        {area.quests.map((quest) => {
          const unlocked = data.questUnlocked.get(quest.id) ?? false;
          const completed = data.completedQuestIds.has(quest.id);
          const progress = data.progressByQuest.get(quest.id);
          const inProgress = progress?.status === 'in_progress';
          return (
            <QuestCard
              key={quest.id}
              quest={quest}
              unlocked={unlocked}
              completed={completed}
              inProgress={inProgress}
              onClick={() =>
                unlocked && navigate(`${quest.quest_type === 'boss' ? '/boss' : '/quest'}/${quest.slug}`)
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function QuestCard({
  quest,
  unlocked,
  completed,
  inProgress,
  onClick,
}: {
  quest: QuestRow;
  unlocked: boolean;
  completed: boolean;
  inProgress: boolean;
  onClick: () => void;
}) {
  const isBoss = quest.quest_type === 'boss';
  return (
    <button
      onClick={onClick}
      disabled={!unlocked}
      className={cn(
        'flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all',
        isBoss && 'border-accent/40 bg-accent/5',
        unlocked
          ? 'hover:border-accent hover:shadow-md'
          : 'cursor-not-allowed opacity-60',
        !isBoss && 'border-black/10 bg-white/60 dark:border-white/15 dark:bg-white/5',
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl',
          completed ? 'bg-green-500 text-white' : isBoss ? 'bg-accent text-white' : 'bg-parchment-200 dark:bg-white/10',
        )}
      >
        {!unlocked ? <Lock className="h-5 w-5" /> : completed ? <Check className="h-6 w-6" /> : isBoss ? <Swords className="h-6 w-6" /> : '📖'}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-muted dark:bg-white/10">
            {quest.quest_type}
          </span>
          <h3 className="truncate font-bold">{quest.title}</h3>
        </div>
        {quest.learning_goal && <p className="truncate text-sm text-ink-muted">{quest.learning_goal}</p>}
        <div className="mt-1 flex items-center gap-3 text-xs text-ink-muted">
          <span className="flex items-center gap-1"><DifficultyDots n={quest.difficulty} /></span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {quest.estimated_minutes}m</span>
          <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> {quest.xp_reward} XP</span>
        </div>
      </div>

      {inProgress && !completed && (
        <span className="rounded-full bg-accent/10 px-2 py-1 text-xs font-bold text-accent">Resume</span>
      )}
    </button>
  );
}

function DifficultyDots({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i < n ? 'bg-accent' : 'bg-black/15 dark:bg-white/20')} />
      ))}
    </span>
  );
}
