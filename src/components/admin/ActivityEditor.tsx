import { useEffect, useState } from 'react';
import { Trash2, Plus, Check } from 'lucide-react';
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_FIELDS,
  ACTIVITY_DEFAULT_SKILLS,
  CONTENT_STATUSES,
  SKILL_TYPES,
  STATUS_LABELS,
} from '@/lib/content';
import type { ActivityType, ContentStatus, SkillType } from '@/lib/database.types';
import type { ActivityWithChoices } from '@/hooks/admin/useActivities';
import { useSaveActivity } from '@/hooks/admin/useActivities';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea, CheckboxGroup, StringListEditor } from '@/components/ui/form';
import { AudioButton } from '@/components/japanese/AudioButton';
import { ActivityPreview, type PreviewChoice } from './ActivityPreview';
import { cn } from '@/lib/utils';

type ChoiceDraft = { label: string; is_correct: boolean; match_key: string };

type Draft = {
  activity_type: ActivityType;
  skills: SkillType[];
  prompt_md: string;
  japanese_text: string;
  kana_reading: string;
  romaji: string;
  tts_text: string;
  correct_answer: string;
  accepted_answers: string[];
  sentence_tokens: string[];
  distractor_tokens: string[];
  explanation_md: string;
  status: ContentStatus;
  choices: ChoiceDraft[];
};

function initDraft(existing?: ActivityWithChoices): Draft {
  return {
    activity_type: existing?.activity_type ?? 'multiple_choice',
    skills: existing?.skills ?? ACTIVITY_DEFAULT_SKILLS.multiple_choice,
    prompt_md: existing?.prompt_md ?? '',
    japanese_text: existing?.japanese_text ?? '',
    kana_reading: existing?.kana_reading ?? '',
    romaji: existing?.romaji ?? '',
    tts_text: existing?.tts_text ?? '',
    correct_answer: existing?.correct_answer ?? '',
    accepted_answers: existing?.accepted_answers ?? [],
    sentence_tokens: existing?.sentence_tokens ?? [],
    distractor_tokens: existing?.distractor_tokens ?? [],
    explanation_md: existing?.explanation_md ?? '',
    status: existing?.status ?? 'draft',
    choices:
      existing?.choices.map((c) => ({
        label: c.label,
        is_correct: c.is_correct,
        match_key: c.match_key ?? '',
      })) ?? [],
  };
}

/** Full authoring UI for one activity, with a live learner preview. */
export function ActivityEditor({
  existing,
  questId,
  itemId,
  onSaved,
  onCancel,
}: {
  existing?: ActivityWithChoices;
  questId?: string | null;
  itemId?: string | null;
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const save = useSaveActivity();
  const [d, setD] = useState<Draft>(() => initDraft(existing));
  const fields = ACTIVITY_FIELDS[d.activity_type];

  // When the type changes on a *new* activity, reset default skills.
  useEffect(() => {
    if (!existing) setD((cur) => ({ ...cur, skills: ACTIVITY_DEFAULT_SKILLS[cur.activity_type] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.activity_type]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setD((cur) => ({ ...cur, [key]: value }));
  }

  const previewChoices: PreviewChoice[] = d.choices.map((c) => ({
    label: c.label,
    is_correct: c.is_correct,
    match_key: c.match_key,
  }));

  async function handleSave() {
    const saved = await save.mutateAsync({
      activity: {
        ...(existing ? { id: existing.id } : {}),
        quest_id: questId ?? null,
        item_id: itemId ?? existing?.item_id ?? null,
        activity_type: d.activity_type,
        skills: d.skills,
        prompt_md: d.prompt_md,
        japanese_text: d.japanese_text || null,
        kana_reading: d.kana_reading || null,
        romaji: d.romaji || null,
        tts_text: d.tts_text || null,
        correct_answer: d.correct_answer || null,
        accepted_answers: d.accepted_answers,
        sentence_tokens: fields.tokens ? d.sentence_tokens : null,
        distractor_tokens: d.distractor_tokens,
        explanation_md: d.explanation_md || null,
        status: d.status,
      },
      choices: fields.choices
        ? d.choices.map((c, i) => ({
            label: c.label,
            is_correct: c.is_correct,
            match_key: fields.matchKeys ? c.match_key || null : null,
            sort_order: i,
          }))
        : undefined,
    });
    onSaved(saved.id);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Left: form */}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Activity type" required>
            <Select
              value={d.activity_type}
              onChange={(e) => set('activity_type', e.target.value as ActivityType)}
              options={ACTIVITY_TYPES.map((t) => ({ value: t, label: ACTIVITY_TYPE_LABELS[t] }))}
            />
          </Field>
          <Field label="Status">
            <Select
              value={d.status}
              onChange={(e) => set('status', e.target.value as ContentStatus)}
              options={CONTENT_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
            />
          </Field>
        </div>

        <Field label="Prompt" required hint="Shown above the question.">
          <Textarea value={d.prompt_md} onChange={(e) => set('prompt_md', e.target.value)} />
        </Field>

        <Field label="Skills trained" required>
          <CheckboxGroup options={SKILL_TYPES} value={d.skills} onChange={(v) => set('skills', v)} />
        </Field>

        {fields.audio && (
          <Field label="TTS text (kana)" hint="Played to the learner; text is hidden.">
            <div className="flex items-center gap-2">
              <Input className="jp" value={d.tts_text} onChange={(e) => set('tts_text', e.target.value)} />
              <AudioButton text={d.tts_text} />
            </div>
          </Field>
        )}

        {(d.activity_type === 'sentence_builder' ||
          d.activity_type === 'flashcard' ||
          d.activity_type === 'speaking') && (
          <Field label="Japanese text (shown)">
            <Input className="jp" value={d.japanese_text} onChange={(e) => set('japanese_text', e.target.value)} />
          </Field>
        )}

        {fields.typedAnswer && (
          <>
            <Field label="Correct answer" required hint="Accepts kana or romaji at grading time.">
              <Input value={d.correct_answer} onChange={(e) => set('correct_answer', e.target.value)} />
            </Field>
            <Field label="Also accept (alternates)">
              <StringListEditor value={d.accepted_answers} onChange={(v) => set('accepted_answers', v)} />
            </Field>
          </>
        )}

        {fields.tokens && (
          <>
            <Field label="Correct token order" required hint="Enter tokens in the correct sequence.">
              <StringListEditor value={d.sentence_tokens} onChange={(v) => set('sentence_tokens', v)} placeholder="Add token…" />
            </Field>
            <Field label="Distractor tokens">
              <StringListEditor value={d.distractor_tokens} onChange={(v) => set('distractor_tokens', v)} placeholder="Add distractor…" />
            </Field>
          </>
        )}

        {fields.choices && (
          <ChoicesEditor draft={d} onChange={(choices) => set('choices', choices)} showMatchKeys={fields.matchKeys} />
        )}

        <Field label="Explanation (shown in feedback)">
          <Textarea value={d.explanation_md} onChange={(e) => set('explanation_md', e.target.value)} />
        </Field>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button loading={save.isPending} disabled={!d.prompt_md} onClick={handleSave}>
            Save activity
          </Button>
        </div>
      </div>

      {/* Right: live preview */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-ink-muted">Live preview</p>
        <ActivityPreview
          data={{
            activity_type: d.activity_type,
            prompt_md: d.prompt_md,
            japanese_text: d.japanese_text,
            tts_text: d.tts_text,
            correct_answer: d.correct_answer,
            accepted_answers: d.accepted_answers,
            sentence_tokens: d.sentence_tokens,
            distractor_tokens: d.distractor_tokens,
            choices: previewChoices,
          }}
        />
      </div>
    </div>
  );
}

function ChoicesEditor({
  draft,
  onChange,
  showMatchKeys,
}: {
  draft: Draft;
  onChange: (choices: ChoiceDraft[]) => void;
  showMatchKeys: boolean;
}) {
  const { choices } = draft;
  function update(i: number, patch: Partial<ChoiceDraft>) {
    onChange(choices.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  }
  return (
    <Field label={showMatchKeys ? 'Pairs (share a match key)' : 'Choices'} required>
      <div className="flex flex-col gap-2">
        {choices.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            {!showMatchKeys && (
              <button
                type="button"
                title="Mark correct"
                onClick={() => update(i, { is_correct: !c.is_correct })}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                  c.is_correct ? 'border-green-500 bg-green-500 text-white' : 'border-black/20 dark:border-white/20',
                )}
              >
                <Check className="h-4 w-4" />
              </button>
            )}
            <Input className="jp" value={c.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Choice label" />
            {showMatchKeys && (
              <Input
                value={c.match_key}
                onChange={(e) => update(i, { match_key: e.target.value })}
                placeholder="pair key"
                className="max-w-[110px]"
              />
            )}
            <button
              type="button"
              onClick={() => onChange(choices.filter((_, j) => j !== i))}
              className="rounded p-2 text-ink-muted hover:text-red-500"
              aria-label="Remove choice"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange([...choices, { label: '', is_correct: false, match_key: '' }])}
        >
          <Plus className="h-4 w-4" /> Add {showMatchKeys ? 'pair' : 'choice'}
        </Button>
      </div>
    </Field>
  );
}
