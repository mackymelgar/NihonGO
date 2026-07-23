import { useEffect, useMemo, useState } from 'react';
import { gradeChoice } from '@/lib/grading';
import { shuffle, cn } from '@/lib/utils';
import { audio } from '@/lib/tts';
import { useSettings } from '@/stores/settingsStore';
import { AudioButton } from '@/components/japanese/AudioButton';
import type { QuizActivityProps } from './types';

/** Multiple-choice, listen-and-choose, and fill-in-blank-with-choices. */
export function ChoiceQuiz({ activity, disabled, reveal, onAnswer, audioFirst }: QuizActivityProps & { audioFirst?: boolean }) {
  const ttsRate = useSettings((s) => s.ttsRate);
  const [picked, setPicked] = useState<string | null>(null);
  const choices = useMemo(() => shuffle(activity.choices), [activity.id]);

  // Auto-play once for listen-and-choose.
  useEffect(() => {
    if (audioFirst && activity.tts_text) void audio.play(activity.tts_text, { rate: ttsRate }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id]);

  const noAudio = audioFirst && !audio.isAvailable();

  return (
    <div className="flex flex-col gap-4">
      {audioFirst && (
        <div className="flex flex-col items-center gap-2">
          <AudioButton text={activity.tts_text} size="lg" />
          {noAudio && (
            <p className="jp text-2xl" lang="ja">
              {activity.tts_text} <span className="text-xs text-ink-muted">(audio unavailable)</span>
            </p>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {choices.map((c) => {
          const isPicked = picked === c.id;
          const showState = disabled && reveal;
          return (
            <button
              key={c.id}
              disabled={disabled}
              onClick={() => {
                setPicked(c.id);
                onAnswer(gradeChoice(c), c.label);
              }}
              className={cn(
                'jp min-h-[56px] rounded-2xl border-2 p-3 text-xl font-semibold transition-colors',
                !showState && 'border-black/10 hover:border-accent dark:border-white/15',
                showState && c.is_correct && 'border-green-500 bg-green-500/10',
                showState && isPicked && !c.is_correct && 'border-red-500 bg-red-500/10',
                showState && !c.is_correct && !isPicked && 'border-black/10 opacity-50 dark:border-white/15',
              )}
              lang="ja"
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
