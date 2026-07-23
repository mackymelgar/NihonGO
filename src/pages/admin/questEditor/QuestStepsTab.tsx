import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { ActivityRow, LessonStepRow, QuestRow, StepType } from '@/lib/database.types';
import {
  useSaveLessonStep,
  useDeleteLessonStep,
  useReorderLessonSteps,
} from '@/hooks/admin/useQuestEditor';
import { SortableList, SortableRow } from '@/components/admin/Sortable';
import { STEP_TYPES } from '@/lib/content';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { Markdown } from '@/components/Markdown';
import { AudioButton } from '@/components/japanese/AudioButton';
import { EmptyState } from '@/components/ui/states';
import { ListOrdered } from 'lucide-react';

export function QuestStepsTab({
  quest,
  steps,
  activities,
}: {
  quest: QuestRow;
  steps: LessonStepRow[];
  activities: ActivityRow[];
}) {
  const [editing, setEditing] = useState<LessonStepRow | 'new' | null>(null);
  const del = useDeleteLessonStep();
  const reorder = useReorderLessonSteps();

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> Add step
        </Button>
      </div>

      {steps.length === 0 ? (
        <EmptyState
          icon={ListOrdered}
          title="No lesson steps"
          message="Add explanation, example, and practice steps — one idea per screen."
          action={{ label: 'Add step', onClick: () => setEditing('new') }}
        />
      ) : (
        <SortableList
          ids={steps.map((s) => s.id)}
          onReorder={(ids) => reorder.mutate({ questId: quest.id, ids })}
        >
          <ol className="flex flex-col gap-2">
            {steps.map((step, i) => (
              <SortableRow key={step.id} id={step.id}>
                <li className="flex items-center gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-parchment-200 text-xs font-bold dark:bg-white/10">
                    {i + 1}
                  </span>
                  <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">{step.step_type}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{step.title || step.body_md || step.japanese_text || '(untitled)'}</p>
                    {step.japanese_text && <p className="jp truncate text-sm text-ink-muted">{step.japanese_text}</p>}
                  </div>
                  {step.tts_text && <AudioButton text={step.tts_text} size="sm" />}
                  <button className="rounded p-1.5 hover:bg-black/10 dark:hover:bg-white/10" title="Edit" onClick={() => setEditing(step)}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded p-1.5 text-ink-muted hover:text-red-500"
                    title="Delete"
                    onClick={() => confirm('Delete this step?') && del.mutate({ id: step.id, questId: quest.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              </SortableRow>
            ))}
          </ol>
        </SortableList>
      )}

      {editing && (
        <StepModal
          questId={quest.id}
          step={editing === 'new' ? undefined : editing}
          nextSort={steps.length}
          activities={activities}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function StepModal({
  questId,
  step,
  nextSort,
  activities,
  onClose,
}: {
  questId: string;
  step?: LessonStepRow;
  nextSort: number;
  activities: ActivityRow[];
  onClose: () => void;
}) {
  const save = useSaveLessonStep();
  const [f, setF] = useState({
    step_type: (step?.step_type ?? 'explanation') as StepType,
    title: step?.title ?? '',
    body_md: step?.body_md ?? '',
    japanese_text: step?.japanese_text ?? '',
    kana_reading: step?.kana_reading ?? '',
    romaji: step?.romaji ?? '',
    english_meaning: step?.english_meaning ?? '',
    tts_text: step?.tts_text ?? '',
    activity_id: step?.activity_id ?? '',
  });
  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((cur) => ({ ...cur, [k]: v }));
  }

  return (
    <Modal open onClose={onClose} title={step ? 'Edit step' : 'New step'} size="lg">
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          await save.mutateAsync({
            ...(step ? { id: step.id } : {}),
            quest_id: questId,
            step_type: f.step_type,
            title: f.title || null,
            body_md: f.body_md || null,
            japanese_text: f.japanese_text || null,
            kana_reading: f.kana_reading || null,
            romaji: f.romaji || null,
            english_meaning: f.english_meaning || null,
            tts_text: f.tts_text || null,
            activity_id: f.step_type === 'practice' ? f.activity_id || null : null,
            sort_order: step?.sort_order ?? nextSort,
          });
          onClose();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Step type" required>
            <Select value={f.step_type} onChange={(e) => set('step_type', e.target.value as StepType)} options={STEP_TYPES.map((t) => ({ value: t, label: t }))} />
          </Field>
          <Field label="Title">
            <Input value={f.title} onChange={(e) => set('title', e.target.value)} />
          </Field>
        </div>

        {f.step_type === 'explanation' && (
          <>
            <Field label="Body (markdown)" hint="Keep it short — one idea, ≤ 80 words.">
              <Textarea value={f.body_md} onChange={(e) => set('body_md', e.target.value)} />
            </Field>
            {f.body_md && (
              <div>
                <p className="mb-1 text-xs font-bold uppercase text-ink-muted">Live preview</p>
                <div className="rounded-2xl border border-dashed border-accent/40 bg-accent/5 p-3">
                  <Markdown>{f.body_md}</Markdown>
                </div>
              </div>
            )}
          </>
        )}

        {f.step_type === 'example' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Japanese text"><Input className="jp" value={f.japanese_text} onChange={(e) => set('japanese_text', e.target.value)} /></Field>
              <Field label="Kana reading"><Input className="jp" value={f.kana_reading} onChange={(e) => set('kana_reading', e.target.value)} /></Field>
              <Field label="Romaji"><Input value={f.romaji} onChange={(e) => set('romaji', e.target.value)} /></Field>
              <Field label="English"><Input value={f.english_meaning} onChange={(e) => set('english_meaning', e.target.value)} /></Field>
            </div>
            <Field label="TTS text (kana)" required hint="Never raw kanji.">
              <div className="flex items-center gap-2">
                <Input className="jp" value={f.tts_text} onChange={(e) => set('tts_text', e.target.value)} />
                <AudioButton text={f.tts_text} />
                {!f.tts_text && f.kana_reading && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => set('tts_text', f.kana_reading)}>= kana</Button>
                )}
              </div>
            </Field>
          </>
        )}

        {f.step_type === 'practice' && (
          <Field label="Practice activity" required hint="Create activities in the Activities tab first.">
            <Select
              value={f.activity_id}
              onChange={(e) => set('activity_id', e.target.value)}
              options={[
                { value: '', label: '— select activity —' },
                ...activities.map((a) => ({ value: a.id, label: `${a.activity_type}: ${a.prompt_md.slice(0, 40)}` })),
              ]}
            />
          </Field>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Save step</Button>
        </div>
      </form>
    </Modal>
  );
}
