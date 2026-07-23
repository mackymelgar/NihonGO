import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, AlertTriangle, CheckCircle2, Rocket } from 'lucide-react';
import { useQuestDetail } from '@/hooks/admin/useQuestEditor';
import { useQuestActivities } from '@/hooks/admin/useActivities';
import { useContentTree, useSaveQuest, useSetContentStatus } from '@/hooks/admin/useContentTree';
import { useBadges } from '@/hooks/admin/useBadges';
import { questSchema, type QuestForm } from '@/lib/contentSchemas';
import { validateQuestForPublish, hasBlockingErrors } from '@/lib/publishValidation';
import { CONTENT_STATUSES, QUEST_TYPES, SKILL_TYPES, STATUS_LABELS } from '@/lib/content';
import type { QuestRow, SkillType } from '@/lib/database.types';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea, CheckboxGroup } from '@/components/ui/form';
import { StatusChip } from '@/components/admin/StatusChip';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { QuestStepsTab } from './questEditor/QuestStepsTab';
import { QuestItemsTab } from './questEditor/QuestItemsTab';
import { QuestActivitiesTab } from './questEditor/QuestActivitiesTab';

type Tab = 'overview' | 'steps' | 'items' | 'activities';

export default function QuestEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useQuestDetail(id ?? null);
  const { data: activities = [] } = useQuestActivities(id ?? null);
  const [tab, setTab] = useState<Tab>('overview');

  if (isLoading) return <LoadingState label="Loading quest…" />;
  if (isError || !data) return <ErrorState message="Couldn't load this quest." onRetry={() => refetch()} />;

  const { quest, steps, items } = data;
  const issues = validateQuestForPublish({
    quest,
    steps,
    activities,
    questItemCount: items.length,
  });

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'steps', label: 'Lesson steps', count: steps.length },
    { id: 'items', label: 'Items taught', count: items.length },
    { id: 'activities', label: 'Activities', count: activities.length },
  ];

  return (
    <div>
      <Link to="/admin/content" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Content tree
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">{quest.title}</h1>
        <StatusChip status={quest.status} />
        <span className="text-sm text-ink-muted">/{quest.slug}</span>
        <div className="ml-auto flex gap-2">
          <Link to={`/quest/${quest.slug}?preview=1`} target="_blank">
            <Button variant="secondary" size="sm">Preview as learner</Button>
          </Link>
        </div>
      </div>

      <PublishBar quest={quest} issues={issues} />

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-black/10 dark:border-white/10">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              'shrink-0 border-b-2 px-4 py-2 text-sm font-semibold transition-colors ' +
              (tab === t.id
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink')
            }
          >
            {t.label}
            {t.count != null && <span className="ml-1 text-xs opacity-70">({t.count})</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab quest={quest} />}
      {tab === 'steps' && <QuestStepsTab quest={quest} steps={steps} activities={activities} />}
      {tab === 'items' && <QuestItemsTab questId={quest.id} items={items} />}
      {tab === 'activities' && <QuestActivitiesTab questId={quest.id} activities={activities} />}
    </div>
  );
}

function PublishBar({ quest, issues }: { quest: QuestRow; issues: ReturnType<typeof validateQuestForPublish> }) {
  const setStatus = useSetContentStatus();
  const blocking = hasBlockingErrors(issues);
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');

  return (
    <div className="mb-4 rounded-2xl border border-black/10 p-4 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {blocking ? (
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
          <span className="font-bold">
            {blocking ? 'Not ready to publish' : 'Ready to publish'}
          </span>
        </div>
        <div className="flex gap-2">
          {quest.status !== 'published' ? (
            <Button
              size="sm"
              disabled={blocking}
              loading={setStatus.isPending}
              onClick={() => setStatus.mutate({ table: 'quests', id: quest.id, status: 'published' })}
            >
              <Rocket className="h-4 w-4" /> Publish
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              loading={setStatus.isPending}
              onClick={() => setStatus.mutate({ table: 'quests', id: quest.id, status: 'draft' })}
            >
              Unpublish
            </Button>
          )}
        </div>
      </div>
      {(errors.length > 0 || warnings.length > 0) && (
        <ul className="mt-2 space-y-1 text-sm">
          {errors.map((e, i) => (
            <li key={`e${i}`} className="text-red-600">• {e.message}</li>
          ))}
          {warnings.map((w, i) => (
            <li key={`w${i}`} className="text-amber-600">• {w.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OverviewTab({ quest }: { quest: QuestRow }) {
  const save = useSaveQuest();
  const { data: tree } = useContentTree();
  const { data: badges = [] } = useBadges();
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit, watch, setValue, formState } = useForm<QuestForm>({
    resolver: zodResolver(questSchema),
    defaultValues: {
      area_id: quest.area_id,
      slug: quest.slug,
      title: quest.title,
      description: quest.description ?? '',
      learning_goal: quest.learning_goal ?? '',
      quest_type: quest.quest_type,
      difficulty: quest.difficulty,
      estimated_minutes: quest.estimated_minutes,
      xp_reward: quest.xp_reward,
      badge_id: quest.badge_id ?? undefined,
      pass_threshold: quest.pass_threshold,
      required_quest_id: quest.required_quest_id ?? undefined,
      skills_trained: quest.skills_trained,
      status: quest.status,
      sort_order: quest.sort_order,
    },
  });

  const skills = watch('skills_trained');
  const prereqOptions = (tree?.quests ?? [])
    .filter((q) => q.area_id === quest.area_id && q.id !== quest.id)
    .map((q) => ({ value: q.id, label: q.title }));

  return (
    <form
      className="flex max-w-2xl flex-col gap-3"
      onSubmit={handleSubmit(async (v) => {
        await save.mutateAsync({
          id: quest.id,
          ...v,
          badge_id: v.badge_id || null,
          required_quest_id: v.required_quest_id || null,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      })}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Title" required error={formState.errors.title?.message}>
          <Input {...register('title')} />
        </Field>
        <Field label="Slug" required error={formState.errors.slug?.message}>
          <Input {...register('slug')} />
        </Field>
      </div>

      <Field label="Learning goal" hint="e.g. Read and write あいうえお">
        <Input {...register('learning_goal')} />
      </Field>
      <Field label="Description">
        <Textarea {...register('description')} />
      </Field>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Type">
          <Select {...register('quest_type')} options={QUEST_TYPES.map((t) => ({ value: t, label: t }))} />
        </Field>
        <Field label="Difficulty (1–5)">
          <Input type="number" {...register('difficulty')} />
        </Field>
        <Field label="Est. minutes">
          <Input type="number" {...register('estimated_minutes')} />
        </Field>
        <Field label="XP reward">
          <Input type="number" {...register('xp_reward')} />
        </Field>
        <Field label="Pass threshold (0–1)" hint="Boss quests">
          <Input type="number" step="0.05" {...register('pass_threshold')} />
        </Field>
        <Field label="Sort order">
          <Input type="number" {...register('sort_order')} />
        </Field>
      </div>

      <Field label="Skills trained" required error={formState.errors.skills_trained?.message as string | undefined}>
        <CheckboxGroup
          options={SKILL_TYPES}
          value={skills as SkillType[]}
          onChange={(v) => setValue('skills_trained', v, { shouldValidate: true })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Prerequisite quest" hint="Unlocks after this quest">
          <Select
            {...register('required_quest_id')}
            options={[{ value: '', label: '— none (area start) —' }, ...prereqOptions]}
          />
        </Field>
        <Field label="Completion badge">
          <Select
            {...register('badge_id')}
            options={[{ value: '', label: '— none —' }, ...badges.map((b) => ({ value: b.id, label: `${b.icon_emoji} ${b.title}` }))]}
          />
        </Field>
      </div>

      <Field label="Status">
        <Select {...register('status')} options={CONTENT_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))} />
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={save.isPending}>Save quest</Button>
        {saved && <span className="text-sm font-semibold text-green-600">Saved ✓</span>}
      </div>
    </form>
  );
}
