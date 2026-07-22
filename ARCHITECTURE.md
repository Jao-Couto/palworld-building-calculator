# Architecture — Crafting Calculator (Palworld)

## Overview

Static front-end app that calculates the total amount of base resources
needed to craft an item, treating the item dependency structure as a
**Directed Acyclic Graph (DAG)** — not a simple tree, since the same
ingredient can be reused across multiple recipes.

The calculation is done via **post-order DFS with per-item memoization**,
avoiding exponential recomputation in graphs with many converging paths.

## Stack

| Layer     | Choice                               | Reason                                                          |
| --------- | ------------------------------------ | --------------------------------------------------------------- |
| Framework | React + Vite + TypeScript            | Fast setup; typing catches broken item references at build time |
| Styling   | Tailwind CSS                         | Fast to build form/list UI without custom CSS                   |
| State     | Native `useState`/`useReducer`       | Small scope, no need for Redux/Zustand                          |
| Data      | Static JSON imported into the bundle | No backend; app is fully static                                 |
| Data prep | Python (pandas) + Jupyter notebooks  | ETL over the raw game DataTables, run offline                   |
| Deploy    | Vercel / Netlify / GitHub Pages      | Automatic deploy on every push                                  |

## Folder structure

```text
scripts/
  crafting_graph.py       # single source of truth: builds + validates the crafting graph
  build_items_json.py     # enriches the graph's items with names/desc/category/price/...
  build_buildings_json.py # enriches the graph's buildings with names/category/rank
  generate_bench_recipes.py # item -> crafting station, from structure blueprints
notebooks/etl/            # step-by-step ETL: profiling -> ... -> build -> output gate
src/
  data/
    crafting_graph.json   # validated intermediate artifact (the graph spine)
    items.json            # app data: craftable items + raw materials
    buildings.json        # app data: buildable structures
    bench_recipes.json    # item -> crafting station metadata
  lib/
    craftingGraph.ts      # pure logic: DFS, memoization, cycle detection
    types.ts              # shared TS types (Item, ItemDatabase, AggregateResult, ...)
    i18n.ts               # language resolution + UI strings (en / pt-BR)
    format.ts             # display formatting helpers
  components/
    ItemSelector.tsx      # search/select item + desired quantity
    Cart.tsx              # selected items + aggregated result
    QuantityList.tsx      # renders a quantity map (raw materials / intermediates)
    Catalog.tsx           # browse every item with its metadata
  App.tsx
```

Core rule: **no graph logic inside React components**. Everything that is
pure computation lives in `lib/craftingGraph.ts`, testable in isolation
without rendering anything.

## Data pipeline

The app's JSON is derived from the raw game DataTables (exported locally,
gitignored under `data/`) by an offline pipeline. The pipeline is split so
that the crafting **graph** is built and validated in exactly one place, and
the display **enrichment** happens on top of it:

```text
raw DataTables
   │
   ├─ scripts/crafting_graph.py ──▶ src/data/crafting_graph.json   (validated graph spine)
   │      · sentinel ("None") + casing normalization
   │      · item graph (ingredients normalized "per 1 unit produced")
   │      · building graph (materials per structure)
   │      · referential validation (every id resolves) — raises on orphan
   │      · cycle validation (3-state DFS) — raises on cycle
   │
   ├─ scripts/build_items_json.py     ──▶ src/data/items.json
   │      reads crafting_graph.json for the graph; adds name/description/
   │      category/price/rarity/workbench
   │
   └─ scripts/build_buildings_json.py ──▶ src/data/buildings.json
          reads crafting_graph.json for the graph; adds name/category/rank
```

`crafting_graph.py` is the **single source of truth** for the graph: the
resolve/normalize/validate logic used to be duplicated across both build
scripts and the notebooks. Because `build_and_validate()` raises on any
orphan reference or cycle, a broken export fails the build here instead of
silently shipping bad data to the app.

### ETL notebooks (`notebooks/etl/`)

Ordered, one concern per notebook. `01`-`06` are exploratory / validation;
`07` emits the artifact; `08` is the post-generation gate. `04`, `05`, `07`
and `08` import `scripts/crafting_graph.py` so the validation runs on the
exact same code the build uses.

| #   | Notebook                      | Purpose                                                              |
| --- | ----------------------------- | -------------------------------------------------------------------- |
| 1   | `01_profiling`                | schema, nulls, categories, casing/localization coverage              |
| 2   | `02_limpeza`                  | sentinel normalization, debug-item candidates, exclusion set         |
| 3   | `03_merge`                    | item ⋈ recipe ⋈ bench into one long-form ingredients frame           |
| 4   | `04_validacao_referencial`    | orphan references in recipes/buildings + dangling in output          |
| 5   | `05_validacao_ciclo`          | 3-state DFS cycle check (+ positive control)                         |
| 6   | `06_validacao_cruzada_manual` | stratified sample to eyeball against an external source (paldb.cc)   |
| 7   | `07_build_crafting_graph`     | build + validate + write `crafting_graph.json`                       |
| 8   | `08_validacao_output`         | validate generated JSON vs `types.ts`, cycles, semantic diff vs HEAD |

## Data model

`items.json` and `buildings.json` share one shape (`Item` in
`src/lib/types.ts`) so both can be merged into a single lookup for the DAG
walk. A building is just a node whose "recipe" always produces 1 unit and is
never anyone else's ingredient.

```json
{
  "Axe_Tier_00": {
    "name": { "en": "Stone Axe", "ptBR": "Machado de Pedra" },
    "description": { "en": "An axe for cutting wood.", "ptBR": "Machado para cortar lenha." },
    "category": { "typeA": "EPalItemTypeA::Weapon", "typeB": "EPalItemTypeB::WeaponMelee" },
    "price": 100,
    "rarity": 0,
    "workbench": "WorkBench",
    "base": false,
    "ingredients": { "Stone": 5, "Wood": 5 }
  },
  "Wood": {
    "name": { "en": "Wood", "ptBR": "Madeira" },
    "base": true,
    "ingredients": {}
  }
}
```

- `base: true` marks a raw material (no recipe) — the DFS stopping condition.
- `name` / `description` are per-language (`LocalizedName`, `en` / `ptBR`);
  `i18n.ts` resolves the active language and falls back to English then the
  raw id.
- `ingredients` is a map of `item_id -> quantity per unit crafted`.
- `workbench` / `category` / `price` / `rarity` / `rank` are display-only
  metadata and do **not** participate in the quantity calculation.

## Algorithm (`craftingGraph.ts`)

### 1. Validation: cycle detection

Before any calculation, the graph is traversed with a 3-state DFS
(unvisited / in-progress / done) to make sure there's no circular
dependency. If an "in-progress" item is revisited, that's a cycle — a data
error, which shouldn't happen in valid crafting recipes. The same check runs
in the data pipeline (`crafting_graph.py`) so a cycle is caught at build time
too, not only at runtime.

```ts
type DFSState = 'unvisited' | 'in_progress' | 'done';
```

### 2. Calculation: post-order DFS with memoization

```text
calculate(itemId, quantity, cache):
    if itemId is a raw material:
        return { itemId: quantity }

    if cache has itemId:
        reuse the already-computed per-unit subtotal, multiply by quantity

    subtotal = {}
    for each (ingredientId, qtyPerUnit) in itemId's recipe:
        result = calculate(ingredientId, qtyPerUnit, cache)
        mergeInto(subtotal, result)

    cache[itemId] = subtotal  // per unit, before multiplying
    return subtotal * quantity
```

Key point: memoization is keyed by **item**, not by path in the graph —
that's what turns the complexity from exponential (naive tree) into linear
in the number of unique items (equivalent to solving in topological order).

### 3. Output

The final result is a map of `base_item_id -> total quantity`, plus
optionally an intermediate tree structure (so the UI can show "how many
intermediate Axes you need to craft," not just the raw materials).

## Decision: item → workbench link

Investigation into the game files showed that this link **doesn't exist in
any simple DataTable** — it's defined per structure blueprint, in the
`PalMapObjectItemConverterParameterComponent` (`TargetTypesA` /
`TargetTypesB` / `TargetRankMax`).

**Decision:** `scripts/generate_bench_recipes.py` extracts that component from
each structure and cross-references it with `TypeA` / `TypeB` / `Rank` from
`DT_ItemDataTable_Common` to produce `bench_recipes.json` (real game data, not
an estimate). `build_items_json.py` copies the resulting `primaryBench` into
each item's `workbench` field, treated as static display metadata — it does
not affect the calculation algorithm.

## Testing

Since `craftingGraph.ts` is pure logic (no DOM, no React), it's covered
with direct unit tests:

- a base item returns itself
- an item with 1 recipe level sums correctly
- an item with an ingredient shared by two branches uses memoization
  (doesn't duplicate work)
- a graph with an intentional cycle triggers a validation error
