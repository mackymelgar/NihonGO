import { useState } from 'react';
import { gradeTyped } from '@/lib/grading';
import { Button } from '@/components/ui/Button';
import type { QuizActivityProps } from './types';

/** Typing and fill-in-blank (no choices). IME-safe: never blocks composition. */
export function TypingQuiz({ activity, disabled, onAnswer }: QuizActivityProps) {
  const [value, setValue] = useState('');
  const [composing, setComposing] = useState(false);

  function submit() {
    if (disabled || !value.trim()) return;
    onAnswer(gradeTyped(value, activity.correct_answer, activity.accepted_answers), value);
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        autoFocus
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !composing) submit();
        }}
        placeholder="Type your answer (kana or romaji)…"
        className="jp h-14 rounded-2xl border-2 border-black/10 bg-white/70 px-4 text-2xl outline-none focus:border-accent disabled:opacity-60 dark:border-white/15 dark:bg-white/5"
        lang="ja"
      />
      <Button size="lg" disabled={disabled || !value.trim()} onClick={submit}>
        Check
      </Button>
    </div>
  );
}
