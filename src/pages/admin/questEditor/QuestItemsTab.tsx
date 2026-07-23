import { useState } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { useItemSearch } from '@/hooks/admin/useItems';
import { useAttachQuestItem, useDetachQuestItem, type QuestItemWithItem } from '@/hooks/admin/useQuestEditor';
import { Input } from '@/components/ui/form';
import { AudioButton } from '@/components/japanese/AudioButton';
import { EmptyState } from '@/components/ui/states';
import { BookMarked } from 'lucide-react';

export function QuestItemsTab({ questId, items }: { questId: string; items: QuestItemWithItem[] }) {
  const [search, setSearch] = useState('');
  const { data: results = [] } = useItemSearch(search);
  const attach = useAttachQuestItem();
  const detach = useDetachQuestItem();
  const attachedIds = new Set(items.map((i) => i.item_id));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Attached */}
      <div>
        <h3 className="mb-2 text-sm font-bold uppercase text-ink-muted">Items taught ({items.length})</h3>
        {items.length === 0 ? (
          <EmptyState icon={BookMarked} title="No items attached" message="Search on the right to attach items this quest teaches." />
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((qi) => (
              <div key={qi.item_id} className="flex items-center gap-2 rounded-2xl border border-black/10 p-2 dark:border-white/10">
                <span className="jp text-lg">{qi.item.japanese_text}</span>
                <AudioButton text={qi.item.tts_text} size="sm" />
                <span className="text-sm text-ink-muted">{qi.item.english_meaning}</span>
                <button
                  className="ml-auto rounded p-1.5 text-ink-muted hover:text-red-500"
                  title="Detach"
                  onClick={() => detach.mutate({ questId, itemId: qi.item_id })}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search & attach */}
      <div>
        <h3 className="mb-2 text-sm font-bold uppercase text-ink-muted">Attach items</h3>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            className="pl-9"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          {search && results.length === 0 && <p className="text-sm text-ink-muted">No matches.</p>}
          {results.map((item) => {
            const already = attachedIds.has(item.id);
            return (
              <div key={item.id} className="flex items-center gap-2 rounded-2xl border border-black/10 p-2 dark:border-white/10">
                <span className="jp text-lg">{item.japanese_text}</span>
                <span className="text-sm text-ink-muted">{item.english_meaning}</span>
                <button
                  disabled={already}
                  className="ml-auto flex items-center gap-1 rounded-lg bg-accent/10 px-2 py-1 text-xs font-semibold text-accent disabled:opacity-40"
                  onClick={() => attach.mutate({ questId, itemId: item.id, sortOrder: items.length })}
                >
                  <Plus className="h-3 w-3" /> {already ? 'Added' : 'Attach'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
