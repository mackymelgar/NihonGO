import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Clock, ArrowRight, Map } from 'lucide-react';
import type { CompleteQuestResult, QuestRow } from '@/lib/database.types';
import { Button } from '@/components/ui/Button';

/** Victory screen after completing a quest. */
export function CompletionScreen({
  quest,
  result,
}: {
  quest: QuestRow;
  result: CompleteQuestResult;
}) {
  const navigate = useNavigate();
  const xp = useCountUp(result.xp_earned);
  const nextQuest = result.unlocked_quests[0];

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="text-6xl">🎉</div>
      <div>
        <h1 className="text-3xl font-extrabold">Quest complete!</h1>
        <p className="mt-1 text-ink-muted">{quest.title}</p>
      </div>

      <div className="flex items-center gap-2 rounded-2xl bg-accent/10 px-6 py-4 text-2xl font-extrabold text-accent">
        <Sparkles className="h-6 w-6" />+{xp} XP
      </div>

      {result.leveled_up && (
        <div className="rounded-2xl bg-amber-100 px-4 py-2 font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
          ⬆️ Level up! You’re now level {result.new_level}
        </div>
      )}

      {result.badge && (
        <div className="flex flex-col items-center gap-1 rounded-2xl border-2 border-accent/30 p-4">
          <span className="text-4xl">{result.badge.icon_emoji}</span>
          <span className="font-bold">Badge earned: {result.badge.title}</span>
        </div>
      )}

      {result.unlocked_areas.length > 0 && (
        <div className="rounded-2xl bg-green-500/10 px-4 py-2 font-semibold text-green-700 dark:text-green-300">
          🗺️ New area unlocked: {result.unlocked_areas.map((a) => a.title).join(', ')}
        </div>
      )}

      <p className="flex items-center gap-1 text-sm text-ink-muted">
        <Clock className="h-4 w-4" /> Next review in ~4 hours
      </p>

      <div className="flex w-full flex-col gap-2">
        {nextQuest ? (
          <Button size="lg" onClick={() => navigate(`/quest/${nextQuest.slug}`)}>
            Next quest: {nextQuest.title} <ArrowRight className="h-4 w-4" />
          </Button>
        ) : null}
        <Button variant="secondary" size="lg" onClick={() => navigate('/roadmap')}>
          <Map className="h-4 w-4" /> Back to map
        </Button>
      </div>
    </div>
  );
}

function useCountUp(target: number, ms = 800) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (target <= 0) return;
    // Reduced motion (or no rAF): jump straight to the final value.
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof requestAnimationFrame === 'undefined') {
      setN(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setN(Math.round(p * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Safety net: rAF is throttled/paused in backgrounded tabs, so guarantee
    // the final value lands regardless.
    const fallback = setTimeout(() => setN(target), ms + 150);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
    };
  }, [target, ms]);
  return n;
}
