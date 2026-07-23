/** Shown when Supabase env vars are missing, so the app boots with guidance
 * instead of a crash. */
export default function SetupGate() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <h1 className="text-3xl font-extrabold">Almost there 🔧</h1>
      <p className="mt-3 text-ink-muted">
        Nihongo Hero needs your Supabase project keys before it can connect.
      </p>
      <ol className="mt-6 flex flex-col gap-3 text-sm">
        <li>
          1. Copy <code className="rounded bg-black/10 px-1">.env.example</code> to{' '}
          <code className="rounded bg-black/10 px-1">.env</code>.
        </li>
        <li>
          2. Fill in <code className="rounded bg-black/10 px-1">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-black/10 px-1">VITE_SUPABASE_ANON_KEY</code> from your
          Supabase project settings → API.
        </li>
        <li>3. Restart the dev server.</li>
      </ol>
    </div>
  );
}
