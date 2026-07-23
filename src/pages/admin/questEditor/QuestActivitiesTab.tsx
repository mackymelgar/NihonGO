import { useState } from 'react';
import { Plus, Pencil, Archive } from 'lucide-react';
import type { ActivityRow } from '@/lib/database.types';
import { useActivity, useArchiveActivity } from '@/hooks/admin/useActivities';
import { ACTIVITY_TYPE_LABELS } from '@/lib/content';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatusChip } from '@/components/admin/StatusChip';
import { ActivityEditor } from '@/components/admin/ActivityEditor';
import { EmptyState } from '@/components/ui/states';
import { Swords } from 'lucide-react';

export function QuestActivitiesTab({
  questId,
  activities,
}: {
  questId: string;
  activities: ActivityRow[];
}) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const archive = useArchiveActivity();

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setEditingId('new')}>
          <Plus className="h-4 w-4" /> New activity
        </Button>
      </div>

      {activities.length === 0 ? (
        <EmptyState
          icon={Swords}
          title="No activities yet"
          message="Add practice activities that learners answer in this quest."
          action={{ label: 'New activity', onClick: () => setEditingId('new') }}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {activities.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10"
            >
              <span className="rounded bg-parchment-200 px-2 py-0.5 text-xs font-bold dark:bg-white/10">
                {ACTIVITY_TYPE_LABELS[a.activity_type]}
              </span>
              <span className="flex-1 truncate text-sm">{a.prompt_md}</span>
              <StatusChip status={a.status} />
              <button className="rounded p-1.5 hover:bg-black/10 dark:hover:bg-white/10" title="Edit" onClick={() => setEditingId(a.id)}>
                <Pencil className="h-4 w-4" />
              </button>
              <button
                className="rounded p-1.5 hover:bg-black/10 dark:hover:bg-white/10"
                title="Archive"
                onClick={() => confirm('Archive this activity?') && archive.mutate({ id: a.id, questId })}
              >
                <Archive className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {editingId && (
        <ActivityEditorModal
          questId={questId}
          activityId={editingId === 'new' ? null : editingId}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}

function ActivityEditorModal({
  questId,
  activityId,
  onClose,
}: {
  questId: string;
  activityId: string | null;
  onClose: () => void;
}) {
  const { data: existing, isLoading } = useActivity(activityId);

  return (
    <Modal open onClose={onClose} title={activityId ? 'Edit activity' : 'New activity'} size="xl">
      {activityId && isLoading ? (
        <p className="py-8 text-center text-ink-muted">Loading…</p>
      ) : (
        <ActivityEditor
          existing={existing ?? undefined}
          questId={questId}
          onSaved={onClose}
          onCancel={onClose}
        />
      )}
    </Modal>
  );
}
