import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useQuestPlayer, type PlayerStep } from '@/hooks/learner/useQuestPlayer';
import { useSaveStepProgress, useCompleteQuest } from '@/hooks/learner/useQuestProgress';
import { useLogAnswer } from '@/hooks/learner/useAnswerLog';
import type { CompleteQuestResult } from '@/lib/database.types';
import type { GradeResult } from '@/lib/grading';
import { Markdown } from '@/components/Markdown';
import { JapaneseText } from '@/components/japanese/JapaneseText';
import { AudioButton } from '@/components/japanese/AudioButton';
import { QuizRunner } from '@/components/quiz/QuizRunner';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { CompletionScreen } from './CompletionScreen';
import { cn } from '@/lib/utils';

export default function LessonPlayerPage() {
  const { questSlug } = useParams<{ questSlug: string }>();
  const [params] = useSearchParams();
  const preview = params.get('preview') === '1';
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuestPlayer(questSlug, preview);
  const saveStep = useSaveStepProgress();
  const completeQuest = useCompleteQuest();
  const logAnswer = useLogAnswer();

  const [stepIndex, setStepIndex] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [completion, setCompletion] = useState<CompleteQuestResult | null>(null);
  const scoreRef = useRef({ correct: 0, total: 0 });

  // Resume from saved progress once, when data loads.
  useEffect(() => {
    if (data && !initialized) {
      const resume = data.progress?.status === 'in_progress' ? data.progress.current_step_index : 0;
      setStepIndex(Math.min(resume, Math.max(0, data.steps.length - 1)));
      setInitialized(true);
    }
  }, [data, initialized]);

  if (isLoading) return <LoadingState label="Loading quest…" />;
  if (isError || !data) return <ErrorState message="Couldn't load this quest." onRetry={() => refetch()} />;

  if (completion) return <CompletionScreen quest={data.quest} result={completion} />;

  if (data.steps.length === 0) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-bold">This quest has no steps yet.</p>
        <Button onClick={() => navigate('/roadmap')}>Back to map</Button>
      </div>
    );
  }

  const step = data.steps[stepIndex];
  const isLast = stepIndex >= data.steps.length - 1;

  async function advance() {
    if (isLast) {
      if (preview) {
        navigate(-1);
        return;
      }
      const { correct, total } = scoreRef.current;
      const score = total > 0 ? correct / total : 1;
      try {
        const result = await completeQuest.mutateAsync({ questId: data!.quest.id, score });
        setCompletion(result);
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Could not save completion.');
      }
      return;
    }
    const next = stepIndex + 1;
    setStepIndex(next);
    if (!preview) saveStep.mutate({ questId: data!.quest.id, stepIndex: next });
  }

  function onQuizResult(result: GradeResult) {
    scoreRef.current.total += 1;
    if (result.correct) scoreRef.current.correct += 1;
    if (!preview && step.activity) {
      logAnswer({
        activityId: step.activity.id,
        itemId: step.activity.item_id,
        questId: data!.quest.id,
        context: 'lesson',
        activityType: step.activity.activity_type,
        skills: step.activity.skills,
        isCorrect: result.correct,
      });
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col p-4">
      {/* Top bar */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => (preview ? navigate(-1) : navigate('/roadmap'))}
          className="rounded-full p-2 text-ink-muted hover:bg-black/5 dark:hover:bg-white/10"
          title="Exit — your progress is saved"
        >
          <X className="h-5 w-5" />
        </button>
        <SegmentedProgress total={data.steps.length} current={stepIndex} />
      </div>

      {preview && (
        <div className="mb-4 rounded-xl bg-amber-100 px-3 py-2 text-center text-sm font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
          PREVIEW — progress is not saved
        </div>
      )}

      {/* Step body */}
      <div className="flex flex-1 flex-col justify-center py-6">
        <StepBody key={step.id} step={step} onQuizResult={onQuizResult} onQuizContinue={advance} />
      </div>

      {/* Footer continue (non-practice steps) */}
      {step.step_type !== 'practice' && (
        <Button size="lg" className="w-full" loading={completeQuest.isPending} onClick={advance}>
          {isLast ? 'Finish quest' : 'Continue'}
        </Button>
      )}
    </div>
  );
}

function StepBody({
  step,
  onQuizResult,
  onQuizContinue,
}: {
  step: PlayerStep;
  onQuizResult: (r: GradeResult) => void;
  onQuizContinue: () => void;
}) {
  if (step.step_type === 'explanation') {
    return (
      <div className="flex flex-col gap-4">
        {step.title && <h2 className="text-2xl font-extrabold">{step.title}</h2>}
        <Markdown size="lg">{step.body_md}</Markdown>
      </div>
    );
  }

  if (step.step_type === 'example') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        {step.title && <h2 className="text-xl font-bold">{step.title}</h2>}
        {step.japanese_text && (
          <JapaneseText japanese={step.japanese_text} kana={step.kana_reading} romaji={step.romaji} size="xl" />
        )}
        <AudioButton text={step.tts_text} size="lg" />
        {step.english_meaning && <p className="text-lg text-ink-muted">{step.english_meaning}</p>}
        {step.body_md && <Markdown>{step.body_md}</Markdown>}
      </div>
    );
  }

  // practice
  if (step.activity) {
    return <QuizRunner activity={step.activity} onResult={onQuizResult} onContinue={onQuizContinue} />;
  }
  return (
    <div className="text-center text-ink-muted">
      <p>This practice step has no activity attached.</p>
      <Button className="mt-4" onClick={onQuizContinue}>Skip</Button>
    </div>
  );
}

function SegmentedProgress({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex flex-1 gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-2 flex-1 rounded-full transition-colors',
            i <= current ? 'bg-accent' : 'bg-black/10 dark:bg-white/15',
          )}
        />
      ))}
    </div>
  );
}
