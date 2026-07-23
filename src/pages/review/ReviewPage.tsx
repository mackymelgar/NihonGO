import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, Zap, AlertTriangle } from 'lucide-react';
import { useReviewLobby } from '@/hooks/learner/useReview';
import type { ItemType } from '@/lib/database.types';
import { Button } from '@/components/ui/Button';
import { AudioButton } from '@/components/japanese/AudioButton';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<string, string> = {
  kana: 'kana',
  vocabulary: 'vocab',
  grammar: 'grammar',
  kanji: 'kanji',
  phrase: 'phrases',
};

export default function ReviewPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useReviewLobby();
  const [light, setLight] = useState(false);

  if (isLoading) return <LoadingState label="Scouting for battles…" />;
  if (isError || !data) return <ErrorState message="Couldn't load reviews." onRetry={() => refetch()} />;

  function startSession(itemType?: ItemType) {
    const params = new URLSearchParams();
    if (itemType) params.set('type', itemType);
    if (light) params.set('limit', '10');
    navigate(`/review/session?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold">Review Battle</h1>

      {data.totalDue === 0 ? (
        <EmptyState
          icon={Swords}
          title="No reviews due — nice work!"
          message="Go learn something new and it'll come back for review on schedule."
          action={{ label: 'Continue quest', onClick: () => navigate('/') }}
        />
      ) : (
        <>
          {/* Battle-all card */}
          <div className="rounded-2xl bg-accent p-5 text-white shadow-md">
            <p className="text-sm opacity-80">Due now</p>
            <p className="text-4xl font-extrabold">{data.totalDue}</p>
            <p className="mt-1 text-sm opacity-90">
              {Object.entries(data.countsByType)
                .map(([t, n]) => `${n} ${TYPE_LABELS[t] ?? t}`)
                .join(' · ')}
            </p>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={light} onChange={(e) => setLight(e.target.checked)} className="h-4 w-4 accent-white" />
              Light mode (cap at 10)
            </label>
            <Button variant="secondary" size="lg" className="mt-3 w-full text-ink" onClick={() => startSession()}>
              <Swords className="h-5 w-5" /> Battle all
            </Button>
          </div>

          {/* Per-type */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(data.countsByType).map(([type, n]) => (
              <button
                key={type}
                onClick={() => startSession(type as ItemType)}
                className="rounded-2xl border border-black/10 p-3 text-left hover:border-accent dark:border-white/10"
              >
                <p className="text-2xl font-extrabold">{n}</p>
                <p className="text-sm text-ink-muted">{TYPE_LABELS[type] ?? type}</p>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Weak items */}
      {data.weak.length > 0 && (
        <section className="rounded-2xl bg-red-500/10 p-4">
          <h2 className="mb-2 flex items-center gap-2 font-bold text-red-600">
            <AlertTriangle className="h-5 w-5" /> {data.weak.length} item{data.weak.length > 1 ? 's keep' : ' keeps'} escaping you
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.weak.slice(0, 12).map((w) => (
              <span key={w.item_id} className="jp inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-lg dark:bg-white/10" lang="ja">
                {w.item.japanese_text}
                <AudioButton text={w.item.tts_text} size="sm" />
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Forecast */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 font-bold">
          <Zap className="h-5 w-5 text-accent" /> 7-day forecast
        </h2>
        <Forecast data={data.forecast} />
      </section>
    </div>
  );
}

function Forecast({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end justify-between gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10" style={{ height: 140 }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-bold text-ink-muted">{d.count || ''}</span>
          <div
            className={cn('w-full rounded-t-lg', d.count > 0 ? 'bg-accent' : 'bg-black/10 dark:bg-white/10')}
            style={{ height: `${(d.count / max) * 90}px`, minHeight: 2 }}
          />
          <span className="text-xs text-ink-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
