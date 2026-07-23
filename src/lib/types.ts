export interface BuildingCategory {
	typeA: string | null;
	typeB: string | null;
	uiDisplay: LocalizedName;
}

export type Language = 'en' | 'ptBR';

/** Display name per language, as produced by the scripts/build_*.py data pipeline. */
export interface LocalizedName {
	en: string | null;
	ptBR: string | null;
}

/**
 * Shape shared by src/data/items.json and src/data/buildings.json entries.
 * Only `name`/`base`/`ingredients` are guaranteed - `workbench` only makes
 * sense for craftable items, `category`/`rank` only for buildings - so both
 * data sets can be merged into one lookup for the DAG walk in craftingGraph.ts.
 */
export interface Item {
	name: LocalizedName;
	base: boolean;
	/**
	 * Raw per-recipe material amounts (item_id -> count), NOT normalized per
	 * unit. One craft consumes these and yields `productCount` units.
	 */
	ingredients: Record<string, number>;
	/**
	 * Units produced by one craft (batch yield). Only craftable items have it;
	 * absent/undefined means 1. Buildings always produce 1 (field omitted).
	 */
	productCount?: number;
	workbench?: string | null;
	category?: BuildingCategory | null;
	rank?: number;
	/** Items only. */
	description?: LocalizedName;
	price?: number | null;
	rarity?: number | null;
	/**
	 * URL to the item's sprite/image. NOT present in the generated data yet
	 * (see the frontend-redesign spec's data-model gap) — currently supplied by
	 * a mock in src/lib/mockImages.ts. When real sprites are added to the ETL
	 * output this field is populated for real and the mock is dropped.
	 */
	imageUrl?: string | null;
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
