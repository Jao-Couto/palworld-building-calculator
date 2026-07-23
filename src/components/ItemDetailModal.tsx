import { useEffect, useState } from 'react';
import { categoryOf, CATEGORY_CLASS, rarityClass } from '../lib/category';
import { rarityLabel, resolveName, UI_TEXT } from '../lib/i18n';
import { buildRecipeTree, type RecipeTreeNode } from '../lib/recipeTree';
import type { ItemDatabase, Language } from '../lib/types';
import { ChevronRightIcon, CloseIcon, PlusIcon, StarIcon } from './icons';
import { ItemThumb } from './ItemThumb';

interface ItemDetailModalProps {
  id: string;
  db: ItemDatabase;
  lang: Language;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (id: string, quantity: number) => void;
  onClose: () => void;
}

function TreeNode({
  node,
  db,
  lang,
  depth,
}: {
  node: RecipeTreeNode;
  db: ItemDatabase;
  lang: Language;
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const item = db[node.id];

  return (
    <li>
      <div className="flex items-center gap-2 py-1">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="text-text-muted hover:text-text-primary"
          >
            <ChevronRightIcon
              size={16}
              style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }}
            />
          </button>
        ) : (
          <span className="inline-block w-4" />
        )}
        {item && <ItemThumb id={node.id} item={item} size={24} />}
        <span className="flex-1 truncate text-sm text-text-primary">{node.name}</span>
        {node.productCount > 1 && (
          <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-text-muted">
            {UI_TEXT[lang].detail.yields(node.productCount)}
          </span>
        )}
        {node.count != null && (
          <span className="font-mono text-sm tabular-nums text-text-secondary">×{node.count}</span>
        )}
      </div>
      {hasChildren && open && (
        <ul className="ml-4 border-l border-border pl-2">
          {node.children.map((child, i) => (
            <TreeNode key={`${child.id}-${i}`} node={child} db={db} lang={lang} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ItemDetailModal({
  id,
  db,
  lang,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  onClose,
}: ItemDetailModalProps) {
  const t = UI_TEXT[lang];
  const item = db[id];
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!item) return null;

  const name = resolveName(item.name, lang, id);
  const category = categoryOf(id, item);
  const typeLabel = item.category?.uiDisplay?.[lang] ?? item.category?.typeA?.split('::').pop();
  const rarityText = rarityLabel(item.rarity, lang);
  const description = item.description ? resolveName(item.description, lang, '') : '';
  const workbench = item.workbench ? db[item.workbench] : null;
  const tree = buildRecipeTree(db, id, lang);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={name}
    >
      <div
        className="my-8 w-full max-w-lg rounded-2xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 border-b border-border p-5">
          <ItemThumb id={id} item={item} size={72} rounded="rounded-xl" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-semibold text-text-primary">{name}</h2>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
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
              {item.price != null && (
                <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium tabular-nums text-text-secondary">
                  {t.catalog.price}: {item.price.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleFavorite(id)}
              aria-label={isFavorite ? t.card.unfavorite : t.card.favorite}
              aria-pressed={isFavorite}
              className={isFavorite ? 'text-accent' : 'text-text-muted hover:text-accent'}
            >
              <StarIcon size={20} filled={isFavorite} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.detail.close}
              className="text-text-muted hover:text-text-primary"
            >
              <CloseIcon size={22} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-5 p-5">
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {t.detail.description}
            </h3>
            <p className="whitespace-pre-line text-sm text-text-secondary">
              {description || t.detail.noDescription}
            </p>
          </section>

          {workbench && (
            <section>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                {t.detail.whereToCraft}
              </h3>
              <div className="flex items-center gap-2">
                <ItemThumb id={item.workbench!} item={workbench} size={28} />
                <span className="text-sm text-text-primary">
                  {resolveName(workbench.name, lang, item.workbench!)}
                </span>
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {t.detail.craftTree}
            </h3>
            {item.base ? (
              <p className="text-sm text-text-secondary">{t.detail.noRecipe}</p>
            ) : (
              <ul>
                <TreeNode node={tree} db={db} lang={lang} depth={0} />
              </ul>
            )}
          </section>

          {/* Add to cart */}
          <div className="flex items-center gap-2 border-t border-border pt-4">
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              aria-label={t.card.quantity}
              className="h-10 w-16 rounded-lg border border-border bg-bg px-2 text-right text-sm tabular-nums text-text-primary focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onAddToCart(id, qty)}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent text-sm font-medium text-white transition-colors hover:bg-accent2"
            >
              <PlusIcon size={16} />
              {t.card.addToCart}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
