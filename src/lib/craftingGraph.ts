import type { AggregateResult, CartEntry, ItemDatabase, QuantityMap } from './types';

type DFSState = 'unvisited' | 'in_progress' | 'done';

/**
 * Walks the whole item database with a 3-state DFS to make sure there's no
 * circular dependency (e.g. A needs B needs A). A valid crafting recipe set
 * should never have one - if this throws, that's a data error.
 */
export function validateNoCycles(db: ItemDatabase): void {
  const state = new Map<string, DFSState>();

  function visit(itemId: string, path: string[]): void {
    const current = state.get(itemId) ?? 'unvisited';
    if (current === 'done') return;
    if (current === 'in_progress') {
      throw new Error(`Cycle detected in crafting graph: ${[...path, itemId].join(' -> ')}`);
    }

    state.set(itemId, 'in_progress');
    const item = db[itemId];
    if (item) {
      for (const ingredientId of Object.keys(item.ingredients)) {
        visit(ingredientId, [...path, itemId]);
      }
    }
    state.set(itemId, 'done');
  }

  for (const itemId of Object.keys(db)) {
    visit(itemId, []);
  }
}

function mergeInto(target: QuantityMap, source: QuantityMap, multiplier: number): void {
  for (const [itemId, quantity] of Object.entries(source)) {
    target[itemId] = (target[itemId] ?? 0) + quantity * multiplier;
  }
}

/**
 * Total quantity of every item (itself plus every ingredient, however deep)
 * needed to produce exactly 1 unit of itemId, memoized per item id (not per
 * path in the graph). That's what keeps this linear in the number of unique
 * items instead of exponential in graphs with many converging paths -
 * equivalent to solving in topological order, and what lets multiple cart
 * entries share the same memoization cache.
 */
function totalUnitsForOne(
  db: ItemDatabase,
  itemId: string,
  cache: Map<string, QuantityMap>,
): QuantityMap {
  const cached = cache.get(itemId);
  if (cached) return cached;

  const item = db[itemId];
  const result: QuantityMap = { [itemId]: 1 };

  if (item && !item.base) {
    for (const [ingredientId, qtyPerUnit] of Object.entries(item.ingredients)) {
      mergeInto(result, totalUnitsForOne(db, ingredientId, cache), qtyPerUnit);
    }
  }

  cache.set(itemId, result);
  return result;
}

/**
 * Aggregates a cart (multiple items/buildings, each with its own quantity)
 * into total per-item quantities, split into raw materials (base: true) and
 * intermediates (base: false - includes the cart entries themselves, so a
 * crafted item requested directly and also needed as an ingredient elsewhere
 * shows its true combined total).
 */
export function aggregateCart(db: ItemDatabase, cart: CartEntry[]): AggregateResult {
  const cache = new Map<string, QuantityMap>();
  const totals: QuantityMap = {};

  for (const { itemId, quantity } of cart) {
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    mergeInto(totals, totalUnitsForOne(db, itemId, cache), quantity);
  }

  const rawMaterials: QuantityMap = {};
  const intermediates: QuantityMap = {};

  for (const [itemId, quantity] of Object.entries(totals)) {
    const item = db[itemId];
    if (!item || item.base) {
      rawMaterials[itemId] = quantity;
    } else {
      intermediates[itemId] = quantity;
    }
  }

  return { totals, rawMaterials, intermediates };
}
