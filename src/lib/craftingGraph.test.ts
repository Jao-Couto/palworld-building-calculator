import { describe, expect, it } from 'vitest';
import { aggregateCart, validateNoCycles } from './craftingGraph';
import type { ItemDatabase } from './types';

describe('aggregateCart', () => {
  it('returns itself as a raw material for a base item', () => {
    const db: ItemDatabase = {
      Wood: { name: 'Wood', base: true, ingredients: {} },
    };

    const result = aggregateCart(db, [{ itemId: 'Wood', quantity: 5 }]);

    expect(result.rawMaterials).toEqual({ Wood: 5 });
    expect(result.intermediates).toEqual({});
  });

  it('splits raw materials and intermediates for a single recipe level', () => {
    const db: ItemDatabase = {
      Axe_Tier_00: {
        name: 'Stone Axe',
        workbench: 'WorkBench',
        base: false,
        ingredients: { Stone: 5, Wood: 5 },
      },
      Stone: { name: 'Stone', base: true, ingredients: {} },
      Wood: { name: 'Wood', base: true, ingredients: {} },
    };

    const result = aggregateCart(db, [{ itemId: 'Axe_Tier_00', quantity: 3 }]);

    expect(result.rawMaterials).toEqual({ Stone: 15, Wood: 15 });
    expect(result.intermediates).toEqual({ Axe_Tier_00: 3 });
  });

  it('handles fractional per-unit ingredient quantities (batch recipes)', () => {
    const db: ItemDatabase = {
      Arrow: {
        name: 'Arrow',
        base: false,
        // recipe produces 5 arrows per craft, using 1 wood -> 0.2 wood per arrow
        ingredients: { Wood: 0.2 },
      },
      Wood: { name: 'Wood', base: true, ingredients: {} },
    };

    const result = aggregateCart(db, [{ itemId: 'Arrow', quantity: 10 }]);

    expect(result.rawMaterials).toEqual({ Wood: 2 });
    expect(result.intermediates).toEqual({ Arrow: 10 });
  });

  it('reuses a memoized subtotal for an ingredient shared across branches', () => {
    // Diamond graph: Product needs PartA and PartB, both of which need Ore.
    const db: ItemDatabase = {
      Product: {
        name: 'Product',
        base: false,
        ingredients: { PartA: 1, PartB: 1 },
      },
      PartA: { name: 'Part A', base: false, ingredients: { Ore: 2 } },
      PartB: { name: 'Part B', base: false, ingredients: { Ore: 3 } },
      Ore: { name: 'Ore', base: true, ingredients: {} },
    };

    const result = aggregateCart(db, [{ itemId: 'Product', quantity: 4 }]);

    // 4 * (2 + 3) Ore, computed without recomputing PartA/PartB's subtotal per path.
    expect(result.rawMaterials).toEqual({ Ore: 20 });
    expect(result.intermediates).toEqual({ Product: 4, PartA: 4, PartB: 4 });
  });

  it('combines multiple cart entries, including a crafted item requested both directly and as an ingredient', () => {
    const db: ItemDatabase = {
      Sword: { name: 'Sword', base: false, ingredients: { Ingot: 3 } },
      Ingot: { name: 'Ingot', base: false, ingredients: { Ore: 2 } },
      Ore: { name: 'Ore', base: true, ingredients: {} },
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
      Wood: { name: 'Wood', base: true, ingredients: {} },
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
      A: { name: 'A', base: false, ingredients: { B: 1 } },
      B: { name: 'B', base: true, ingredients: {} },
    };

    expect(() => validateNoCycles(db)).not.toThrow();
  });

  it('throws when a cycle is present', () => {
    const db: ItemDatabase = {
      A: { name: 'A', base: false, ingredients: { B: 1 } },
      B: { name: 'B', base: false, ingredients: { A: 1 } },
    };

    expect(() => validateNoCycles(db)).toThrow(/Cycle detected/);
  });
});
