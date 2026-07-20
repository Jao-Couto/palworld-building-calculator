export interface BuildingCategory {
  typeA: string;
  typeB: string;
  uiDisplay: string;
}

/**
 * Shape shared by src/data/items.json and src/data/buildings.json entries.
 * Only `name`/`base`/`ingredients` are guaranteed - `workbench` only makes
 * sense for craftable items, `category`/`rank` only for buildings - so both
 * data sets can be merged into one lookup for the DAG walk in craftingGraph.ts.
 */
export interface Item {
  name: string;
  base: boolean;
  ingredients: Record<string, number>;
  workbench?: string | null;
  category?: BuildingCategory | null;
  rank?: number;
}

export type ItemDatabase = Record<string, Item>;

/** item_id -> total quantity needed */
export type QuantityMap = Record<string, number>;

export interface CartEntry {
  itemId: string;
  quantity: number;
}

export interface AggregateResult {
  /** Every item touched (cart entries + intermediates + raw materials), item_id -> total quantity. */
  totals: QuantityMap;
  /** base: true items only. */
  rawMaterials: QuantityMap;
  /** base: false items only (includes the cart entries themselves, if craftable). */
  intermediates: QuantityMap;
}
