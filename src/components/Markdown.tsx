import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

/**
 * Renders authored markdown (lesson bodies, quiz prompts, explanations).
 * Styled by hand rather than via @tailwindcss/typography to keep deps light and
 * match the adventure-journal theme. react-markdown escapes HTML by default.
 */
export function Markdown({
  children,
  className,
  size = 'md',
}: {
  children: string | null | undefined;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (!children) return null;
  const text = size === 'lg' ? 'text-lg leading-relaxed' : size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <div className={cn(text, className)}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-extrabold text-accent">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="jp rounded bg-black/10 px-1 py-0.5 text-[0.95em] dark:bg-white/15">{children}</code>
          ),
          ul: ({ children }) => <ul className="mb-3 list-inside list-disc space-y-1 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-inside list-decimal space-y-1 last:mb-0">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          h1: ({ children }) => <h1 className="mb-2 text-2xl font-extrabold">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 text-xl font-bold">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 text-lg font-bold">{children}</h3>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-accent underline">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-accent/40 pl-3 italic text-ink-muted">{children}</blockquote>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
