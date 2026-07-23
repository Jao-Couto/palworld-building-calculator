import { useMemo, useState } from 'react';
import { formatEnumTail } from '../lib/format';
import { resolveName, UI_TEXT } from '../lib/i18n';
import type { Item, ItemDatabase, Language } from '../lib/types';
import { PlusIcon } from './icons';
import { ItemThumb } from './ItemThumb';

interface ItemSelectorProps {
  db: ItemDatabase;
  lang: Language;
  /** Candidate item ids to search over (already scoped to the active section). */
  selectableIds: string[];
  selectedItemId: string | null;
  quantity: number;
  label: string;
  placeholder: string;
  onSelectItem: (itemId: string) => void;
  onChangeQuantity: (quantity: number) => void;
  onAddToCart: () => void;
}

const MAX_RESULTS = 20;

function formatBadge(item: Item): string | null {
  if (item.workbench) return item.workbench;
  if (item.category?.uiDisplay) return formatEnumTail(item.category.uiDisplay.en ?? '');
  return null;
}

export function ItemSelector({
  db,
  lang,
  selectableIds,
  selectedItemId,
  quantity,
  label,
  placeholder,
  onSelectItem,
  onChangeQuantity,
  onAddToCart,
}: ItemSelectorProps) {
  const [query, setQuery] = useState('');

  const entries = useMemo(
    () =>
      selectableIds
        .map((id): [string, Item] => [id, db[id]])
        .filter(([, item]) => item != null)
        .map(([id, item]): [string, Item, string] => [id, item, resolveName(item.name, lang, id)])
        .sort(([, , a], [, , b]) => a.localeCompare(b)),
    [db, selectableIds, lang],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries.slice(0, MAX_RESULTS);
    return entries
      .filter(([id, , name]) => name.toLowerCase().includes(q) || id.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS);
  }, [entries, query]);

  const selectedItem = selectedItemId ? db[selectedItemId] : null;
  const selectedItemName = selectedItem ? resolveName(selectedItem.name, lang, selectedItemId!) : null;
  const t = UI_TEXT[lang].selector;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <label htmlFor="item-search" className="mb-1 block text-sm font-medium text-text-secondary">
        {label}
      </label>
      <input
        id="item-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-text-primary placeholder-text-muted focus:border-accent focus:outline-none"
      />

      {query.trim() !== '' && (
        <ul className="mt-2 max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {matches.length === 0 && <li className="px-3 py-2 text-sm text-text-muted">{t.noResults}</li>}
          {matches.map(([id, item, name]) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => {
                  onSelectItem(id);
                  setQuery('');
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-2"
              >
                <ItemThumb id={id} item={item} size={24} />
                <span className="flex-1 truncate">{name}</span>
                {formatBadge(item) && (
                  <span className="ml-2 shrink-0 text-xs text-text-muted">{formatBadge(item)}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedItem && (
        <div className="mt-4 flex items-center justify-between gap-4 rounded-lg bg-surface-2 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <ItemThumb id={selectedItemId!} item={selectedItem} size={32} />
            <div className="min-w-0">
              <div className="truncate font-semibold text-text-primary">{selectedItemName}</div>
              {formatBadge(selectedItem) && (
                <div className="truncate text-xs text-text-muted">{formatBadge(selectedItem)}</div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <label htmlFor="quantity" className="text-sm text-text-muted">
              {t.quantity}
            </label>
            <input
              id="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => onChangeQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 rounded-md border border-border bg-bg px-2 py-1 text-right tabular-nums text-text-primary focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={onAddToCart}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent2"
            >
              <PlusIcon size={16} />
              {t.addToCart}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
