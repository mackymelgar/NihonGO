import { forwardRef, useState, type ReactNode } from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const baseInput =
  'h-11 w-full rounded-2xl border border-black/10 bg-white/70 px-4 text-base outline-none focus:border-accent disabled:opacity-50 dark:border-white/15 dark:bg-white/5';

/** Labeled field wrapper with error text. */
export function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {label && (
        <span>
          {label}
          {required && <span className="text-red-500"> *</span>}
        </span>
      )}
      <span className="font-normal">{children}</span>
      {hint && !error && <span className="text-xs font-normal text-ink-muted">{hint}</span>}
      {error && <span className="text-xs font-normal text-red-500">{error}</span>}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(baseInput, className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(baseInput, 'h-auto min-h-[80px] py-2 leading-relaxed', className)}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }
>(function Select({ className, options, ...props }, ref) {
  return (
    <select ref={ref} className={cn(baseInput, 'appearance-none', className)} {...props}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
});

/** Multi-checkbox for enum arrays (e.g. skills). */
export function CheckboxGroup<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T[];
  onChange: (next: T[]) => void;
  labels?: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() =>
              onChange(active ? value.filter((v) => v !== opt) : [...value, opt])
            }
            className={cn(
              'rounded-full border-2 px-3 py-1 text-sm font-semibold transition-colors',
              active
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-black/10 text-ink-muted hover:border-accent/50 dark:border-white/15',
            )}
          >
            {labels?.[opt] ?? opt}
          </button>
        );
      })}
    </div>
  );
}

/** Editable list of free-text strings (tags, accepted answers, tokens). */
export function StringListEditor({
  value,
  onChange,
  placeholder = 'Add…',
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  function add() {
    const v = draft.trim();
    if (!v) return;
    onChange([...value, v]);
    setDraft('');
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {value.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-parchment-200 px-2 py-0.5 text-sm dark:bg-white/10"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="text-ink-muted hover:text-red-500"
              aria-label={`Remove ${v}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          onClick={add}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-parchment-200 hover:bg-parchment-300 dark:bg-white/10"
          aria-label="Add"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
