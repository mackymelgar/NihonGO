/** TTS abstraction (§8). v1 uses the Web Speech API with a ja-JP voice; the
 * interface leaves room for a future recorded-audio source behind the same API. */

export interface AudioSource {
  play(text: string, opts?: { rate?: number }): Promise<void>;
  isAvailable(): boolean;
}

function pickJapaneseVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices();
  const ja = voices.filter((v) => v.lang?.toLowerCase().startsWith('ja'));
  if (ja.length === 0) return null;
  // Prefer Google/Microsoft voices when present.
  return (
    ja.find((v) => /google/i.test(v.name)) ??
    ja.find((v) => /microsoft/i.test(v.name)) ??
    ja[0]
  );
}

let voicesReady = false;
if (typeof speechSynthesis !== 'undefined') {
  // Voices load asynchronously in most browsers.
  const markReady = () => {
    voicesReady = speechSynthesis.getVoices().length > 0;
  };
  markReady();
  speechSynthesis.addEventListener?.('voiceschanged', markReady);
}

class SpeechSynthesisSource implements AudioSource {
  isAvailable(): boolean {
    if (typeof speechSynthesis === 'undefined') return false;
    // If voices haven't loaded yet, assume available and re-check on play.
    return !voicesReady || pickJapaneseVoice() !== null;
  }

  play(text: string, opts?: { rate?: number }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof speechSynthesis === 'undefined' || !text) {
        reject(new Error('Speech synthesis unavailable'));
        return;
      }
      speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'ja-JP';
      utter.rate = opts?.rate ?? 0.9;
      const voice = pickJapaneseVoice();
      if (voice) utter.voice = voice;
      utter.onend = () => resolve();
      utter.onerror = (e) => reject(new Error(e.error ?? 'tts error'));
      speechSynthesis.speak(utter);
    });
  }
}

export const audio: AudioSource = new SpeechSynthesisSource();

/** True if a Japanese voice is (or may become) available in this browser. */
export function isJapaneseAudioAvailable(): boolean {
  return audio.isAvailable();
}
