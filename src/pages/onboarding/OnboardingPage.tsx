import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useSettings } from '@/stores/settingsStore';
import { detectTimezone } from '@/lib/dates';
import type { LearningGoal } from '@/lib/database.types';
import { LoadingState } from '@/components/ui/states';

const GOALS: { value: LearningGoal; label: string; emoji: string }[] = [
  { value: 'from_zero', label: 'Start from zero', emoji: '🌱' },
  { value: 'travel', label: 'Travel to Japan', emoji: '✈️' },
  { value: 'anime_manga', label: 'Anime & manga', emoji: '🎌' },
  { value: 'jlpt', label: 'Pass the JLPT', emoji: '📜' },
  { value: 'work', label: 'Work in Japanese', emoji: '💼' },
  { value: 'developer', label: 'Tech & dev', emoji: '💻' },
  { value: 'daily_speech', label: 'Everyday speech', emoji: '💬' },
];

const AVATARS = ['🦊', '🐼', '🐯', '🐸', '🐙', '🦉', '🐢', '🐝', '🦄', '🐧'];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const setRomaji = useSettings((s) => s.setRomaji);

  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<LearningGoal>('from_zero');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  const [romaji, setRomajiLocal] = useState(true);
  const [knowsJapanese, setKnowsJapanese] = useState(false);

  if (isLoading) return <LoadingState label="Getting things ready…" />;

  async function finish() {
    setRomaji(romaji);
    await updateProfile.mutateAsync({
      display_name: name.trim() || profile?.display_name || 'Hero',
      avatar_emoji: avatar,
      goal,
      romaji_enabled: romaji,
      timezone: detectTimezone(),
      onboarding_completed: true,
      knows_japanese: knowsJapanese,
    });
    navigate('/roadmap', { replace: true });
  }

  const steps = [
    // 0 — Welcome
    <Screen key="welcome" title="Welcome, hero!" subtitle="Learn Japanese from absolute zero — one quest at a time.">
      <div className="py-8 text-center text-6xl">⛩️</div>
      <Button size="lg" className="w-full" onClick={() => setStep(1)}>
        Begin your journey
      </Button>
    </Screen>,

    // 1 — Experience
    <Screen key="experience" title="What's your experience level?" subtitle="We'll tailor your starting point based on this.">
      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={() => {
            setKnowsJapanese(false);
            setStep(2);
          }}
          className={cn(
            'flex flex-col items-center gap-1 rounded-2xl border-2 p-4 text-lg font-semibold transition-colors',
            !knowsJapanese ? 'border-accent bg-accent/10' : 'border-black/10 hover:border-accent/50 dark:border-white/15'
          )}
        >
          Absolute Beginner
          <span className="text-sm font-normal text-ink-muted">I want to start from zero.</span>
        </button>
        <button
          onClick={() => {
            setKnowsJapanese(true);
            setStep(2);
          }}
          className={cn(
            'flex flex-col items-center gap-1 rounded-2xl border-2 p-4 text-lg font-semibold transition-colors',
            knowsJapanese ? 'border-accent bg-accent/10' : 'border-black/10 hover:border-accent/50 dark:border-white/15'
          )}
        >
          I know some Japanese
          <span className="text-sm font-normal text-ink-muted">Unlock everything and let me explore.</span>
        </button>
      </div>
    </Screen>,

    // 2 — Goal
    <Screen key="goal" title="What brings you here?" subtitle="We'll tailor your encouragement to your goal.">
      <div className="grid grid-cols-2 gap-3">
        {GOALS.map((g) => (
          <button
            key={g.value}
            onClick={() => setGoal(g.value)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-2xl border-2 p-4 text-sm font-semibold transition-colors',
              goal === g.value
                ? 'border-accent bg-accent/10'
                : 'border-black/10 hover:border-accent/50 dark:border-white/15',
            )}
          >
            <span className="text-2xl">{g.emoji}</span>
            {g.label}
          </button>
        ))}
      </div>
      <Button size="lg" className="mt-6 w-full" onClick={() => setStep(3)}>
        Continue
      </Button>
    </Screen>,

    // 3 — Identity
    <Screen key="identity" title="Choose your hero" subtitle="Pick a name and an avatar.">
      <label className="mb-4 flex flex-col gap-1 text-sm font-semibold">
        Display name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Hero"
          className="h-11 rounded-2xl border border-black/10 bg-white/60 px-4 text-base font-normal outline-none focus:border-accent dark:border-white/15 dark:bg-white/5"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {AVATARS.map((a) => (
          <button
            key={a}
            onClick={() => setAvatar(a)}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-2xl border-2 text-2xl transition-colors',
              avatar === a ? 'border-accent bg-accent/10' : 'border-transparent hover:bg-black/5',
            )}
          >
            {a}
          </button>
        ))}
      </div>
      <Button size="lg" className="mt-6 w-full" onClick={() => setStep(4)}>
        Continue
      </Button>
    </Screen>,

    // 4 — Romaji
    <Screen key="romaji" title="Show romaji?" subtitle="Romaji spells Japanese sounds with English letters. You can change this anytime.">
      <label className="flex items-center justify-between rounded-2xl border-2 border-black/10 p-4 dark:border-white/15">
        <span className="font-semibold">Show romaji under Japanese text</span>
        <input
          type="checkbox"
          checked={romaji}
          onChange={(e) => setRomajiLocal(e.target.checked)}
          className="h-6 w-6 accent-[#7c5cff]"
        />
      </label>
      <p className="mt-3 text-center jp text-3xl">
        こんにちは {romaji && <span className="block text-base text-ink-muted">konnichiwa</span>}
      </p>
      <Button size="lg" className="mt-6 w-full" loading={updateProfile.isPending} onClick={finish}>
        Start learning →
      </Button>
    </Screen>,
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      {steps[step]}
    </div>
  );
}

function Screen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <p className="mb-6 mt-2 text-ink-muted">{subtitle}</p>
      {children}
    </div>
  );
}
