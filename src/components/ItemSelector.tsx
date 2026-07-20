import { useMemo, useState } from 'react';
import type { Item, ItemDatabase } from '../lib/types';

interface ItemSelectorProps {
  db: ItemDatabase;
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

/** "EPalBuildObjectTypeForUIDisplay::Product_Repair" -> "Product Repair" */
function formatBadge(item: Item): string | null {
  if (item.workbench) return item.workbench;
  if (item.category?.uiDisplay) {
    return item.category.uiDisplay.split('::').pop()?.replaceAll('_', ' ') ?? null;
  }
  return null;
}

export function ItemSelector({
  db,
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
        .sort(([, a], [, b]) => a.name.localeCompare(b.name)),
    [db, selectableIds],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries.slice(0, MAX_RESULTS);
    return entries
      .filter(([id, item]) => item.name.toLowerCase().includes(q) || id.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS);
  }, [entries, query]);

  const selectedItem = selectedItemId ? db[selectedItemId] : null;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
      <label htmlFor="item-search" className="mb-1 block text-sm font-medium text-slate-300">
        {label}
      </label>
      <input
        id="item-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
      />

      {query.trim() !== '' && (
        <ul className="mt-2 max-h-64 divide-y divide-slate-700 overflow-y-auto rounded-md border border-slate-700">
          {matches.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">No matching results.</li>
          )}
          {matches.map(([id, item]) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => {
                  onSelectItem(id);
                  setQuery('');
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
              >
                <span>{item.name}</span>
                {formatBadge(item) && (
                  <span className="ml-2 shrink-0 text-xs text-slate-400">{formatBadge(item)}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedItem && (
        <div className="mt-4 flex items-center justify-between gap-4 rounded-md bg-slate-900 px-3 py-2">
          <div>
            <div className="font-semibold text-slate-100">{selectedItem.name}</div>
            {formatBadge(selectedItem) && (
              <div className="text-xs text-slate-400">{formatBadge(selectedItem)}</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="quantity" className="text-sm text-slate-400">
              Qty
            </label>
            <input
              id="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => onChangeQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-right text-slate-100 focus:border-sky-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={onAddToCart}
              className="rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-500"
            >
              Add to cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
