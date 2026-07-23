import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronRight, Plus, Pencil, Archive } from 'lucide-react';
import {
  useContentTree,
  useSaveCourse,
  useSaveArea,
  useSaveQuest,
  useSetContentStatus,
  useArchiveNode,
  useReorderList,
} from '@/hooks/admin/useContentTree';
import type { AreaRow, ContentStatus, CourseRow, QuestRow } from '@/lib/database.types';
import { CONTENT_STATUSES, QUEST_TYPES, STATUS_LABELS, slugify } from '@/lib/content';
import {
  courseSchema,
  areaSchema,
  type CourseForm,
  type AreaForm,
} from '@/lib/contentSchemas';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { Modal } from '@/components/ui/Modal';
import { StatusChip } from '@/components/admin/StatusChip';
import { SortableList, SortableRow } from '@/components/admin/Sortable';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { FolderTree } from 'lucide-react';

export default function ContentTreePage() {
  const { data, isLoading, isError, refetch } = useContentTree();
  const [modal, setModal] = useState<
    | { kind: 'course'; row?: CourseRow }
    | { kind: 'area'; courseId: string; row?: AreaRow }
    | { kind: 'quest'; areaId: string; row?: QuestRow }
    | null
  >(null);

  if (isLoading) return <LoadingState label="Loading content tree…" />;
  if (isError || !data)
    return <ErrorState message="Couldn't load content." onRetry={() => refetch()} />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Content</h1>
        <Button size="sm" onClick={() => setModal({ kind: 'course' })}>
          <Plus className="h-4 w-4" /> Course
        </Button>
      </div>

      {data.courses.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No courses yet"
          message="Create your first course to start building the curriculum."
          action={{ label: 'Create course', onClick: () => setModal({ kind: 'course' }) }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {data.courses.map((course) => (
            <CourseNode
              key={course.id}
              course={course}
              areas={data.areas.filter((a) => a.course_id === course.id)}
              quests={data.quests}
              onEditCourse={() => setModal({ kind: 'course', row: course })}
              onAddArea={() => setModal({ kind: 'area', courseId: course.id })}
              onEditArea={(row) => setModal({ kind: 'area', courseId: course.id, row })}
              onAddQuest={(areaId) => setModal({ kind: 'quest', areaId })}
            />
          ))}
        </div>
      )}

      {modal?.kind === 'course' && (
        <CourseModal row={modal.row} onClose={() => setModal(null)} nextSort={data.courses.length} />
      )}
      {modal?.kind === 'area' && (
        <AreaModal
          courseId={modal.courseId}
          row={modal.row}
          nextSort={data.areas.filter((a) => a.course_id === modal.courseId).length}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'quest' && (
        <QuestCreateModal
          areaId={modal.areaId}
          nextSort={data.quests.filter((q) => q.area_id === modal.areaId).length}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ---------- Tree nodes ----------
function CourseNode({
  course,
  areas,
  quests,
  onEditCourse,
  onAddArea,
  onEditArea,
  onAddQuest,
}: {
  course: CourseRow;
  areas: AreaRow[];
  quests: QuestRow[];
  onEditCourse: () => void;
  onAddArea: () => void;
  onEditArea: (row: AreaRow) => void;
  onAddQuest: (areaId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const setStatus = useSetContentStatus();
  const archive = useArchiveNode();
  const reorderList = useReorderList();

  return (
    <div className="rounded-2xl border border-black/10 bg-white/50 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-2 p-3">
        <button onClick={() => setOpen((o) => !o)} className="text-ink-muted">
          {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
        <span className="font-extrabold">{course.title}</span>
        <StatusChip status={course.status} />
        <span className="text-xs text-ink-muted">/{course.slug}</span>
        <div className="ml-auto flex items-center gap-1">
          <StatusMenu
            status={course.status}
            onChange={(status) => setStatus.mutate({ table: 'courses', id: course.id, status })}
          />
          <IconBtn title="Edit" onClick={onEditCourse}><Pencil className="h-4 w-4" /></IconBtn>
          <IconBtn title="Add area" onClick={onAddArea}><Plus className="h-4 w-4" /></IconBtn>
          <IconBtn
            title="Archive"
            onClick={() => confirm(`Archive course "${course.title}"?`) && archive.mutate({ table: 'courses', id: course.id })}
          >
            <Archive className="h-4 w-4" />
          </IconBtn>
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-2 border-t border-black/5 p-3 pl-8 dark:border-white/10">
          {areas.length === 0 && (
            <p className="text-sm text-ink-muted">No areas. Add one with the + above.</p>
          )}
          <SortableList
            ids={areas.map((a) => a.id)}
            onReorder={(ids) => reorderList.mutate({ table: 'areas', ids })}
          >
            <div className="flex flex-col gap-2">
              {areas.map((area) => (
                <SortableRow key={area.id} id={area.id}>
                  <AreaNode
                    area={area}
                    quests={quests.filter((q) => q.area_id === area.id)}
                    onEdit={() => onEditArea(area)}
                    onAddQuest={() => onAddQuest(area.id)}
                  />
                </SortableRow>
              ))}
            </div>
          </SortableList>
        </div>
      )}
    </div>
  );
}

function AreaNode({
  area,
  quests,
  onEdit,
  onAddQuest,
}: {
  area: AreaRow;
  quests: QuestRow[];
  onEdit: () => void;
  onAddQuest: () => void;
}) {
  const [open, setOpen] = useState(true);
  const setStatus = useSetContentStatus();
  const archive = useArchiveNode();
  const reorderList = useReorderList();
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10">
      <div className="flex items-center gap-2 p-2">
        <button onClick={() => setOpen((o) => !o)} className="text-ink-muted">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="text-lg">{area.theme_icon ?? '📍'}</span>
        <span className="font-bold">{area.title}</span>
        <StatusChip status={area.status} />
        <div className="ml-auto flex items-center gap-1">
          <StatusMenu
            status={area.status}
            onChange={(status) => setStatus.mutate({ table: 'areas', id: area.id, status })}
          />
          <IconBtn title="Edit" onClick={onEdit}><Pencil className="h-4 w-4" /></IconBtn>
          <IconBtn title="Add quest" onClick={onAddQuest}><Plus className="h-4 w-4" /></IconBtn>
          <IconBtn
            title="Archive"
            onClick={() => confirm(`Archive area "${area.title}"?`) && archive.mutate({ table: 'areas', id: area.id })}
          >
            <Archive className="h-4 w-4" />
          </IconBtn>
        </div>
      </div>
      {open && (
        <div className="flex flex-col gap-1 border-t border-black/5 p-2 pl-6 dark:border-white/10">
          {quests.length === 0 && <p className="text-xs text-ink-muted">No quests yet.</p>}
          <SortableList
            ids={quests.map((q) => q.id)}
            onReorder={(ids) => reorderList.mutate({ table: 'quests', ids })}
          >
            <div className="flex flex-col gap-1">
              {quests.map((q) => (
                <SortableRow key={q.id} id={q.id}>
                  <QuestRowNode quest={q} onOpen={() => navigate(`/admin/quest/${q.id}`)} />
                </SortableRow>
              ))}
            </div>
          </SortableList>
        </div>
      )}
    </div>
  );
}

function QuestRowNode({ quest, onOpen }: { quest: QuestRow; onOpen: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5">
      <button onClick={onOpen} className="flex flex-1 items-center gap-2 text-left">
        <span className="rounded bg-parchment-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-muted dark:bg-white/10">
          {quest.quest_type}
        </span>
        <span className="font-semibold">{quest.title}</span>
        <span className="text-xs text-ink-muted">· {quest.xp_reward} XP</span>
        <StatusChip status={quest.status} />
      </button>
      <IconBtn title="Open editor" onClick={onOpen}><Pencil className="h-4 w-4" /></IconBtn>
    </div>
  );
}

// ---------- Small controls ----------
function IconBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="rounded-lg p-1.5 text-ink-muted hover:bg-black/10 dark:hover:bg-white/10"
    >
      {children}
    </button>
  );
}


function StatusMenu({
  status,
  onChange,
}: {
  status: ContentStatus;
  onChange: (s: ContentStatus) => void;
}) {
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value as ContentStatus)}
      className="rounded-lg border border-black/10 bg-transparent px-1 py-1 text-xs dark:border-white/15"
      title="Set status"
    >
      {CONTENT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

// ---------- Modals ----------
function CourseModal({
  row,
  nextSort,
  onClose,
}: {
  row?: CourseRow;
  nextSort: number;
  onClose: () => void;
}) {
  const save = useSaveCourse();
  const { register, handleSubmit, watch, setValue, formState } = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      slug: row?.slug ?? '',
      title: row?.title ?? '',
      description: row?.description ?? '',
      status: row?.status ?? 'draft',
      sort_order: row?.sort_order ?? nextSort,
    },
  });
  const title = watch('title');

  return (
    <Modal open onClose={onClose} title={row ? 'Edit course' : 'New course'}>
      <form
        className="flex flex-col gap-3"
        onSubmit={handleSubmit(async (v) => {
          await save.mutateAsync({ ...(row ? { id: row.id } : {}), ...v });
          onClose();
        })}
      >
        <Field label="Title" required error={formState.errors.title?.message}>
          <Input {...register('title')} onBlur={() => !row && !watch('slug') && setValue('slug', slugify(title))} />
        </Field>
        <Field label="Slug" required error={formState.errors.slug?.message}>
          <Input {...register('slug')} />
        </Field>
        <Field label="Description">
          <Textarea {...register('description')} />
        </Field>
        <Field label="Status">
          <Select {...register('status')} options={CONTENT_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))} />
        </Field>
        <ModalActions onClose={onClose} saving={save.isPending} />
      </form>
    </Modal>
  );
}

function AreaModal({
  courseId,
  row,
  nextSort,
  onClose,
}: {
  courseId: string;
  row?: AreaRow;
  nextSort: number;
  onClose: () => void;
}) {
  const save = useSaveArea();
  const { register, handleSubmit, watch, setValue, formState } = useForm<AreaForm>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      course_id: courseId,
      slug: row?.slug ?? '',
      title: row?.title ?? '',
      subtitle: row?.subtitle ?? '',
      description: row?.description ?? '',
      theme_icon: row?.theme_icon ?? '',
      theme_color: row?.theme_color ?? '',
      status: row?.status ?? 'draft',
      sort_order: row?.sort_order ?? nextSort,
    },
  });
  const title = watch('title');

  return (
    <Modal open onClose={onClose} title={row ? 'Edit area' : 'New area'}>
      <form
        className="flex flex-col gap-3"
        onSubmit={handleSubmit(async (v) => {
          await save.mutateAsync({ ...(row ? { id: row.id } : {}), ...v });
          onClose();
        })}
      >
        <Field label="Title" required error={formState.errors.title?.message}>
          <Input {...register('title')} onBlur={() => !row && !watch('slug') && setValue('slug', slugify(title))} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Slug" required error={formState.errors.slug?.message}>
            <Input {...register('slug')} />
          </Field>
          <Field label="Subtitle">
            <Input {...register('subtitle')} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Theme icon (emoji)">
            <Input {...register('theme_icon')} placeholder="🌲" />
          </Field>
          <Field label="Theme color (tailwind token)">
            <Input {...register('theme_color')} placeholder="emerald" />
          </Field>
        </div>
        <Field label="Description">
          <Textarea {...register('description')} />
        </Field>
        <Field label="Status">
          <Select {...register('status')} options={CONTENT_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))} />
        </Field>
        <ModalActions onClose={onClose} saving={save.isPending} />
      </form>
    </Modal>
  );
}

function QuestCreateModal({
  areaId,
  nextSort,
  onClose,
}: {
  areaId: string;
  nextSort: number;
  onClose: () => void;
}) {
  const save = useSaveQuest();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState('main');

  return (
    <Modal open onClose={onClose} title="New quest">
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const created = await save.mutateAsync({
            area_id: areaId,
            title,
            slug: slug || slugify(title),
            quest_type: type as QuestRow['quest_type'],
            sort_order: nextSort,
          });
          onClose();
          navigate(`/admin/quest/${created.id}`);
        }}
      >
        <Field label="Title" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => !slug && setSlug(slugify(title))} />
        </Field>
        <Field label="Slug" required hint="Auto-filled from title">
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
        </Field>
        <Field label="Quest type">
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={QUEST_TYPES.map((t) => ({ value: t, label: t }))}
          />
        </Field>
        <p className="text-xs text-ink-muted">
          You'll be taken to the quest editor to add steps, activities, and items.
        </p>
        <ModalActions onClose={onClose} saving={save.isPending} saveLabel="Create & edit" />
      </form>
    </Modal>
  );
}

function ModalActions({
  onClose,
  saving,
  saveLabel = 'Save',
}: {
  onClose: () => void;
  saving: boolean;
  saveLabel?: string;
}) {
  return (
    <div className="mt-2 flex justify-end gap-2">
      <Button type="button" variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" loading={saving}>
        {saveLabel}
      </Button>
    </div>
  );
}
