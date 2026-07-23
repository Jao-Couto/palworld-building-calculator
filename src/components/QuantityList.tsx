import { useMemo, useState } from 'react';
import { categoryOf, CATEGORY_COLOR } from '../lib/category';
import { formatQuantity } from '../lib/format';
import { resolveName, UI_TEXT } from '../lib/i18n';
import type { Item, ItemDatabase, Language, QuantityMap } from '../lib/types';
import { ItemThumb } from './ItemThumb';

interface QuantityListProps {
  db: ItemDatabase;
  lang: Language;
  title: string;
  quantities: QuantityMap;
  emptyMessage: string;
  onSelect?: (itemId: string) => void;
  onToast?: (message: string) => void;
}

type Sort = 'quantity' | 'name';

const SCROLL_THRESHOLD = 12;

interface Row {
  itemId: string;
  item: Item | undefined;
  name: string;
  quantity: number;
}

export function QuantityList({
  db,
  lang,
  title,
  quantities,
  emptyMessage,
  onSelect,
  onToast,
}: QuantityListProps) {
  const t = UI_TEXT[lang];
  const [sort, setSort] = useState<Sort>('quantity');

  const rows = useMemo<Row[]>(() => {
    const list = Object.entries(quantities).map(([itemId, quantity]) => ({
      itemId,
      item: db[itemId],
      name: db[itemId] ? resolveName(db[itemId].name, lang, itemId) : itemId,
      quantity: formatQuantity(quantity),
    }));
    list.sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name) : b.quantity - a.quantity,
    );
    return list;
  }, [db, lang, quantities, sort]);

  const max = rows.reduce((m, r) => Math.max(m, r.quantity), 0);

  function copyList() {
    const text = [...rows]
      .sort((a, b) => b.quantity - a.quantity)
      .map((r) => `${r.name} x${r.quantity.toLocaleString()}`)
      .join('\n');
    navigator.clipboard?.writeText(text).then(
      () => onToast?.(t.quantityList.copied),
      () => {
        /* ignore clipboard errors */
      },
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          {title}
          {rows.length > 0 && (
            <span className="ml-1.5 normal-case text-text-muted">
              · {t.quantityList.itemsCount(rows.length)}
            </span>
          )}
        </h2>
        {rows.length > 1 && (
          <div className="flex shrink-0 overflow-hidden rounded-md border border-border text-xs">
            {(['quantity', 'name'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                className={
                  'px-2 py-1 font-medium transition-colors ' +
                  (sort === key
                    ? 'bg-accent text-white'
                    : 'bg-surface text-text-secondary hover:text-text-primary')
                }
              >
                {key === 'quantity' ? t.quantityList.sortByQuantity : t.quantityList.sortByName}
              </button>
            ))}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-text-muted">{emptyMessage}</p>
      ) : (
        <>
          <ul
            className={
              rows.length > SCROLL_THRESHOLD ? 'max-h-[480px] overflow-y-auto pr-1' : undefined
            }
          >
            {rows.map((row, i) => {
              const category = row.item ? categoryOf(row.itemId, row.item) : 'other';
              const barPct = max > 0 ? (row.quantity / max) * 100 : 0;
              return (
                <li
                  key={row.itemId}
                  className={
                    'flex items-center gap-2 rounded-md px-2 py-2 ' +
                    (i % 2 === 1 ? 'bg-black/[0.02] dark:bg-white/5' : '')
                  }
                >
                  {row.item && <ItemThumb id={row.itemId} item={row.item} size={28} iconOnly />}
                  {onSelect ? (
                    <button
                      type="button"
                      onClick={() => onSelect(row.itemId)}
                      title={row.name}
                      className="min-w-0 flex-1 truncate text-left text-sm text-text-primary hover:text-accent"
                    >
                      {row.name}
                    </button>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-sm text-text-primary" title={row.name}>
                      {row.name}
                    </span>
                  )}
                  <div className="hidden h-[5px] w-[70px] shrink-0 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10 sm:block">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${barPct}%`, backgroundColor: CATEGORY_COLOR[category] }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-sm font-medium tabular-nums text-text-primary">
                    {row.quantity.toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={copyList}
            className="mt-3 self-start rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent/50 hover:text-text-primary"
          >
            {t.quantityList.copyList}
          </button>
        </>
      )}
    </div>
  );
}
