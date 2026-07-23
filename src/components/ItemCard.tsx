import { useState } from 'react';
import { categoryOf, CATEGORY_CLASS, rarityClass } from '../lib/category';
import { formatQuantity } from '../lib/format';
import { rarityLabel, resolveName, UI_TEXT } from '../lib/i18n';
import type { Item, ItemDatabase, Language } from '../lib/types';
import { PlusIcon, StarIcon } from './icons';
import { ItemThumb } from './ItemThumb';

interface ItemCardProps {
  id: string;
  item: Item;
  name: string;
  db: ItemDatabase;
  lang: Language;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (id: string, quantity: number) => void;
  onOpenDetails: (id: string) => void;
}

export function ItemCard({
  id,
  item,
  name,
  db,
  lang,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  onOpenDetails,
}: ItemCardProps) {
  const t = UI_TEXT[lang];
  const [qty, setQty] = useState(1);

  const category = categoryOf(id, item);
  const typeLabel = item.category?.uiDisplay?.[lang] ?? item.category?.typeA?.split('::').pop();
  const rarityText = rarityLabel(item.rarity, lang);
  const description = item.description ? resolveName(item.description, lang, '') : '';
  const ingredientEntries = Object.entries(item.ingredients);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-shadow hover:shadow-md">
      {/* Image box */}
      <button
        type="button"
        onClick={() => onOpenDetails(id)}
        aria-label={t.card.openDetails}
        className="relative flex h-36 items-center justify-center bg-surface-2"
      >
        <ItemThumb id={id} item={item} size={88} rounded="rounded-xl" />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          {rarityText && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${rarityClass(item.rarity)}`}>
              {rarityText}
            </span>
          )}
          {typeLabel && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_CLASS[category]}`}>
              {typeLabel}
            </span>
          )}
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(id);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(id);
            }
          }}
          aria-label={isFavorite ? t.card.unfavorite : t.card.favorite}
          aria-pressed={isFavorite}
          className={
            'absolute right-2 top-2 rounded-full p-1.5 transition-colors ' +
            (isFavorite ? 'text-accent' : 'text-text-muted hover:text-accent')
          }
        >
          <StarIcon size={18} filled={isFavorite} />
        </span>
      </button>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <button type="button" onClick={() => onOpenDetails(id)} className="text-left">
          <h3 className="font-display text-lg font-semibold leading-tight text-text-primary hover:text-accent">
            {name}
          </h3>
        </button>

        {description && <p className="clamp-2 text-sm text-text-secondary">{description}</p>}

        <div className="mt-1 border-t border-border pt-2">
          {item.price != null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">{t.catalog.price}</span>
              <span className="font-mono tabular-nums text-text-primary">
                {item.price.toLocaleString()}
              </span>
            </div>
          )}

          {item.base ? (
            <div className="mt-2 text-xs font-medium uppercase tracking-wide text-text-muted">
              {t.catalog.rawMaterial}
            </div>
          ) : (
            ingredientEntries.length > 0 && (
              <div className="mt-2">
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {t.catalog.recipe}
                  {item.productCount && item.productCount > 1 ? (
                    <span className="ml-1 font-mono normal-case text-text-muted">
                      ×{item.productCount}
                    </span>
                  ) : null}
                </div>
                <ul className="space-y-1.5">
                  {ingredientEntries.map(([ingredientId, quantity]) => {
                    const ing = db[ingredientId];
                    return (
                      <li key={ingredientId} className="flex items-center gap-2">
                        {ing && <ItemThumb id={ingredientId} item={ing} size={26} />}
                        <span className="flex-1 truncate text-sm text-text-primary">
                          {ing ? resolveName(ing.name, lang, ingredientId) : ingredientId}
                        </span>
                        <span className="font-mono text-sm tabular-nums text-text-secondary">
                          ×{formatQuantity(quantity)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )
          )}
        </div>

        {/* Footer: quantity multiplier + add to cart */}
        <div className="mt-auto flex items-center gap-2 pt-3">
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            aria-label={t.card.quantity}
            className="h-9 w-14 rounded-lg border border-border bg-bg px-2 text-right text-sm tabular-nums text-text-primary focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onAddToCart(id, qty)}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent text-sm font-medium text-white transition-colors hover:bg-accent2"
          >
            <PlusIcon size={16} />
            {t.card.addToCart}
          </button>
        </div>
      </div>
    </div>
  );
}
