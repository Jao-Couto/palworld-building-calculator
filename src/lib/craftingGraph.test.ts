import { describe, expect, it } from 'vitest';
import { aggregateCart, validateNoCycles } from './craftingGraph';
import type { ItemDatabase } from './types';

describe('aggregateCart', () => {
  it('returns itself as a raw material for a base item', () => {
    const db: ItemDatabase = {
      Wood: { name: { en: 'Wood', ptBR: null }, base: true, ingredients: {} },
    };

    const result = aggregateCart(db, [{ itemId: 'Wood', quantity: 5 }]);

    expect(result.rawMaterials).toEqual({ Wood: 5 });
    expect(result.intermediates).toEqual({});
  });

  it('splits raw materials and intermediates for a single recipe level', () => {
    const db: ItemDatabase = {
      Axe_Tier_00: {
        name: { en: 'Stone Axe', ptBR: null },
        workbench: 'WorkBench',
        base: false,
        ingredients: { Stone: 5, Wood: 5 },
      },
      Stone: { name: { en: 'Stone', ptBR: null }, base: true, ingredients: {} },
      Wood: { name: { en: 'Wood', ptBR: null }, base: true, ingredients: {} },
    };

    const result = aggregateCart(db, [{ itemId: 'Axe_Tier_00', quantity: 3 }]);

    expect(result.rawMaterials).toEqual({ Stone: 15, Wood: 15 });
    expect(result.intermediates).toEqual({ Axe_Tier_00: 3 });
  });

  it('rounds up to whole crafts for a batch recipe (yield > 1)', () => {
    const db: ItemDatabase = {
      // one craft yields 10 arrows, consuming 2 wood
      Arrow: {
        name: { en: 'Arrow', ptBR: null },
        base: false,
        productCount: 10,
        ingredients: { Wood: 2 },
      },
      Wood: { name: { en: 'Wood', ptBR: null }, base: true, ingredients: {} },
    };

    // asking for 1 arrow still runs a whole batch: 10 produced, 2 wood consumed
    const one = aggregateCart(db, [{ itemId: 'Arrow', quantity: 1 }]);
    expect(one.rawMaterials).toEqual({ Wood: 2 });
    expect(one.intermediates).toEqual({ Arrow: 10 });

    // 11 arrows needs 2 crafts -> 20 produced, 4 wood
    const eleven = aggregateCart(db, [{ itemId: 'Arrow', quantity: 11 }]);
    expect(eleven.rawMaterials).toEqual({ Wood: 4 });
    expect(eleven.intermediates).toEqual({ Arrow: 20 });
  });

  it('applies the batch ceil once on total demand, summed across parents', () => {
    // Both Sword and Knife consume Bolt; Bolt is crafted 10 at a time from 1 Iron.
    const db: ItemDatabase = {
      Sword: { name: { en: 'Sword', ptBR: null }, base: false, ingredients: { Bolt: 3 } },
      Knife: { name: { en: 'Knife', ptBR: null }, base: false, ingredients: { Bolt: 4 } },
      Bolt: {
        name: { en: 'Bolt', ptBR: null },
        base: false,
        productCount: 10,
        ingredients: { Iron: 1 },
      },
      Iron: { name: { en: 'Iron', ptBR: null }, base: true, ingredients: {} },
    };

    const result = aggregateCart(db, [
      { itemId: 'Sword', quantity: 1 },
      { itemId: 'Knife', quantity: 1 },
    ]);

    // Total Bolt demand = 3 + 4 = 7 -> ceil(7/10) = 1 craft -> 10 produced, 1 Iron.
    // (Rounding per-parent would wrongly give 2 crafts / 2 Iron.)
    expect(result.intermediates).toEqual({ Sword: 1, Knife: 1, Bolt: 10 });
    expect(result.rawMaterials).toEqual({ Iron: 1 });
  });

  it('reuses a memoized subtotal for an ingredient shared across branches', () => {
    // Diamond graph: Product needs PartA and PartB, both of which need Ore.
    const db: ItemDatabase = {
      Product: {
        name: { en: 'Product', ptBR: null },
        base: false,
        ingredients: { PartA: 1, PartB: 1 },
      },
      PartA: { name: { en: 'Part A', ptBR: null }, base: false, ingredients: { Ore: 2 } },
      PartB: { name: { en: 'Part B', ptBR: null }, base: false, ingredients: { Ore: 3 } },
      Ore: { name: { en: 'Ore', ptBR: null }, base: true, ingredients: {} },
    };

    const result = aggregateCart(db, [{ itemId: 'Product', quantity: 4 }]);

    // 4 * (2 + 3) Ore, computed without recomputing PartA/PartB's subtotal per path.
    expect(result.rawMaterials).toEqual({ Ore: 20 });
    expect(result.intermediates).toEqual({ Product: 4, PartA: 4, PartB: 4 });
  });

  it('combines multiple cart entries, including a crafted item requested both directly and as an ingredient', () => {
    const db: ItemDatabase = {
      Sword: { name: { en: 'Sword', ptBR: null }, base: false, ingredients: { Ingot: 3 } },
      Ingot: { name: { en: 'Ingot', ptBR: null }, base: false, ingredients: { Ore: 2 } },
      Ore: { name: { en: 'Ore', ptBR: null }, base: true, ingredients: {} },
    };

    const result = aggregateCart(db, [
      { itemId: 'Sword', quantity: 2 },
      { itemId: 'Ingot', quantity: 5 },
    ]);

    // 2 Sword * 3 Ingot = 6, plus 5 Ingot requested directly = 11 total.
    expect(result.intermediates).toEqual({ Sword: 2, Ingot: 11 });
    // 11 Ingot * 2 Ore = 22.
    expect(result.rawMaterials).toEqual({ Ore: 22 });
  });

  it('ignores cart entries with a non-positive quantity', () => {
    const db: ItemDatabase = {
      Wood: { name: { en: 'Wood', ptBR: null }, base: true, ingredients: {} },
    };

    const result = aggregateCart(db, [{ itemId: 'Wood', quantity: 0 }]);

    expect(result.totals).toEqual({});
  });

  it('returns an empty result for an empty cart', () => {
    const result = aggregateCart({}, []);
    expect(result).toEqual({ totals: {}, rawMaterials: {}, intermediates: {} });
  });
});

describe('validateNoCycles', () => {
  it('passes for an acyclic graph', () => {
    const db: ItemDatabase = {
      A: { name: { en: 'A', ptBR: null }, base: false, ingredients: { B: 1 } },
      B: { name: { en: 'B', ptBR: null }, base: true, ingredients: {} },
    };

    expect(() => validateNoCycles(db)).not.toThrow();
  });

  it('throws when a cycle is present', () => {
    const db: ItemDatabase = {
      A: { name: { en: 'A', ptBR: null }, base: false, ingredients: { B: 1 } },
      B: { name: { en: 'B', ptBR: null }, base: false, ingredients: { A: 1 } },
    };

    expect(() => validateNoCycles(db)).toThrow(/Cycle detected/);
  });
});
