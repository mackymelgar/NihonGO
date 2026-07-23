import type { MasteryState } from '@/lib/database.types';
import { cn } from '@/lib/utils';

const GEM: Record<MasteryState, { emoji: string; label: string; className: string }> = {
  new: { emoji: '⚪', label: 'New', className: 'text-ink-muted' },
  learning: { emoji: '🔵', label: 'Learning', className: 'text-blue-500' },
  familiar: { emoji: '🟠', label: 'Familiar', className: 'text-orange-500' },
  strong: { emoji: '🟢', label: 'Strong', className: 'text-green-600' },
  mastered: { emoji: '💎', label: 'Mastered', className: 'text-cyan-500' },
  weak: { emoji: '🔴', label: 'Weak', className: 'text-red-500' },
  forgotten: { emoji: '🟣', label: 'Forgotten', className: 'text-purple-500' },
};

export function MasteryGem({
  state,
  showLabel = true,
  className,
}: {
  state: MasteryState;
  showLabel?: boolean;
  className?: string;
}) {
  const g = GEM[state];
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm font-semibold', g.className, className)}>
      <span>{g.emoji}</span>
      {showLabel && g.label}
    </span>
  );
}
