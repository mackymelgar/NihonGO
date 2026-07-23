import { STATUS_LABELS } from '@/lib/content';
import type { ContentStatus } from '@/lib/database.types';
import { cn } from '@/lib/utils';

const styles: Record<ContentStatus, string> = {
  draft: 'bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300',
  ready_for_review: 'bg-amber-200 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  published: 'bg-green-200 text-green-800 dark:bg-green-500/20 dark:text-green-200',
  archived: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200',
};

export function StatusChip({ status, className }: { status: ContentStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2 py-0.5 text-xs font-bold',
        styles[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
