import { resolveName } from './i18n';
import type { ItemDatabase, Language } from './types';

/**
 * A node in the recursive crafting tree shown in the item detail modal.
 * `count` is the raw amount consumed per one craft of the PARENT (null for the
 * root). `productCount` is the batch yield of this node's own recipe.
 */
export interface RecipeTreeNode {
  id: string;
  name: string;
  base: boolean;
  count: number | null;
  productCount: number;
  children: RecipeTreeNode[];
  /** true when this id already appears higher in the path (cycle guard cut). */
  truncated: boolean;
}

export function buildRecipeTree(
  db: ItemDatabase,
  id: string,
  lang: Language,
  count: number | null = null,
  path: ReadonlySet<string> = new Set(),
): RecipeTreeNode {
  const item = db[id];
  const name = item ? resolveName(item.name, lang, id) : id;
  const base = item?.base ?? true;
  const productCount = item?.productCount && item.productCount > 0 ? item.productCount : 1;

  const truncated = path.has(id);
  let children: RecipeTreeNode[] = [];
  if (item && !base && !truncated) {
    const nextPath = new Set(path).add(id);
    children = Object.entries(item.ingredients).map(([childId, childCount]) =>
      buildRecipeTree(db, childId, lang, childCount, nextPath),
    );
  }
  return { id, name, base, count, productCount, children, truncated };
}
