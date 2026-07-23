import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Swords, Heart, RefreshCw, Target } from 'lucide-react';
import { useBossChallenge, useSubmitBoss, type BossAnswers } from '@/hooks/learner/useBoss';
import type { BossAttemptResult, SkillType } from '@/lib/database.types';
import type { GradeResult } from '@/lib/grading';
import { QuizRunner } from '@/components/quiz/QuizRunner';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { CompletionScreen } from '@/pages/quest/CompletionScreen';

type Phase = 'entry' | 'running' | 'result';

export default function BossPage() {
  const { questSlug } = useParams<{ questSlug: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useBossChallenge(questSlug);
  const submit = useSubmitBoss();

  const [phase, setPhase] = useState<Phase>('entry');
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [result, setResult] = useState<BossAttemptResult | null>(null);
  const answersRef = useRef<BossAnswers>({});

  // Reset state when navigating to a different boss
  useEffect(() => {
    setPhase('entry');
    setIndex(0);
    setCorrect(0);
    setResult(null);
    answersRef.current = {};
  }, [questSlug]);

  if (isLoading) return <LoadingState label="Approaching the boss…" />;
  if (isError || !data) return <ErrorState message="Couldn't load this boss." onRetry={() => refetch()} />;

  const { quest, activities, progress } = data;
  const total = activities.length;

  function reset() {
    answersRef.current = {};
    setIndex(0);
    setCorrect(0);
    setResult(null);
    setPhase('running');
  }

  function handleResult(activityId: string, r: GradeResult, raw: string) {
    answersRef.current[activityId] = { answer: raw, client_correct: r.correct };
    if (r.correct) setCorrect((c) => c + 1);
  }

  async function handleContinue() {
    if (index + 1 >= total) {
      const res = await submit.mutateAsync({ questId: quest.id, answers: answersRef.current });
      setResult(res);
      setPhase('result');
    } else {
      setIndex((i) => i + 1);
    }
  }

  // ---- Entry ----
  if (phase === 'entry') {
    return (
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
        <button onClick={() => navigate(-1)} className="absolute left-4 top-4 rounded-full p-2 text-ink-muted hover:bg-black/5 dark:hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent text-white shadow-lg">
          <Swords className="h-12 w-12" />
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-accent">Boss Challenge</p>
          <h1 className="text-3xl font-extrabold">{quest.title}</h1>
          {quest.learning_goal && <p className="mt-1 text-ink-muted">{quest.learning_goal}</p>}
        </div>
        <div className="w-full rounded-2xl border border-black/10 p-4 text-left text-sm dark:border-white/10">
          <Rule label="Questions" value={`${total}`} />
          <Rule label="To pass" value={`${Math.round(quest.pass_threshold * 100)}%`} />
          <Rule label="Skills" value={quest.skills_trained.join(', ')} />
          {progress && progress.attempts > 0 && <Rule label="Attempts" value={`${progress.attempts}`} />}
        </div>
        <p className="text-sm text-ink-muted">No hints during the fight — results come at the end. You’ve got this!</p>
        <Button size="lg" className="w-full" disabled={total === 0} onClick={() => setPhase('running')}>
          {total === 0 ? 'No questions yet' : 'Begin the battle'}
        </Button>
      </div>
    );
  }

  // ---- Result ----
  if (phase === 'result' && result) {
    if (result.passed && result.completion) {
      return <CompletionScreen quest={quest} result={result.completion} />;
    }
    return (
      <FailScreen
        result={result}
        onRetry={reset}
        onExit={() => navigate(-1)}
        onReview={(ids) => navigate(`/review/session?items=${ids.join(',')}`)}
      />
    );
  }

  // ---- Running (no feedback) ----
  const activity = activities[index];
  const hp = Math.max(0, 1 - correct / Math.max(1, total));
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col p-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 text-ink-muted hover:bg-black/5 dark:hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-xs font-bold text-ink-muted">
            <span className="flex items-center gap-1"><Swords className="h-3 w-3 text-accent" /> {quest.title}</span>
            <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-500" /> {index + 1}/{total}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div className="h-full rounded-full bg-red-500 transition-all duration-500" style={{ width: `${hp * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center py-4">
        <QuizRunner
          key={index}
          activity={activity}
          showFeedback={false}
          onResult={(r, raw) => handleResult(activity.id, r, raw)}
          onContinue={handleContinue}
        />
      </div>
    </div>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-ink-muted">{label}</span>
      <span className="font-semibold capitalize">{value}</span>
    </div>
  );
}

function FailScreen({
  result,
  onRetry,
  onExit,
  onReview,
}: {
  result: BossAttemptResult;
  onRetry: () => void;
  onExit: () => void;
  onReview: (ids: string[]) => void;
}) {
  const bySkill = new Map<SkillType, BossAttemptResult['missed']>();
  for (const m of result.missed) {
    for (const s of m.skills) {
      const list = bySkill.get(s) ?? [];
      list.push(m);
      bySkill.set(s, list);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="text-6xl">💪</div>
      <div>
        <h1 className="text-3xl font-extrabold">Not yet — you’ll get it!</h1>
        <p className="mt-1 text-ink-muted">
          You scored {Math.round(result.score * 100)}% ({result.correct}/{result.total}). Attempt {result.attempts}.
        </p>
      </div>

      {result.missed.length > 0 && (
        <div className="w-full rounded-2xl border border-black/10 p-4 text-left dark:border-white/10">
          <p className="mb-2 text-sm font-bold">Missed items by skill</p>
          {[...bySkill.entries()].map(([skill, items]) => (
            <div key={skill} className="mb-2">
              <p className="text-xs font-bold uppercase text-ink-muted">{skill}</p>
              <div className="flex flex-wrap gap-1">
                {items.map((m) => (
                  <span key={m.activity_id} className="jp rounded-full bg-parchment-200 px-2 py-0.5 text-sm dark:bg-white/10" lang="ja">
                    {m.japanese ?? m.prompt.slice(0, 12)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex w-full flex-col gap-2">
        {result.missed_item_ids.length > 0 && (
          <Button size="lg" onClick={() => onReview(result.missed_item_ids)}>
            <Target className="h-4 w-4" /> Review these now
          </Button>
        )}
        <Button variant="secondary" size="lg" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> Try again
        </Button>
        <Button variant="ghost" onClick={onExit}>
          Back to map
        </Button>
      </div>
    </div>
  );
}
