import { useMemo, useState } from 'react';
import { gradeMatchPairs } from '@/lib/grading';
import { shuffle, cn } from '@/lib/utils';
import type { ActivityChoiceRow } from '@/lib/database.types';
import type { QuizActivityProps } from './types';

/** Two columns; tap a left item then a right item to pair. Grades once all
 * left items are matched. */
export function MatchPairQuiz({ activity, disabled, reveal, onAnswer }: QuizActivityProps) {
  const { left, right } = useMemo(() => {
    const groups = new Map<string, ActivityChoiceRow[]>();
    for (const c of activity.choices) {
      const key = c.match_key ?? c.id;
      const g = groups.get(key) ?? [];
      g.push(c);
      groups.set(key, g);
    }
    const l: ActivityChoiceRow[] = [];
    const r: ActivityChoiceRow[] = [];
    for (const g of groups.values()) {
      if (g[0]) l.push(g[0]);
      if (g[1]) r.push(g[1]);
    }
    return { left: shuffle(l), right: shuffle(r) };
  }, [activity.id]);

  const [selLeft, setSelLeft] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({}); // leftId -> rightId

  const rightUsed = new Set(Object.values(matches));
  const keyOf = (id: string) => activity.choices.find((c) => c.id === id)?.match_key ?? id;

  function pairWith(rightId: string) {
    if (!selLeft || disabled) return;
    const next = { ...matches, [selLeft]: rightId };
    setSelLeft(null);
    setMatches(next);
    if (Object.keys(next).length === left.length) {
      const pairs = Object.entries(next).map(([lId, rId]) => ({ keyA: keyOf(lId), keyB: keyOf(rId) }));
      onAnswer(gradeMatchPairs(pairs, left.length), pairs.map((p) => `${p.keyA}=${p.keyB}`).join(','));
    }
  }

  function cellState(isCorrect: boolean, active: boolean, matched: boolean) {
    if (disabled && reveal) return isCorrect ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10';
    if (active) return 'border-accent bg-accent/10';
    if (matched) return 'border-accent/40 opacity-60';
    return 'border-black/10 dark:border-white/15';
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-2">
        {left.map((c) => {
          const matched = c.id in matches;
          const correct = matched && keyOf(c.id) === keyOf(matches[c.id]);
          return (
            <button
              key={c.id}
              disabled={disabled || matched}
              onClick={() => setSelLeft(c.id)}
              className={cn('jp rounded-xl border-2 p-3 text-lg font-semibold', cellState(correct, selLeft === c.id, matched))}
              lang="ja"
            >
              {c.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2">
        {right.map((c) => {
          const used = rightUsed.has(c.id);
          return (
            <button
              key={c.id}
              disabled={disabled || used}
              onClick={() => pairWith(c.id)}
              className={cn(
                'jp rounded-xl border-2 p-3 text-lg font-semibold',
                used ? 'border-accent/40 opacity-60' : 'border-black/10 dark:border-white/15',
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
