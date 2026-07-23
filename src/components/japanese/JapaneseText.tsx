import { useSettings } from '@/stores/settingsStore';
import { cn } from '@/lib/utils';

/**
 * Renders Japanese with optional whole-word furigana (ruby) and romaji.
 * Per-character furigana isn't in the data model for v1, so we ruby the whole
 * string with its kana reading — accurate for single kana/words.
 */
export function JapaneseText({
  japanese,
  kana,
  romaji,
  size = 'lg',
  className,
}: {
  japanese: string;
  kana?: string | null;
  romaji?: string | null;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const { furiganaEnabled, romajiEnabled } = useSettings();
  const showFurigana = furiganaEnabled && kana && kana !== japanese;

  const textSize = size === 'xl' ? 'text-5xl' : size === 'lg' ? 'text-4xl' : 'text-2xl';

  return (
    <span className={cn('inline-flex flex-col items-center', className)}>
      {showFurigana ? (
        <ruby className={cn('jp leading-tight', textSize)} lang="ja">
          {japanese}
          <rt className="text-[0.4em] text-ink-muted">{kana}</rt>
        </ruby>
      ) : (
        <span className={cn('jp leading-tight', textSize)} lang="ja">
          {japanese}
        </span>
      )}
      {romajiEnabled && romaji && <span className="mt-1 text-sm text-ink-muted">{romaji}</span>}
    </span>
  );
}
