/** Browser speech-recognition abstraction (§ v2 speaking). Wraps the Web Speech
 * API (Chrome/Edge). The interface mirrors lib/tts.ts so a server-side
 * recognizer could replace it later. */

// Minimal typings — the Web Speech API isn't in the default TS DOM lib.
interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
  length: number;
}
interface SpeechRecognitionEventLike {
  results: { 0: SpeechRecognitionResultLike; length: number };
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechRecognizer {
  isAvailable(): boolean;
  /** Listen once; resolves with the best transcript or rejects on error. */
  listen(opts?: { lang?: string; timeoutMs?: number }): Promise<string>;
  abort(): void;
}

class WebSpeechRecognizer implements SpeechRecognizer {
  private active: SpeechRecognitionLike | null = null;

  isAvailable(): boolean {
    return getCtor() !== null;
  }

  listen(opts?: { lang?: string; timeoutMs?: number }): Promise<string> {
    const Ctor = getCtor();
    if (!Ctor) return Promise.reject(new Error('speech-unavailable'));

    return new Promise<string>((resolve, reject) => {
      const rec = new Ctor();
      this.active = rec;
      rec.lang = opts?.lang ?? 'ja-JP';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.continuous = false;

      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.active = null;
        fn();
      };

      const timer = setTimeout(() => {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }, opts?.timeoutMs ?? 6000);

      rec.onresult = (e) => {
        const transcript = e.results?.[0]?.[0]?.transcript ?? '';
        finish(() => resolve(transcript));
      };
      rec.onerror = (e) => finish(() => reject(new Error(e.error || 'speech-error')));
      rec.onend = () => finish(() => reject(new Error('no-speech')));

      try {
        rec.start();
      } catch (err) {
        finish(() => reject(err instanceof Error ? err : new Error('speech-start-failed')));
      }
    });
  }

  abort(): void {
    try {
      this.active?.abort();
    } catch {
      /* ignore */
    }
    this.active = null;
  }
}

export const speech: SpeechRecognizer = new WebSpeechRecognizer();
