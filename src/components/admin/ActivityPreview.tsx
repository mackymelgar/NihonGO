import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/Markdown';
import { AudioButton } from '@/components/japanese/AudioButton';
import type { ActivityType } from '@/lib/database.types';

export type PreviewChoice = { label: string; is_correct: boolean; match_key?: string | null };

export type PreviewData = {
  activity_type: ActivityType;
  prompt_md: string;
  japanese_text?: string | null;
  tts_text?: string | null;
  correct_answer?: string | null;
  accepted_answers?: string[];
  sentence_tokens?: string[] | null;
  distractor_tokens?: string[];
  choices?: PreviewChoice[];
};

/** Interactive (non-graded) preview of an activity as the learner will see it.
 * These renderers are the seeds of the Phase 3 quiz components. */
export function ActivityPreview({ data }: { data: PreviewData }) {
  return (
    <div className="rounded-2xl border border-dashed border-accent/40 bg-accent/5 p-4">
      {data.prompt_md ? (
        <Markdown size="sm" className="mb-3 font-semibold">{data.prompt_md}</Markdown>
      ) : (
        <p className="mb-3 text-sm font-semibold">—</p>
      )}
      <Renderer data={data} />
    </div>
  );
}

function Renderer({ data }: { data: PreviewData }) {
  switch (data.activity_type) {
    case 'multiple_choice':
    case 'listen_and_choose':
      return <ChoiceGrid data={data} audioOnly={data.activity_type === 'listen_and_choose'} />;
    case 'fill_in_blank':
      return data.choices && data.choices.length > 0 ? <ChoiceGrid data={data} /> : <TypingPreview data={data} />;
    case 'match_pair':
      return <MatchPreview data={data} />;
    case 'sentence_builder':
      return <SentenceBuilderPreview data={data} />;
    case 'typing':
      return <TypingPreview data={data} />;
    case 'flashcard':
      return <FlashcardPreview data={data} />;
    case 'speaking':
      return <SpeakingPreview data={data} />;
    default:
      return null;
  }
}

function ChoiceGrid({ data, audioOnly }: { data: PreviewData; audioOnly?: boolean }) {
  const [picked, setPicked] = useState<number | null>(null);
  const choices = data.choices ?? [];
  return (
    <div className="flex flex-col gap-3">
      {audioOnly && (
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <AudioButton text={data.tts_text} /> Listen, then choose
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {choices.length === 0 && <p className="text-xs text-ink-muted">No choices yet.</p>}
        {choices.map((c, i) => (
          <button
            key={i}
            onClick={() => setPicked(i)}
            className={cn(
              'jp rounded-2xl border-2 p-3 text-lg font-semibold transition-colors',
              picked === null
                ? 'border-black/10 dark:border-white/15'
                : c.is_correct
                  ? 'border-green-500 bg-green-500/10'
                  : picked === i
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-black/10 opacity-60 dark:border-white/15',
            )}
          >
            {c.label || '—'}
          </button>
        ))}
      </div>
    </div>
  );
}

function TypingPreview({ data }: { data: PreviewData }) {
  return (
    <div className="flex flex-col gap-2">
      <input
        placeholder="Type your answer…"
        className="h-11 rounded-2xl border border-black/10 bg-white/70 px-4 dark:border-white/15 dark:bg-white/5"
      />
      <p className="text-xs text-ink-muted">
        Accepts: {[data.correct_answer, ...(data.accepted_answers ?? [])].filter(Boolean).join(', ') || '—'}
      </p>
    </div>
  );
}

function MatchPreview({ data }: { data: PreviewData }) {
  const choices = data.choices ?? [];
  const left = choices.filter((_, i) => i % 2 === 0);
  const right = [...choices].filter((_, i) => i % 2 === 1).reverse();
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-2">
        {left.map((c, i) => (
          <div key={i} className="jp rounded-xl border border-black/10 p-2 text-center dark:border-white/15">
            {c.label || '—'}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {right.map((c, i) => (
          <div key={i} className="jp rounded-xl border border-black/10 p-2 text-center dark:border-white/15">
            {c.label || '—'}
          </div>
        ))}
      </div>
    </div>
  );
}

function SentenceBuilderPreview({ data }: { data: PreviewData }) {
  const tokens = [...(data.sentence_tokens ?? []), ...(data.distractor_tokens ?? [])];
  return (
    <div className="flex flex-col gap-3">
      <div className="min-h-[48px] rounded-2xl border-2 border-dashed border-black/15 p-2 dark:border-white/15" />
      <div className="flex flex-wrap gap-2">
        {tokens.length === 0 && <p className="text-xs text-ink-muted">No tokens yet.</p>}
        {tokens.map((t, i) => (
          <span key={i} className="jp rounded-xl bg-parchment-200 px-3 py-1.5 text-lg dark:bg-white/10">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function SpeakingPreview({ data }: { data: PreviewData }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="jp text-3xl" lang="ja">{data.japanese_text || data.correct_answer || data.tts_text || '—'}</span>
      <AudioButton text={data.tts_text || data.correct_answer} />
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white">🎤</div>
      <p className="text-xs text-ink-muted">Learner records; scored against the target reading.</p>
    </div>
  );
}

function FlashcardPreview({ data }: { data: PreviewData }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      onClick={() => setFlipped((f) => !f)}
      className="flex min-h-[100px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-black/10 p-4 dark:border-white/15"
    >
      <span className="jp text-3xl">{data.japanese_text || data.tts_text || '—'}</span>
      <AudioButton text={data.tts_text} />
      {flipped && <span className="text-sm text-ink-muted">{data.correct_answer || 'Reveal…'}</span>}
      {!flipped && <span className="text-xs text-ink-muted">(tap to reveal)</span>}
    </button>
  );
}
