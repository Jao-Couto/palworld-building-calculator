import { resolveName, UI_TEXT } from '../lib/i18n';
import type { CartEntry, ItemDatabase, Language } from '../lib/types';
import { CloseIcon } from './icons';
import { ItemThumb } from './ItemThumb';

interface CartProps {
  db: ItemDatabase;
  lang: Language;
  entries: CartEntry[];
  onChangeQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onClear: () => void;
}

export function Cart({ db, lang, entries, onChangeQuantity, onRemove, onClear }: CartProps) {
  const t = UI_TEXT[lang].cart;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">{t.heading}</h2>
        {entries.length > 0 && (
          <button type="button" onClick={onClear} className="text-xs text-text-muted hover:text-accent">
            {t.clear}
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-text-muted">{t.empty}</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => {
            const item = db[entry.itemId];
            const name = item ? resolveName(item.name, lang, entry.itemId) : entry.itemId;
            return (
              <li
                key={entry.itemId}
                className="flex items-center gap-2 rounded-lg bg-surface-2 px-2 py-1.5"
              >
                {item && <ItemThumb id={entry.itemId} item={item} size={24} />}
                <span className="min-w-0 flex-1 break-words text-sm leading-tight text-text-primary" title={name}>
                  {name}
                </span>
                <input
                  type="number"
                  min={1}
                  value={entry.quantity}
                  onChange={(e) =>
                    onChangeQuantity(entry.itemId, Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-14 shrink-0 rounded-md border border-border bg-bg px-1.5 py-0.5 text-right text-sm tabular-nums text-text-primary focus:border-accent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => onRemove(entry.itemId)}
                  aria-label={t.removeAriaLabel(name)}
                  className="shrink-0 text-text-muted hover:text-red-500"
                >
                  <CloseIcon size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
