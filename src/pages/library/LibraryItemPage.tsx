import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useItemDetail } from '@/hooks/learner/useLibrary';
import { useProfile } from '@/hooks/useProfile';
import { formatDateTime } from '@/lib/dates';
import { isForgotten } from '@/lib/srs';
import type { SkillType } from '@/lib/database.types';
import { JapaneseText } from '@/components/japanese/JapaneseText';
import { AudioButton } from '@/components/japanese/AudioButton';
import { MasteryGem } from '@/components/MasteryGem';
import { LoadingState, ErrorState } from '@/components/ui/states';

export default function LibraryItemPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useItemDetail(id);
  const { data: profile } = useProfile();
  const tz = profile?.timezone ?? 'UTC';

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState message="Couldn't load this item." onRetry={() => refetch()} />;

  const { item, mastery, history } = data;
  const displayState = isForgotten(mastery.srs_stage, mastery.next_review_at)
    ? 'forgotten'
    : mastery.state;

  const skills: { skill: SkillType; score: number }[] = [
    { skill: 'reading', score: mastery.reading_score },
    { skill: 'writing', score: mastery.writing_score },
    { skill: 'listening', score: mastery.listening_score },
    { skill: 'speaking', score: mastery.speaking_score },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link to="/library" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Library
      </Link>

      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <JapaneseText japanese={item.japanese_text} kana={item.kana_reading} romaji={item.romaji} size="xl" />
        <AudioButton text={item.tts_text} size="lg" />
        <p className="text-xl">{item.english_meaning}</p>
        <MasteryGem state={displayState} />
      </div>

      {/* Skill bars */}
      <section>
        <h2 className="mb-2 font-bold">Skill mastery</h2>
        <div className="flex flex-col gap-2">
          {skills.map(({ skill, score }) => (
            <div key={skill} className="flex items-center gap-3">
              <span className="w-20 text-sm capitalize">{skill}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${score}%` }} />
              </div>
              <span className="w-10 text-right text-sm font-semibold">{Math.round(score)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* SRS status */}
      <section className="grid grid-cols-2 gap-3">
        <Info label="SRS stage" value={`${mastery.srs_stage} / 6`} />
        <Info
          label="Next review"
          value={mastery.next_review_at ? formatDateTime(mastery.next_review_at, tz, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
        />
        <Info label="Correct" value={`${mastery.total_correct}`} />
        <Info label="Wrong" value={`${mastery.total_wrong}`} />
      </section>

      {/* History sparkline */}
      {history.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">Recent answers</h2>
          <div className="flex flex-wrap gap-1">
            {history.map((h, i) => (
              <span
                key={i}
                title={h.is_correct ? 'Correct' : 'Wrong'}
                className={'h-4 w-4 rounded-sm ' + (h.is_correct ? 'bg-green-500' : 'bg-red-500')}
              />
            ))}
          </div>
        </section>
      )}

      {/* Example */}
      {item.example_japanese && (
        <section className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <h2 className="mb-2 font-bold">Example</h2>
          <div className="flex items-center gap-2">
            <JapaneseText japanese={item.example_japanese} kana={item.example_kana} romaji={item.example_romaji} size="md" />
            <AudioButton text={item.example_kana ?? item.example_japanese} size="sm" />
          </div>
          {item.example_english && <p className="mt-1 text-sm text-ink-muted">{item.example_english}</p>}
        </section>
      )}

      {/* Kanji extras */}
      {item.item_type === 'kanji' && (
        <section className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <h2 className="mb-2 font-bold">Kanji details</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {item.onyomi && <span>On: <span className="jp">{item.onyomi}</span></span>}
            {item.kunyomi && <span>Kun: <span className="jp">{item.kunyomi}</span></span>}
            {item.stroke_count != null && <span>Strokes: {item.stroke_count}</span>}
            {item.radical && <span>Radical: <span className="jp">{item.radical}</span></span>}
          </div>
          {item.mnemonic_md && <p className="mt-2 whitespace-pre-wrap text-sm">{item.mnemonic_md}</p>}
        </section>
      )}

      <button onClick={() => navigate('/review')} className="text-sm font-semibold text-accent hover:underline">
        Review due items →
      </button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/60 p-3 dark:bg-white/5">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}
