import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AudioButton } from '@/components/japanese/AudioButton';
import type { QuizActivityProps } from './types';

/** Front (Japanese + audio) → reveal → self-grade. */
export function FlashcardQuiz({ activity, disabled, onAnswer }: QuizActivityProps) {
  const [revealed, setRevealed] = useState(false);
  const front = activity.japanese_text || activity.tts_text || '';
  const back = activity.correct_answer || activity.explanation_md || '';

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex min-h-[140px] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-black/10 p-6 dark:border-white/15">
        <span className="jp text-4xl" lang="ja">{front}</span>
        <AudioButton text={activity.tts_text} size="lg" />
        {revealed && back && <span className="text-lg text-ink-muted">{back}</span>}
      </div>

      {!revealed ? (
        <Button size="lg" className="w-full" onClick={() => setRevealed(true)}>
          Reveal answer
        </Button>
      ) : (
        <div className="grid w-full grid-cols-2 gap-3">
          <Button
            variant="secondary"
            size="lg"
            disabled={disabled}
            onClick={() => onAnswer({ correct: false, almost: false }, "didn't know")}
          >
            I didn't know
          </Button>
          <Button
            size="lg"
            disabled={disabled}
            onClick={() => onAnswer({ correct: true, almost: false }, 'knew it')}
          >
            I knew it
          </Button>
        </div>
      )}
    </div>
  );
}
