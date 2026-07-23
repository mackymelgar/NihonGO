import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Library } from 'lucide-react';
import { useLibrary } from '@/hooks/learner/useLibrary';
import { weakestSkill } from '@/lib/mastery';
import { ITEM_TYPES, SKILL_TYPES } from '@/lib/content';
import type { ItemType, MasteryState, SkillType } from '@/lib/database.types';
import { Select } from '@/components/ui/form';
import { MasteryGem } from '@/components/MasteryGem';
import { AudioButton } from '@/components/japanese/AudioButton';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';

const STATES: MasteryState[] = ['new', 'learning', 'weak', 'familiar', 'strong', 'mastered', 'forgotten'];

export default function LibraryPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useLibrary();
  const [type, setType] = useState<ItemType | 'all'>('all');
  const [state, setState] = useState<MasteryState | 'all'>('all');
  const [skill, setSkill] = useState<SkillType | 'all'>('all');

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((e) => {
      if (type !== 'all' && e.item.item_type !== type) return false;
      if (state !== 'all' && e.displayState !== state) return false;
      if (skill !== 'all' && weakestSkill(e) !== skill) return false;
      return true;
    });
  }, [data, type, state, skill]);

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState message="Couldn't load your library." onRetry={() => refetch()} />;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold">Library</h1>

      {data.length === 0 ? (
        <EmptyState
          icon={Library}
          title="Nothing learned yet"
          message="Complete a quest and the words you learn will appear here with their four skill scores."
          action={{ label: 'Continue quest', onClick: () => navigate('/') }}
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2">
            <Select value={type} onChange={(e) => setType(e.target.value as ItemType | 'all')} options={[{ value: 'all', label: 'All types' }, ...ITEM_TYPES.map((t) => ({ value: t, label: t }))]} />
            <Select value={state} onChange={(e) => setState(e.target.value as MasteryState | 'all')} options={[{ value: 'all', label: 'All states' }, ...STATES.map((s) => ({ value: s, label: s }))]} />
            <Select value={skill} onChange={(e) => setSkill(e.target.value as SkillType | 'all')} options={[{ value: 'all', label: 'Any weak skill' }, ...SKILL_TYPES.map((s) => ({ value: s, label: `weak: ${s}` }))]} />
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Library} title="No items match your filters" />
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filtered.map((e) => (
                <button
                  key={e.item_id}
                  onClick={() => navigate(`/library/item/${e.item_id}`)}
                  className="flex flex-col gap-1 rounded-2xl border border-black/10 p-3 text-left hover:border-accent dark:border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="jp text-2xl" lang="ja">{e.item.japanese_text}</span>
                    <AudioButton text={e.item.tts_text} size="sm" />
                  </div>
                  <span className="truncate text-sm text-ink-muted">{e.item.english_meaning}</span>
                  <MasteryGem state={e.displayState} />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
