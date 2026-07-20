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
| Deploy    | Vercel / Netlify / GitHub Pages      | Automatic deploy on every push                                  |

## Folder structure

\`\`\`
src/
data/
items.json # raw data: item, recipe, workbench, type
lib/
craftingGraph.ts # pure logic: DFS, memoization, cycle detection
types.ts # shared TS types (Item, Recipe, CalcResult)
components/
ItemSelector.tsx # search/select item + desired quantity
ResultTree.tsx # displays the calculated ingredient tree
RawMaterialsList.tsx # final aggregated raw material list
App.tsx
\`\`\`

Core rule: **no graph logic inside React components**. Everything that is
pure computation lives in \`lib/craftingGraph.ts\`, testable in isolation
without rendering anything.

## Data model (\`items.json\`)

\`\`\`json
{
"Axe_Tier_00": {
"name": "Stone Axe",
"workbench": "WorkBench",
"base": false,
"ingredients": {
"Stone": 5,
"Wood": 5
}
},
"Wood": {
"name": "Wood",
"base": true,
"ingredients": {}
}
}
\`\`\`

- \`base: true\` marks a raw material (no recipe) — the DFS stopping
  condition.
- \`workbench\` is a display-only metadata field, curated manually (see
  decision below), and does not participate in the quantity calculation.
- \`ingredients\` is a map of \`item_id -> quantity per unit crafted\`.

## Algorithm (\`craftingGraph.ts\`)

### 1. Validation: cycle detection

Before any calculation, the graph is traversed with a 3-state DFS
(unvisited / in-progress / done) to make sure there's no circular
dependency. If an "in-progress" item is revisited, that's a cycle — a data
error, which shouldn't happen in valid crafting recipes.

\`\`\`ts
type DFSState = 'unvisited' | 'in_progress' | 'done';
\`\`\`

### 2. Calculation: post-order DFS with memoization

\`\`\`
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

\`\`\`

Key point: memoization is keyed by **item**, not by path in the graph —
that's what turns the complexity from exponential (naive tree) into linear
in the number of unique items (equivalent to solving in topological order).

### 3. Output

The final result is a map of \`base_item_id -> total quantity\`, plus
optionally an intermediate tree structure (so the UI can show "how many
intermediate Axes you need to craft," not just the raw materials).

## Decision: item → workbench link

Investigation into the game files showed that this link **doesn't exist in
any simple DataTable** — it's hardcoded inside each workbench's Blueprint
(\`BP_BuildObject_WorkBench_C\`, etc.), in a \`TargetTypesB\` array that isn't
feasible to extract in full via datamining within a reasonable timeframe.

**Decision:** the \`workbench\` field in \`items.json\` is filled in manually
by consulting already-curated community sources (e.g. paldb.cc), and
treated as static display metadata — it does not affect the calculation
algorithm.

## Testing

Since \`craftingGraph.ts\` is pure logic (no DOM, no React), it's covered
with direct unit tests:

- a base item returns itself
- an item with 1 recipe level sums correctly
- an item with an ingredient shared by two branches uses memoization
  (doesn't duplicate work)
- a graph with an intentional cycle triggers a validation error
