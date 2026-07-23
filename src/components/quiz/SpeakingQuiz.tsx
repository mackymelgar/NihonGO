import { useState } from 'react';
import { Mic, Loader2, MicOff } from 'lucide-react';
import { speech } from '@/lib/speech';
import { scoreSpeech } from '@/lib/speechScore';
import { AudioButton } from '@/components/japanese/AudioButton';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { QuizActivityProps } from './types';

/** Speaking practice: hear the model, say it aloud, get scored by the browser
 * speech recognizer. Falls back to honest self-report when recognition isn't
 * available (Firefox/Safari). */
export function SpeakingQuiz({ activity, disabled, onAnswer }: QuizActivityProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const available = speech.isAvailable();

  // Say the item's Japanese; accept either the kanji/kana surface or its reading.
  const targets = [activity.japanese_text, activity.correct_answer, activity.tts_text].filter(
    (t): t is string => Boolean(t),
  );
  const displayTarget = activity.japanese_text || activity.correct_answer || activity.tts_text || '';

  async function record() {
    if (disabled || listening) return;
    setError(null);
    setListening(true);
    try {
      const heard = await speech.listen({ lang: 'ja-JP' });
      setTranscript(heard);
      const score = scoreSpeech(heard, targets);
      onAnswer({ correct: score.correct, almost: !score.correct && score.similarity >= 0.4 }, heard);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'speech-error';
      setError(msg === 'no-speech' ? "Didn't catch that — try again." : 'Microphone error — try again.');
    } finally {
      setListening(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-col items-center gap-2">
        <span className="jp text-4xl" lang="ja">{displayTarget}</span>
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          Listen to the model <AudioButton text={activity.tts_text || activity.correct_answer} />
        </div>
      </div>

      {available ? (
        <>
          <button
            onClick={record}
            disabled={disabled || listening}
            className={cn(
              'flex h-20 w-20 items-center justify-center rounded-full text-white transition-colors disabled:opacity-50',
              listening ? 'animate-pulse bg-red-500' : 'bg-accent hover:bg-accent/90',
            )}
            aria-label="Record your pronunciation"
          >
            {listening ? <Loader2 className="h-8 w-8 animate-spin" /> : <Mic className="h-8 w-8" />}
          </button>
          <p className="text-sm text-ink-muted">{listening ? 'Listening…' : 'Tap and say it aloud'}</p>
          {transcript && (
            <p className="text-sm">
              Heard: <span className="jp font-semibold" lang="ja">{transcript}</span>
            </p>
          )}
          {error && <p className="text-sm text-amber-600">{error}</p>}
        </>
      ) : (
        // Graceful fallback: no recognizer in this browser.
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <MicOff className="h-5 w-5" /> Speech recognition isn’t available here — say it aloud, then self-grade.
          </div>
          <div className="grid w-full grid-cols-2 gap-3">
            <Button variant="secondary" size="lg" disabled={disabled} onClick={() => onAnswer({ correct: false, almost: false }, 'self:no')}>
              Need practice
            </Button>
            <Button size="lg" disabled={disabled} onClick={() => onAnswer({ correct: true, almost: false }, 'self:yes')}>
              Said it well
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
