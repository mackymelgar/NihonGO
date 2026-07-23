import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

type Mode = 'signin' | 'signup';

export default function AuthPage() {
  const { signInWithPassword, signUp, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      navigate('/', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold">
          日本語 <span className="text-accent">Hero</span>
        </h1>
        <p className="mt-2 text-ink-muted">Learn Japanese from absolute zero.</p>
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(() =>
            mode === 'signin'
              ? signInWithPassword(email, password)
              : signUp(email, password, displayName || undefined),
          );
        }}
      >
        {mode === 'signup' && (
          <Field
            label="Display name"
            value={displayName}
            onChange={setDisplayName}
            placeholder="Hero"
            autoComplete="nickname"
          />
        )}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          required
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" size="lg" loading={busy} className="mt-2">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <button
        type="button"
        className="mt-4 text-sm font-semibold text-accent hover:underline"
        onClick={() => {
          setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
          setError(null);
        }}
      >
        {mode === 'signin'
          ? "New here? Create an account"
          : 'Already have an account? Sign in'}
      </button>

      <div className="my-6 flex items-center gap-3 text-xs text-ink-muted">
        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        or
        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
      </div>

      <Button variant="secondary" size="lg" loading={busy} onClick={() => run(continueAsGuest)}>
        Continue as guest
      </Button>
      <p className="mt-2 text-center text-xs text-ink-muted">
        Guests keep all progress — you can create an account later.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {label}
      <input
        className="h-11 rounded-2xl border border-black/10 bg-white/60 px-4 text-base font-normal outline-none focus:border-accent dark:border-white/15 dark:bg-white/5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </label>
  );
}
