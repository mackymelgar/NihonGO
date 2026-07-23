import { useState } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { audio } from '@/lib/tts';
import { useSettings } from '@/stores/settingsStore';
import { cn } from '@/lib/utils';

/** Plays `text` (kana) via TTS. Idle / playing / unavailable states; failure
 * never throws to the caller. */
export function AudioButton({
  text,
  size = 'md',
  className,
}: {
  text: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const rate = useSettings((s) => s.ttsRate);
  const [playing, setPlaying] = useState(false);
  const available = audio.isAvailable();
  const disabled = !text || !available;

  const dim = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
  const icon = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

  async function handlePlay() {
    if (disabled || playing) return;
    setPlaying(true);
    try {
      await audio.play(text!, { rate });
    } catch {
      /* audio failure must never block the UI */
    } finally {
      setPlaying(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handlePlay}
      disabled={disabled}
      title={!available ? 'Japanese audio unavailable in this browser' : 'Play audio'}
      aria-label="Play audio"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent transition-colors hover:bg-accent/20 disabled:opacity-40',
        dim,
        className,
      )}
    >
      {playing ? (
        <Loader2 className={cn(icon, 'animate-spin')} />
      ) : available ? (
        <Volume2 className={icon} />
      ) : (
        <VolumeX className={icon} />
      )}
    </button>
  );
}
