import { useState } from 'react';
import { Map, BookOpen, Swords } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const STORAGE_KEY = 'nihongo-coachmarks-done';

const STEPS = [
  { icon: Map, title: 'This is your Roadmap', body: 'Follow the path from village to fluency. Tap an unlocked area to see its quests.' },
  { icon: BookOpen, title: 'Quests teach you', body: 'Each quest walks you through new characters and words, one screen at a time.' },
  { icon: Swords, title: 'Review keeps it stuck', body: 'The Review tab brings items back right before you’d forget them. Watch for the due-count badge.' },
];

/** One-time 3-step tour shown after onboarding. Persists a localStorage flag so
 * it only ever appears once. */
export function CoachMarks() {
  const [done, setDone] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return true;
    }
  });
  const [step, setStep] = useState(0);

  if (done) return null;

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setDone(true);
  }

  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-parchment p-6 text-center shadow-xl dark:bg-[#1e1a35]">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-extrabold">{s.title}</h2>
        <p className="mt-2 text-sm text-ink-muted">{s.body}</p>

        <div className="mt-4 flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${i === step ? 'bg-accent' : 'bg-black/15 dark:bg-white/20'}`} />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <button onClick={finish} className="text-sm font-semibold text-ink-muted hover:text-ink">
            Skip
          </button>
          <Button onClick={() => (isLast ? finish() : setStep((n) => n + 1))}>
            {isLast ? 'Got it!' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
