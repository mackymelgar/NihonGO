import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Archive, Award } from 'lucide-react';
import { useBadges, useSaveBadge, useArchiveBadge } from '@/hooks/admin/useBadges';
import { badgeSchema, type BadgeForm } from '@/lib/contentSchemas';
import { CONTENT_STATUSES, STATUS_LABELS, slugify } from '@/lib/content';
import type { BadgeRow } from '@/lib/database.types';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { Modal } from '@/components/ui/Modal';
import { StatusChip } from '@/components/admin/StatusChip';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';

export default function BadgesPage() {
  const { data, isLoading, isError, refetch } = useBadges();
  const [editing, setEditing] = useState<BadgeRow | 'new' | null>(null);
  const archive = useArchiveBadge();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Badges</h1>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> New badge
        </Button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError || !data ? (
        <ErrorState message="Couldn't load badges." onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyState icon={Award} title="No badges yet" action={{ label: 'New badge', onClick: () => setEditing('new') }} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-black/10 p-3 dark:border-white/10">
              <span className="text-3xl">{b.icon_emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold">{b.title}</p>
                  <StatusChip status={b.status} />
                </div>
                <p className="truncate text-sm text-ink-muted">{b.description}</p>
              </div>
              <button className="rounded p-1.5 hover:bg-black/10 dark:hover:bg-white/10" title="Edit" onClick={() => setEditing(b)}>
                <Pencil className="h-4 w-4" />
              </button>
              <button className="rounded p-1.5 text-ink-muted hover:text-red-500" title="Archive" onClick={() => confirm(`Archive "${b.title}"?`) && archive.mutate(b.id)}>
                <Archive className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && <BadgeModal row={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function BadgeModal({ row, onClose }: { row?: BadgeRow; onClose: () => void }) {
  const save = useSaveBadge();
  const { register, handleSubmit, watch, setValue, formState } = useForm<BadgeForm>({
    resolver: zodResolver(badgeSchema),
    defaultValues: {
      slug: row?.slug ?? '',
      title: row?.title ?? '',
      description: row?.description ?? '',
      icon_emoji: row?.icon_emoji ?? '🏅',
      status: row?.status ?? 'published',
    },
  });
  const title = watch('title');

  return (
    <Modal open onClose={onClose} title={row ? 'Edit badge' : 'New badge'}>
      <form
        className="flex flex-col gap-3"
        onSubmit={handleSubmit(async (v) => {
          await save.mutateAsync({ ...(row ? { id: row.id } : {}), ...v });
          onClose();
        })}
      >
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <Field label="Icon" error={formState.errors.icon_emoji?.message}>
            <Input className="text-center text-2xl" {...register('icon_emoji')} />
          </Field>
          <Field label="Title" required error={formState.errors.title?.message}>
            <Input {...register('title')} onBlur={() => !row && !watch('slug') && setValue('slug', slugify(title))} />
          </Field>
        </div>
        <Field label="Slug" required error={formState.errors.slug?.message}>
          <Input {...register('slug')} />
        </Field>
        <Field label="Description" required error={formState.errors.description?.message}>
          <Textarea {...register('description')} />
        </Field>
        <Field label="Status">
          <Select {...register('status')} options={CONTENT_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))} />
        </Field>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Save badge</Button>
        </div>
      </form>
    </Modal>
  );
}
