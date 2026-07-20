import type { CartEntry, ItemDatabase } from '../lib/types';

interface CartProps {
  db: ItemDatabase;
  entries: CartEntry[];
  onChangeQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onClear: () => void;
}

export function Cart({ db, entries, onChangeQuantity, onRemove, onClear }: CartProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Cart</h2>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Clear
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">
          No items yet. Search an item or building and add it to the cart.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => {
            const item = db[entry.itemId];
            return (
              <li
                key={entry.itemId}
                className="flex items-center justify-between gap-2 rounded-md bg-slate-900 px-2 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                  {item?.name ?? entry.itemId}
                </span>
                <input
                  type="number"
                  min={1}
                  value={entry.quantity}
                  onChange={(e) =>
                    onChangeQuantity(entry.itemId, Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-14 shrink-0 rounded-md border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-right text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => onRemove(entry.itemId)}
                  aria-label={`Remove ${item?.name ?? entry.itemId} from cart`}
                  className="shrink-0 text-slate-500 hover:text-red-400"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
