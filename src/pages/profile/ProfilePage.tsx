import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/states';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useStats } from '@/hooks/useStats';
import { useSettings } from '@/stores/settingsStore';
import { ProfileAnalytics } from '@/components/profile/ProfileAnalytics';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { isGuest, signOut, upgradeGuest } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { data: stats } = useStats();
  const updateProfile = useUpdateProfile();
  const { theme, toggleTheme, romajiEnabled, setRomaji, furiganaEnabled, setFurigana } =
    useSettings();

  if (isLoading || !profile) return <LoadingState />;

  function updatePref(patch: Parameters<typeof updateProfile.mutate>[0]) {
    updateProfile.mutate(patch);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Identity */}
      <header className="flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-4xl">
          {profile.avatar_emoji}
        </span>
        <div>
          <h1 className="text-2xl font-extrabold">{profile.display_name}</h1>
          <p className="text-sm text-ink-muted">
            Level {stats?.level ?? 1} · {stats?.total_xp ?? 0} XP
            {isGuest && ' · Guest'}
          </p>
        </div>
      </header>

      {isGuest && <GuestUpgrade onUpgrade={upgradeGuest} />}

      <ProfileAnalytics />

      {/* Settings */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Settings</h2>
        <Toggle
          label="Show romaji"
          checked={romajiEnabled}
          onChange={(v) => {
            setRomaji(v);
            updatePref({ romaji_enabled: v });
          }}
        />
        <Toggle
          label="Show furigana"
          checked={furiganaEnabled}
          onChange={(v) => {
            setFurigana(v);
            updatePref({ furigana_enabled: v });
          }}
        />
        <Toggle label="Dark mode" checked={theme === 'dark'} onChange={toggleTheme} />
      </section>

      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          onClick={async () => {
            await signOut();
            navigate('/auth', { replace: true });
          }}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-3 dark:bg-white/5">
      <span className="font-semibold">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-6 w-6 accent-[#7c5cff]"
      />
    </label>
  );
}

function GuestUpgrade({
  onUpgrade,
}: {
  onUpgrade: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="rounded-2xl bg-amber-100 p-4 dark:bg-amber-500/20">
      <h2 className="text-lg font-bold text-amber-900 dark:text-amber-200">
        Save your progress
      </h2>
      <p className="mb-3 text-sm text-amber-900/80 dark:text-amber-200/80">
        Add an email and password to turn your guest account into a permanent one. You keep
        everything.
      </p>
      <form
        className="flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          setMsg(null);
          try {
            await onUpgrade(email, password);
            setMsg('Account saved! Check your email to confirm.');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not upgrade account.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-11 rounded-2xl border border-black/10 bg-white px-4 outline-none focus:border-accent dark:border-white/15 dark:bg-white/10"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="h-11 rounded-2xl border border-black/10 bg-white px-4 outline-none focus:border-accent dark:border-white/15 dark:bg-white/10"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {msg && <p className="text-sm text-green-700 dark:text-green-400">{msg}</p>}
        <Button type="submit" loading={busy}>
          Create account
        </Button>
      </form>
    </section>
  );
}
