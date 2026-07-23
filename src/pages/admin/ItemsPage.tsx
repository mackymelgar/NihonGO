import { useState } from 'react';
import { Plus, Upload, Pencil, Archive, Search } from 'lucide-react';
import {
  useItems,
  useSaveItem,
  useArchiveItem,
  useImportItems,
  type ItemFilters,
} from '@/hooks/admin/useItems';
import { itemImportRowSchema } from '@/lib/contentSchemas';
import { parseCsvToObjects } from '@/lib/csv';
import { ITEM_TYPES, CONTENT_STATUSES, STATUS_LABELS } from '@/lib/content';
import type { ItemType, ContentStatus, LearningItemRow } from '@/lib/database.types';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/form';
import { Modal } from '@/components/ui/Modal';
import { ItemForm } from '@/components/admin/ItemForm';
import { StatusChip } from '@/components/admin/StatusChip';
import { AudioButton } from '@/components/japanese/AudioButton';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { BookMarked } from 'lucide-react';

export default function ItemsPage() {
  const [filters, setFilters] = useState<ItemFilters>({ itemType: 'all', status: 'all' });
  const [editing, setEditing] = useState<LearningItemRow | 'new' | null>(null);
  const [importing, setImporting] = useState(false);
  const { data, isLoading, isError, refetch } = useItems(filters);
  const save = useSaveItem();
  const archive = useArchiveItem();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Items</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setImporting(true)}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> New item
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="relative col-span-2 sm:col-span-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            className="pl-9"
            placeholder="Search…"
            value={filters.search ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <Select
          value={filters.itemType ?? 'all'}
          onChange={(e) => setFilters((f) => ({ ...f, itemType: e.target.value as ItemType | 'all' }))}
          options={[{ value: 'all', label: 'All types' }, ...ITEM_TYPES.map((t) => ({ value: t, label: t }))]}
        />
        <Select
          value={filters.status ?? 'all'}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as ContentStatus | 'all' }))}
          options={[{ value: 'all', label: 'All statuses' }, ...CONTENT_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]}
        />
        <Select
          value={String(filters.jlptLevel ?? 'all')}
          onChange={(e) =>
            setFilters((f) => ({ ...f, jlptLevel: e.target.value === 'all' ? 'all' : Number(e.target.value) }))
          }
          options={[{ value: 'all', label: 'All JLPT' }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `N${n}` }))]}
        />
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError || !data ? (
        <ErrorState message="Couldn't load items." onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="No items match"
          message="Create an item or adjust your filters."
          action={{ label: 'New item', onClick: () => setEditing('new') }}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-parchment-200 text-xs uppercase text-ink-muted dark:bg-white/10">
              <tr>
                <th className="p-2">Japanese</th>
                <th className="p-2">Reading</th>
                <th className="hidden p-2 sm:table-cell">Meaning</th>
                <th className="p-2">Type</th>
                <th className="p-2">Status</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="border-t border-black/5 dark:border-white/10">
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <span className="jp text-lg">{item.japanese_text}</span>
                      <AudioButton text={item.tts_text} size="sm" />
                    </div>
                  </td>
                  <td className="jp p-2 text-ink-muted">{item.kana_reading}</td>
                  <td className="hidden p-2 sm:table-cell">{item.english_meaning}</td>
                  <td className="p-2 text-xs">{item.item_type}</td>
                  <td className="p-2"><StatusChip status={item.status} /></td>
                  <td className="p-2">
                    <div className="flex justify-end gap-1">
                      <button className="rounded p-1.5 hover:bg-black/10 dark:hover:bg-white/10" title="Edit" onClick={() => setEditing(item)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded p-1.5 hover:bg-black/10 dark:hover:bg-white/10"
                        title="Archive"
                        onClick={() => confirm(`Archive "${item.japanese_text}"?`) && archive.mutate(item.id)}
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing === 'new' ? 'New item' : 'Edit item'} size="lg">
          <ItemForm
            row={editing === 'new' ? undefined : editing}
            saving={save.isPending}
            onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              await save.mutateAsync(values as Parameters<typeof save.mutateAsync>[0]);
              setEditing(null);
            }}
          />
        </Modal>
      )}

      {importing && <ImportModal onClose={() => setImporting(false)} />}
    </div>
  );
}

// ---------- CSV import ----------
function ImportModal({ onClose }: { onClose: () => void }) {
  const importItems = useImportItems();
  const [rows, setRows] = useState<{ valid: Record<string, unknown>[]; errors: { row: number; msg: string }[] } | null>(
    null,
  );
  const [done, setDone] = useState<number | null>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const objs = parseCsvToObjects(String(reader.result));
      const valid: Record<string, unknown>[] = [];
      const errors: { row: number; msg: string }[] = [];
      objs.forEach((o, i) => {
        const coerced = {
          ...o,
          tags: o.tags ? o.tags.split('|').map((t) => t.trim()).filter(Boolean) : [],
        };
        const parsed = itemImportRowSchema.safeParse(coerced);
        if (parsed.success) valid.push(parsed.data);
        else errors.push({ row: i + 2, msg: parsed.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; ') });
      });
      setRows({ valid, errors });
    };
    reader.readAsText(file);
  }

  return (
    <Modal open onClose={onClose} title="Import items from CSV" size="lg">
      <p className="mb-3 text-sm text-ink-muted">
        Columns match the item fields (e.g. <code>item_type,japanese_text,kana_reading,romaji,english_meaning,tts_text,difficulty</code>).
        Use <code>|</code> to separate tags. Valid rows import as drafts.
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="mb-3 block w-full text-sm"
      />

      {rows && (
        <div className="mb-3 max-h-64 overflow-y-auto rounded-2xl border border-black/10 p-3 text-sm dark:border-white/10">
          <p className="font-bold text-green-700 dark:text-green-400">{rows.valid.length} valid row(s)</p>
          {rows.errors.length > 0 && (
            <>
              <p className="mt-2 font-bold text-red-600">{rows.errors.length} invalid row(s):</p>
              <ul className="list-inside list-disc text-xs text-red-600">
                {rows.errors.slice(0, 20).map((e) => (
                  <li key={e.row}>Row {e.row}: {e.msg}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {done != null && <p className="mb-3 text-sm font-bold text-green-700 dark:text-green-400">Imported {done} item(s).</p>}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button
          disabled={!rows || rows.valid.length === 0}
          loading={importItems.isPending}
          onClick={async () => {
            if (!rows) return;
            const n = await importItems.mutateAsync(rows.valid as Parameters<typeof importItems.mutateAsync>[0]);
            setDone(n);
            setRows(null);
          }}
        >
          Import {rows?.valid.length ?? 0} rows
        </Button>
      </div>
    </Modal>
  );
}
