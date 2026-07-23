import { AlertTriangle, Loader2, type LucideIcon } from 'lucide-react';
import { Button } from './Button';

/** Full-area loading spinner. */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-muted">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Error state with a retry button. Never leave a blank screen on failure. */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertTriangle className="h-8 w-8 text-amber-500" />
      <h2 className="text-lg font-bold">{title}</h2>
      {message && <p className="max-w-sm text-sm text-ink-muted">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Empty state with an optional call-to-action. */
export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {Icon && <Icon className="h-10 w-10 text-ink-muted" />}
      <h2 className="text-lg font-bold">{title}</h2>
      {message && <p className="max-w-sm text-sm text-ink-muted">{message}</p>}
      {action && (
        <Button size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
