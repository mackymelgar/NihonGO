import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and disables the button. Use for in-flight mutations. */
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent/90 shadow-sm disabled:opacity-50',
  secondary:
    'bg-parchment-200 text-ink hover:bg-parchment-300 dark:bg-white/10 dark:text-parchment-100 dark:hover:bg-white/20',
  ghost: 'text-ink hover:bg-black/5 dark:text-parchment-100 dark:hover:bg-white/10',
  danger: 'bg-red-500 text-white hover:bg-red-600 disabled:opacity-50',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-base',
  lg: 'h-14 px-6 text-lg',
};

/** Themed button. Disables itself while `loading` to prevent double-submit. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-colors',
        'disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});
