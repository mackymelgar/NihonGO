import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Star, Sparkles, ArrowRight, Swords, Lock, PartyPopper } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useDashboard } from '@/hooks/learner/useDashboard';
import { useRoadmap } from '@/hooks/learner/useRoadmap';
import type { SkillType } from '@/lib/database.types';
import { GuestBanner } from '@/components/GuestBanner';
import { ProgressRing } from '@/components/ProgressRing';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { cn } from '@/lib/utils';

const SKILL_EMOJI: Record<SkillType, string> = {
  reading: '📖',
  writing: '✍️',
  listening: '👂',
  speaking: '🗣️',
};
const TYPE_LABEL: Record<string, string> = { kana: 'kana', vocabulary: 'vocab', grammar: 'grammar', kanji: 'kanji', phrase: 'phrases' };

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: dash, isLoading, isError, refetch } = useDashboard();
  const { data: roadmap } = useRoadmap();

  const nextQuest = useMemo(() => {
    if (!roadmap) return null;
    const ordered = roadmap.areas.flatMap((a) => a.quests.map((q) => ({ quest: q, area: a })));
    const inProgress = ordered.find(({ quest }) => roadmap.progressByQuest.get(quest.id)?.status === 'in_progress');
    if (inProgress) return inProgress;
    return (
      ordered.find(
        ({ quest }) => (roadmap.questUnlocked.get(quest.id) ?? false) && !roadmap.completedQuestIds.has(quest.id),
      ) ?? null
    );
  }, [roadmap]);

  const nextLockedArea = useMemo(() => {
    if (!roadmap) return null;
    const idx = roadmap.areas.findIndex((a) => !a.unlocked);
    if (idx <= 0) return null;
    return { area: roadmap.areas[idx], prev: roadmap.areas[idx - 1] };
  }, [roadmap]);

  if (isLoading) return <LoadingState />;
  if (isError || !dash) return <ErrorState message="Couldn't load your dashboard." onRetry={() => refetch()} />;

  const { stats, daily, due_total, due_by_type, weakest_skill } = dash;

  return (
    <div className="flex flex-col gap-5">
      <GuestBanner />

      <header className="flex items-center gap-3">
        <span className="text-4xl">{profile?.avatar_emoji}</span>
        <div>
          <p className="text-sm text-ink-muted">Welcome back,</p>
          <h1 className="text-2xl font-extrabold">{profile?.display_name}</h1>
        </div>
      </header>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-2">
        <Stat icon={<Flame className="h-5 w-5 text-orange-500" />} value={`${stats.current_streak}`} label="Streak" />
        <Stat icon={<Star className="h-5 w-5 text-amber-500" />} value={`${stats.level}`} label="Level" />
        <Stat icon={<Sparkles className="h-5 w-5 text-accent" />} value={`${stats.total_xp}`} label="XP" />
        <Stat
          icon={<span className="text-lg">{weakest_skill ? SKILL_EMOJI[weakest_skill] : '—'}</span>}
          value={weakest_skill ? weakest_skill.slice(0, 4) : '—'}
          label="Weakest"
        />
      </div>

      {/* Hero: Continue Quest */}
      {nextQuest ? (
        <button
          onClick={() =>
            navigate(`${nextQuest.quest.quest_type === 'boss' ? '/boss' : '/quest'}/${nextQuest.quest.slug}`)
          }
          className="w-full rounded-2xl bg-accent p-6 text-left text-white shadow-md transition-transform hover:scale-[1.01]"
        >
          <p className="text-sm opacity-80">
            {nextQuest.area.title} ·{' '}
            {roadmap?.progressByQuest.get(nextQuest.quest.id)?.status === 'in_progress' ? 'Continue' : 'Next quest'}
          </p>
          <h2 className="mt-1 text-2xl font-extrabold">{nextQuest.quest.title}</h2>
          {nextQuest.quest.learning_goal && <p className="mt-1 text-sm opacity-90">{nextQuest.quest.learning_goal}</p>}
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 font-bold">
            Start <ArrowRight className="h-4 w-4" />
          </span>
        </button>
      ) : roadmap && roadmap.areas.length > 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-black/10 p-6 text-center dark:border-white/15">
          <PartyPopper className="mx-auto mb-2 h-8 w-8 text-accent" />
          <p className="text-lg font-bold">All caught up!</p>
          <p className="mt-1 text-sm text-ink-muted">Review your items or wait for the next area.</p>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-black/10 p-6 text-center dark:border-white/15">
          <p className="font-bold">No quests published yet ⚔️</p>
          <p className="mt-1 text-sm text-ink-muted">Publish content in the admin CMS to begin.</p>
        </div>
      )}

      {/* Review + Daily quest */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Review card */}
        <button
          onClick={() => navigate('/review')}
          disabled={due_total === 0}
          className={cn(
            'rounded-2xl border p-4 text-left transition-colors',
            due_total > 0 ? 'border-accent/40 bg-accent/5 hover:border-accent' : 'border-black/10 opacity-70 dark:border-white/10',
          )}
        >
          <div className="mb-1 flex items-center gap-2 font-bold">
            <Swords className="h-5 w-5 text-accent" /> Review Battle
          </div>
          {due_total > 0 ? (
            <>
              <p className="text-3xl font-extrabold">{due_total} due</p>
              <p className="text-sm text-ink-muted">
                {Object.entries(due_by_type).map(([t, n]) => `${n} ${TYPE_LABEL[t] ?? t}`).join(' · ')}
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-muted">No reviews due — go learn something new!</p>
          )}
        </button>

        {/* Daily quest card */}
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-bold">Daily Quest</span>
            {daily.completed ? (
              <span className="text-sm font-bold text-green-600">✓ +{daily.xp_reward} XP</span>
            ) : (
              <span className="text-xs text-ink-muted">+{daily.xp_reward} XP</span>
            )}
          </div>
          <div className="flex justify-around">
            <DailyRing done={daily.lessons_done} target={daily.lessons_target} label="Lessons" />
            <DailyRing done={daily.reviews_done} target={daily.reviews_target} label="Reviews" />
          </div>
        </div>
      </div>

      {/* Next unlock teaser */}
      {nextLockedArea && (
        <div className="flex items-center gap-3 rounded-2xl bg-parchment-200 p-4 dark:bg-white/5">
          <Lock className="h-5 w-5 text-ink-muted" />
          <div>
            <p className="font-bold">{nextLockedArea.area.title}</p>
            <p className="text-sm text-ink-muted">
              Clear the {nextLockedArea.prev.title} boss to unlock ({nextLockedArea.prev.progress.done}/
              {nextLockedArea.prev.progress.total} done)
            </p>
          </div>
        </div>
      )}

      {/* Weekly activity */}
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase text-ink-muted">This week</h2>
        <WeeklyChart data={dash.weekly} />
      </section>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-white/60 p-2 dark:bg-white/5">
      {icon}
      <span className="text-lg font-extrabold capitalize">{value}</span>
      <span className="text-[10px] text-ink-muted">{label}</span>
    </div>
  );
}

function DailyRing({ done, target, label }: { done: number; target: number; label: string }) {
  const fraction = target === 0 ? 1 : Math.min(1, done / target);
  return (
    <div className="flex flex-col items-center gap-1">
      <ProgressRing fraction={fraction} size={56}>
        <span className="text-xs font-bold">{done}/{target}</span>
      </ProgressRing>
      <span className="text-xs text-ink-muted">{label}</span>
    </div>
  );
}

function WeeklyChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end justify-between gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10" style={{ height: 120 }}>
      {data.map((d, i) => {
        const day = new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' });
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-ink-muted">{d.count || ''}</span>
            <div
              className={cn('w-full rounded-t', d.count > 0 ? 'bg-accent' : 'bg-black/10 dark:bg-white/10')}
              style={{ height: `${(d.count / max) * 70}px`, minHeight: 2 }}
            />
            <span className="text-[10px] text-ink-muted">{day}</span>
          </div>
        );
      })}
    </div>
  );
}
