import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { learningItemSchema, type LearningItemForm } from '@/lib/contentSchemas';
import { CONTENT_STATUSES, ITEM_TYPES, STATUS_LABELS } from '@/lib/content';
import type { LearningItemRow } from '@/lib/database.types';
import { Button } from '@/components/ui/Button';
import { AudioButton } from '@/components/japanese/AudioButton';
import { Field, Input, Select, Textarea, StringListEditor } from '@/components/ui/form';

/** Create/edit form for a learning item. Kanji fieldset appears when type=kanji. */
export function ItemForm({
  row,
  onSubmit,
  onCancel,
  saving,
}: {
  row?: LearningItemRow;
  onSubmit: (values: LearningItemForm & { id?: string }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const { register, handleSubmit, watch, setValue, formState } = useForm<LearningItemForm>({
    resolver: zodResolver(learningItemSchema),
    defaultValues: {
      item_type: row?.item_type ?? 'vocabulary',
      japanese_text: row?.japanese_text ?? '',
      kana_reading: row?.kana_reading ?? '',
      romaji: row?.romaji ?? '',
      english_meaning: row?.english_meaning ?? '',
      explanation_md: row?.explanation_md ?? '',
      example_japanese: row?.example_japanese ?? '',
      example_kana: row?.example_kana ?? '',
      example_romaji: row?.example_romaji ?? '',
      example_english: row?.example_english ?? '',
      tts_text: row?.tts_text ?? '',
      jlpt_level: row?.jlpt_level ?? undefined,
      difficulty: row?.difficulty ?? 1,
      onyomi: row?.onyomi ?? '',
      kunyomi: row?.kunyomi ?? '',
      stroke_count: row?.stroke_count ?? undefined,
      radical: row?.radical ?? '',
      mnemonic_md: row?.mnemonic_md ?? '',
      tags: row?.tags ?? [],
      status: row?.status ?? 'draft',
    },
  });

  const itemType = watch('item_type');
  const tags = watch('tags');
  const ttsText = watch('tts_text');
  const err = formState.errors;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={handleSubmit((v) => onSubmit({ ...(row ? { id: row.id } : {}), ...v }))}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type" required>
          <Select {...register('item_type')} options={ITEM_TYPES.map((t) => ({ value: t, label: t }))} />
        </Field>
        <Field label="Status">
          <Select {...register('status')} options={CONTENT_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Japanese text" required error={err.japanese_text?.message}>
          <Input className="jp" {...register('japanese_text')} />
        </Field>
        <Field label="Kana reading" required error={err.kana_reading?.message}>
          <Input className="jp" {...register('kana_reading')} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Romaji" required error={err.romaji?.message}>
          <Input {...register('romaji')} />
        </Field>
        <Field label="English meaning" required error={err.english_meaning?.message}>
          <Input {...register('english_meaning')} />
        </Field>
      </div>

      <Field label="TTS text (kana only)" required error={err.tts_text?.message} hint="What gets spoken — never raw kanji.">
        <div className="flex items-center gap-2">
          <Input className="jp" {...register('tts_text')} />
          <AudioButton text={ttsText} />
          {!ttsText && watch('kana_reading') && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setValue('tts_text', watch('kana_reading'))}>
              = kana
            </Button>
          )}
        </div>
      </Field>

      <Field label="Explanation (markdown)">
        <Textarea {...register('explanation_md')} />
      </Field>

      <fieldset className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
        <legend className="px-1 text-xs font-bold uppercase text-ink-muted">Example sentence</legend>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Japanese"><Input className="jp" {...register('example_japanese')} /></Field>
          <Field label="Kana"><Input className="jp" {...register('example_kana')} /></Field>
          <Field label="Romaji"><Input {...register('example_romaji')} /></Field>
          <Field label="English"><Input {...register('example_english')} /></Field>
        </div>
      </fieldset>

      <div className="grid grid-cols-3 gap-3">
        <Field label="JLPT level (1–5)"><Input type="number" {...register('jlpt_level')} /></Field>
        <Field label="Difficulty (1–5)"><Input type="number" {...register('difficulty')} /></Field>
      </div>

      {itemType === 'kanji' && (
        <fieldset className="rounded-2xl border border-accent/30 bg-accent/5 p-3">
          <legend className="px-1 text-xs font-bold uppercase text-accent">Kanji details</legend>
          <div className="grid grid-cols-2 gap-3">
            <Field label="On'yomi"><Input className="jp" {...register('onyomi')} /></Field>
            <Field label="Kun'yomi"><Input className="jp" {...register('kunyomi')} /></Field>
            <Field label="Stroke count"><Input type="number" {...register('stroke_count')} /></Field>
            <Field label="Radical"><Input className="jp" {...register('radical')} /></Field>
          </div>
          <Field label="Mnemonic (markdown)"><Textarea {...register('mnemonic_md')} /></Field>
        </fieldset>
      )}

      <Field label="Tags">
        <StringListEditor value={tags} onChange={(next) => setValue('tags', next)} placeholder="Add tag…" />
      </Field>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Save item
        </Button>
      </div>
    </form>
  );
}
