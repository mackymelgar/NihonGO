import { useMemo, useState } from 'react';
import { gradeSentence } from '@/lib/grading';
import { shuffle, cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { QuizActivityProps } from './types';

/** Tap tokens from the bank into the answer row, in order. */
export function SentenceBuilderQuiz({ activity, disabled, onAnswer }: QuizActivityProps) {
  const target = activity.sentence_tokens ?? [];
  const bankTokens = useMemo(
    () => shuffle([...target, ...(activity.distractor_tokens ?? [])]).map((t, i) => ({ id: i, t })),
    [activity.id],
  );
  const [used, setUsed] = useState<number[]>([]);

  const answer = used.map((i) => bankTokens[i].t);
  const available = bankTokens.filter((b) => !used.includes(b.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="min-h-[56px] rounded-2xl border-2 border-dashed border-black/15 p-2 dark:border-white/15">
        <div className="flex flex-wrap gap-2">
          {used.map((id, idx) => (
            <button
              key={id}
              disabled={disabled}
              onClick={() => setUsed((u) => u.filter((_, j) => j !== idx))}
              className="jp rounded-xl bg-accent/10 px-3 py-1.5 text-xl text-accent"
              lang="ja"
            >
              {bankTokens[id].t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {available.map((b) => (
          <button
            key={b.id}
            disabled={disabled}
            onClick={() => setUsed((u) => [...u, b.id])}
            className={cn(
              'jp rounded-xl border-2 border-black/10 bg-white/70 px-3 py-1.5 text-xl dark:border-white/15 dark:bg-white/5',
              !disabled && 'hover:border-accent',
            )}
            lang="ja"
          >
            {b.t}
          </button>
        ))}
      </div>

      <Button
        size="lg"
        disabled={disabled || answer.length === 0}
        onClick={() => onAnswer(gradeSentence(answer, target), answer.join(' '))}
      >
        Check
      </Button>
    </div>
  );
}
