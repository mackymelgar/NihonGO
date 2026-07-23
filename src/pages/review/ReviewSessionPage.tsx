import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { X, Flame, Heart } from 'lucide-react';
import { useReviewSession, useSubmitReview, type ReviewCard } from '@/hooks/learner/useReviewSession';
import type { ItemType, MasteryState } from '@/lib/database.types';
import type { GradeResult } from '@/lib/grading';
import { QuizRunner } from '@/components/quiz/QuizRunner';
import { MasteryGem } from '@/components/MasteryGem';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { Swords } from 'lucide-react';

type QueueEntry = { card: ReviewCard; isRequeue: boolean };

export default function ReviewSessionPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const type = (params.get('type') as ItemType | null) ?? undefined;
  const limit = params.get('limit') ? Number(params.get('limit')) : undefined;
  const itemIds = params.get('items')?.split(',').filter(Boolean);

  const { data, isLoading, isError, refetch } = useReviewSession({ itemType: type, limit, itemIds });

  if (isLoading) return <LoadingState label="Preparing your battle…" />;
  if (isError || !data) return <ErrorState message="Couldn't start the review." onRetry={() => refetch()} />;
  if (data.length === 0)
    return (
      <div className="p-6">
        <EmptyState icon={Swords} title="Nothing to review here" action={{ label: 'Back', onClick: () => navigate('/review') }} />
      </div>
    );

  return <Session initial={data} onExit={() => navigate('/review')} />;
}

function Session({ initial, onExit }: { initial: ReviewCard[]; onExit: () => void }) {
  const submit = useSubmitReview();
  const originalTotal = initial.length;

  const [queue, setQueue] = useState<QueueEntry[]>(() => initial.map((card) => ({ card, isRequeue: false })));
  const [pos, setPos] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [firstAttempts, setFirstAttempts] = useState({ correct: 0, total: 0 });
  const [xp, setXp] = useState(0);
  const [passed, setPassed] = useState<Set<string>>(new Set());
  const [transitions, setTransitions] = useState<Record<string, { before: MasteryState; after: MasteryState }>>({});
  const finished = pos >= queue.length;

  const entry = queue[pos];

  function handleResult(result: GradeResult) {
    const { card, isRequeue } = entry;

    setCombo((c) => {
      const next = result.correct ? c + 1 : 0;
      setMaxCombo((m) => Math.max(m, next));
      return next;
    });

    if (result.correct) setPassed((p) => new Set(p).add(card.item.id));

    if (!isRequeue) {
      setFirstAttempts((f) => ({ correct: f.correct + (result.correct ? 1 : 0), total: f.total + 1 }));
      // Persist SRS only on first attempt (re-queued reps don't raise the stage).
      submit
        .mutateAsync({ card, isCorrect: result.correct })
        .then((res) => {
          setXp((x) => x + res.xp_earned);
          setTransitions((t) => ({ ...t, [card.item.id]: { before: card.mastery.state, after: res.state } }));
        })
        .catch(() => {});
    }

    if (!result.correct) {
      setQueue((q) => [...q, { card, isRequeue: true }]);
    }
  }

  function handleContinue() {
    setPos((p) => p + 1);
  }

  if (finished) {
    const advanced = Object.values(transitions).filter((t) => rank(t.after) > rank(t.before)).length;
    const demoted = Object.values(transitions).filter((t) => rank(t.after) < rank(t.before)).length;
    const accuracy = firstAttempts.total > 0 ? Math.round((firstAttempts.correct / firstAttempts.total) * 100) : 0;
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="text-6xl">⚔️</div>
        <h1 className="text-3xl font-extrabold">Battle won!</h1>
        <div className="grid w-full grid-cols-2 gap-3">
          <Stat label="Accuracy" value={`${accuracy}%`} />
          <Stat label="XP earned" value={`+${xp}`} />
          <Stat label="Best combo" value={`${maxCombo}🔥`} />
          <Stat label="Items" value={`${originalTotal}`} />
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-green-600">▲ {advanced} advanced</span>
          <span className="text-red-500">▼ {demoted} demoted</span>
        </div>
        <Button size="lg" className="w-full" onClick={onExit}>
          Back to review
        </Button>
      </div>
    );
  }

  const hpFraction = Math.max(0, (originalTotal - passed.size) / originalTotal);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col p-4">
      {/* Battle header */}
      <div className="mb-4 flex items-center gap-3">
        <button onClick={onExit} className="rounded-full p-2 text-ink-muted hover:bg-black/5 dark:hover:bg-white/10" title="Exit">
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-xs font-bold text-ink-muted">
            <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-500" /> Enemy</span>
            {combo >= 2 && <span className="flex items-center gap-1 text-orange-500"><Flame className="h-3 w-3" /> {combo} combo</span>}
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div className="h-full rounded-full bg-red-500 transition-all duration-500" style={{ width: `${hpFraction * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="mb-2 flex items-center gap-2">
        <MasteryGem state={entry.card.mastery.state} showLabel={false} />
        <span className="text-xs uppercase text-ink-muted">{entry.card.skill} · {entry.card.item.item_type}</span>
      </div>

      <div className="flex flex-1 flex-col justify-center py-4">
        <QuizRunner key={pos} activity={entry.card.activity} onResult={handleResult} onContinue={handleContinue} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/60 p-4 dark:bg-white/5">
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-ink-muted">{label}</div>
    </div>
  );
}

const ORDER: MasteryState[] = ['forgotten', 'weak', 'new', 'learning', 'familiar', 'strong', 'mastered'];
function rank(s: MasteryState): number {
  return ORDER.indexOf(s);
}
