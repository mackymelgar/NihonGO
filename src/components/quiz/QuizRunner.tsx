import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { GradeResult } from '@/lib/grading';
import type { PlayerActivity } from '@/hooks/learner/useQuestPlayer';
import { Button } from '@/components/ui/Button';
import { Markdown } from '@/components/Markdown';
import { AudioButton } from '@/components/japanese/AudioButton';
import { cn } from '@/lib/utils';
import { ChoiceQuiz } from './ChoiceQuiz';
import { TypingQuiz } from './TypingQuiz';
import { SentenceBuilderQuiz } from './SentenceBuilderQuiz';
import { MatchPairQuiz } from './MatchPairQuiz';
import { FlashcardQuiz } from './FlashcardQuiz';
import { SpeakingQuiz } from './SpeakingQuiz';
import type { QuizActivityProps } from './types';

/**
 * Orchestrates one activity: renders the right component, grades the answer,
 * shows feedback (unless boss mode), and reports the result on continue.
 */
export function QuizRunner({
  activity,
  showFeedback = true,
  onResult,
  onContinue,
}: {
  activity: PlayerActivity;
  /** Lesson/review show inline feedback; boss mode does not. */
  showFeedback?: boolean;
  /** Called once when the answer is graded (for logging + SRS). */
  onResult: (result: GradeResult, rawAnswer: string) => void;
  /** Called to advance to the next item. */
  onContinue: (result: GradeResult) => void;
}) {
  const [graded, setGraded] = useState<GradeResult | null>(null);

  function handleAnswer(result: GradeResult, raw: string) {
    if (graded) return;
    setGraded(result);
    onResult(result, raw);
    // Boss mode: no feedback, advance immediately.
    if (!showFeedback) onContinue(result);
  }

  const props: QuizActivityProps = {
    activity,
    disabled: graded !== null,
    reveal: showFeedback && graded !== null,
    onAnswer: handleAnswer,
  };

  return (
    <div className="flex flex-col gap-5">
      {activity.prompt_md && <Markdown size="lg" className="font-semibold">{activity.prompt_md}</Markdown>}

      <ActivityBody activity={activity} props={props} />

      {showFeedback && graded && (
        <Feedback activity={activity} result={graded} onContinue={() => onContinue(graded)} />
      )}
    </div>
  );
}

function ActivityBody({ activity, props }: { activity: PlayerActivity; props: QuizActivityProps }) {
  switch (activity.activity_type) {
    case 'multiple_choice':
      return <ChoiceQuiz {...props} />;
    case 'listen_and_choose':
      return <ChoiceQuiz {...props} audioFirst />;
    case 'fill_in_blank':
      return activity.choices.length > 0 ? <ChoiceQuiz {...props} /> : <TypingQuiz {...props} />;
    case 'typing':
      return <TypingQuiz {...props} />;
    case 'sentence_builder':
      return <SentenceBuilderQuiz {...props} />;
    case 'match_pair':
      return <MatchPairQuiz {...props} />;
    case 'flashcard':
      return <FlashcardQuiz {...props} />;
    case 'speaking':
      return <SpeakingQuiz {...props} />;
    default:
      return null;
  }
}

function Feedback({
  activity,
  result,
  onContinue,
}: {
  activity: PlayerActivity;
  result: GradeResult;
  onContinue: () => void;
}) {
  const correctChoice = activity.choices.find((c) => c.is_correct);
  const correctText =
    activity.correct_answer ||
    correctChoice?.label ||
    (activity.sentence_tokens ? activity.sentence_tokens.join(' ') : null);

  return (
    <div
      className={cn(
        'rounded-2xl p-4',
        result.correct ? 'bg-green-500/10' : 'bg-red-500/10',
      )}
    >
      <div className="mb-1 flex items-center gap-2 font-bold">
        {result.correct ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-600" /> Correct!
          </>
        ) : (
          <>
            <XCircle className="h-5 w-5 text-red-500" />
            {result.almost ? 'Almost! Check your spelling' : 'Not yet — you’ll get it!'}
          </>
        )}
      </div>

      {!result.correct && correctText && (
        <p className="flex items-center gap-2 text-sm">
          Answer: <span className="jp text-lg font-semibold" lang="ja">{correctText}</span>
          <AudioButton text={activity.tts_text || correctText} size="sm" />
        </p>
      )}
      {activity.explanation_md && <Markdown size="sm" className="mt-1 text-ink-muted">{activity.explanation_md}</Markdown>}

      <Button className="mt-3 w-full" size="lg" onClick={onContinue}>
        Continue
      </Button>
    </div>
  );
}
