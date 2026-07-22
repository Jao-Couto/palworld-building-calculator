import { useMemo } from 'react';
import { formatQuantity } from '../lib/format';
import { resolveName } from '../lib/i18n';
import type { ItemDatabase, Language, QuantityMap } from '../lib/types';

interface QuantityListProps {
  db: ItemDatabase;
  lang: Language;
  title: string;
  quantities: QuantityMap;
  emptyMessage: string;
}

export function QuantityList({ db, lang, title, quantities, emptyMessage }: QuantityListProps) {
  const rows = useMemo(
    () =>
      Object.entries(quantities)
        .map(([itemId, quantity]) => {
          const item = db[itemId];
          return {
            itemId,
            name: item ? resolveName(item.name, lang, itemId) : itemId,
            quantity: formatQuantity(quantity),
          };
        })
        .sort((a, b) => b.quantity - a.quantity),
    [db, lang, quantities],
  );

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-700">
            {rows.map((row) => (
              <tr key={row.itemId}>
                <td className="py-1.5 text-slate-200">{row.name}</td>
                <td className="py-1.5 text-right font-mono text-slate-100">
                  {row.quantity.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
