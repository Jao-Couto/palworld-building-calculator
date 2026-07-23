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

/**
 * Topological order (each item before its ingredients) of every node reachable
 * from `seeds`, via post-order DFS reversed. The graph is a validated DAG, so
 * this always terminates; reachability keeps it to just the items the cart
 * actually touches. Processing in this order guarantees a craftable item's
 * demand is final (every consumer above it has already contributed) before we
 * decide how many batches to craft.
 */
function reachableTopoOrder(db: ItemDatabase, seeds: string[]): string[] {
  const visited = new Set<string>();
  const postOrder: string[] = [];

  function visit(itemId: string): void {
    if (visited.has(itemId)) return;
    visited.add(itemId);
    const item = db[itemId];
    if (item && !item.base) {
      for (const ingredientId of Object.keys(item.ingredients)) {
        visit(ingredientId);
      }
    }
    postOrder.push(itemId);
  }

  for (const seed of seeds) visit(seed);
  return postOrder.reverse();
}

/**
 * Aggregates a cart (multiple items/buildings, each with its own quantity)
 * into total per-item quantities, split into raw materials (base: true) and
 * intermediates (base: false - includes the cart entries themselves).
 *
 * Crafting is batched: a craft yields `productCount` units at once, so to
 * satisfy a demand of `d` units you run `ceil(d / productCount)` crafts, each
 * consuming the full raw `ingredients`. Because the number of crafts depends
 * on the TOTAL demand for an item (summed across every parent that needs it),
 * demand is aggregated top-down in topological order and the ceil is applied
 * once per item - not per path. Intermediates report the quantity actually
 * produced (`crafts * productCount`), which can exceed what was requested
 * (leftover from the last batch).
 */
export function aggregateCart(db: ItemDatabase, cart: CartEntry[]): AggregateResult {
  const demand: QuantityMap = {};
  const seeds: string[] = [];
  for (const { itemId, quantity } of cart) {
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    demand[itemId] = (demand[itemId] ?? 0) + quantity;
    seeds.push(itemId);
  }

  const produced: QuantityMap = {};
  for (const itemId of reachableTopoOrder(db, seeds)) {
    const needed = demand[itemId] ?? 0;
    if (needed <= 0) continue;
    const item = db[itemId];
    if (!item || item.base) continue; // raw material: `demand` is its consumed total

    const productCount = item.productCount && item.productCount > 0 ? item.productCount : 1;
    const crafts = Math.ceil(needed / productCount);
    produced[itemId] = crafts * productCount;
    for (const [ingredientId, rawCount] of Object.entries(item.ingredients)) {
      demand[ingredientId] = (demand[ingredientId] ?? 0) + crafts * rawCount;
    }
  }

  const totals: QuantityMap = {};
  const rawMaterials: QuantityMap = {};
  const intermediates: QuantityMap = {};

  for (const itemId of new Set([...Object.keys(demand), ...Object.keys(produced)])) {
    const item = db[itemId];
    if (!item || item.base) {
      const quantity = demand[itemId] ?? 0;
      if (quantity <= 0) continue;
      rawMaterials[itemId] = quantity;
      totals[itemId] = quantity;
    } else {
      const quantity = produced[itemId] ?? 0;
      if (quantity <= 0) continue;
      intermediates[itemId] = quantity;
      totals[itemId] = quantity;
    }
  }

  return { totals, rawMaterials, intermediates };
}
