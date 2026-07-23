"""Single source of truth for the Palworld crafting dependency graph.

This module owns the parts of the data pipeline that were previously
duplicated across scripts/build_items_json.py, scripts/build_buildings_json.py
and the ETL validation notebooks:

- sentinel ("None") and casing normalization of raw ids
- construction of the item ingredient graph (normalized "per 1 unit produced")
- construction of the building material graph
- referential validation (every referenced id resolves to a known item)
- cycle validation (3-state DFS, same rule as src/lib/craftingGraph.ts)

`build_and_validate()` returns the validated graph and RAISES on any orphan
or cycle, so the build fails early instead of shipping broken data. `main()`
writes it to src/data/crafting_graph.json, which the build_*.py scripts then
consume for the graph, adding only display enrichment (names, descriptions,
category, price, rarity, workbench) on top.
"""

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

ROOT = REPO_ROOT / "data/Pal/Content"
PAL = ROOT / "Pal"
ITEM_DT = PAL / "DataTable/Item/DT_ItemDataTable_Common.json"
RECIPE_DT = PAL / "DataTable/Item/DT_ItemRecipeDataTable_Common.json"
BUILDOBJECT_DT = PAL / "DataTable/MapObject/Building/DT_BuildObjectDataTable_Common.json"

OUTPUT_PATH = REPO_ROOT / "src/data/crafting_graph.json"

RECIPE_MATERIAL_SLOTS = 5  # DT_ItemRecipeDataTable_Common has Material1..5
BUILDING_MATERIAL_SLOTS = 4  # DT_BuildObjectDataTable_Common only has Material1..4


def load_rows(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)[0]["Rows"]


def build_resolver(items):
    """Resolve a raw Material/Product id against the real item ids.

    A handful of Material_Id values in the raw data have wrong casing
    (e.g. "cloth" instead of "Cloth"); resolve those case-insensitively
    instead of dropping them. Returns None for the "None" sentinel or an
    id that matches nothing (a true orphan, caught by validation).
    """
    items_by_lower = {item_id.lower(): item_id for item_id in items}

    def resolve_item_id(raw_id):
        if not raw_id or raw_id == "None":
            return None
        if raw_id in items:
            return raw_id
        return items_by_lower.get(raw_id.lower())

    return resolve_item_id


def build_item_graph(items, recipes, resolve):
    """item_id -> {base, productCount, ingredients{resolved_id: raw_count}}.

    The reachable set is anything craftable (a recipe product) plus anything
    used as an ingredient. Ingredient counts are the RAW per-recipe amounts
    (not normalized per unit); each craftable item also carries productCount,
    the number of units one craft yields - i.e. a craft consumes `ingredients`
    and produces `productCount` items. Base items carry no productCount. Also
    returns the list of orphan references (item_id, raw_material_id) that
    didn't resolve to any known item.
    """
    orphans = []
    craftable = {}

    for product_id, recipe in recipes.items():
        product_count = recipe.get("Product_Count") or 1
        ingredients = {}
        for i in range(1, RECIPE_MATERIAL_SLOTS + 1):
            material_id = recipe.get(f"Material{i}_Id")
            material_count = recipe.get(f"Material{i}_Count") or 0
            if not material_id or material_id == "None" or material_count == 0:
                continue
            resolved = resolve(material_id)
            if not resolved:
                orphans.append((product_id, material_id))
                continue
            ingredients[resolved] = material_count  # raw count, not normalized
        craftable[product_id] = {"productCount": product_count, "ingredients": ingredients}

    reachable = set(craftable)
    for entry in craftable.values():
        reachable.update(entry["ingredients"])

    graph = {}
    for item_id in sorted(reachable):
        if item_id in craftable:
            graph[item_id] = {
                "base": False,
                "productCount": craftable[item_id]["productCount"],
                "ingredients": craftable[item_id]["ingredients"],
            }
        else:
            graph[item_id] = {"base": True, "ingredients": {}}

    return graph, orphans


def build_building_graph(buildings, resolve):
    """building_id -> {ingredients{resolved_id: count}}.

    Building materials are not normalized: a structure always "produces" 1
    unit. Also returns orphan references (building_id, raw_material_id).
    """
    orphans = []
    graph = {}
    for building_id, building in sorted(buildings.items()):
        ingredients = {}
        for i in range(1, BUILDING_MATERIAL_SLOTS + 1):
            material_id = building.get(f"Material{i}_Id")
            material_count = building.get(f"Material{i}_Count") or 0
            if not material_id or material_id == "None" or material_count == 0:
                continue
            resolved = resolve(material_id)
            if not resolved:
                orphans.append((building_id, material_id))
                continue
            ingredients[resolved] = material_count
        graph[building_id] = {"ingredients": ingredients}
    return graph, orphans


def find_cycles(adjacency):
    """3-state DFS cycle detection, mirroring src/lib/craftingGraph.ts.

    `adjacency` maps node -> list of dependency ids. Returns a list of the
    cycles found (each as the path of node ids that closes the loop).
    """
    UNVISITED, IN_PROGRESS, DONE = 0, 1, 2
    state = {node: UNVISITED for node in adjacency}
    cycles = []

    def visit(node, path):
        state[node] = IN_PROGRESS
        path.append(node)
        for dep in adjacency.get(node, []):
            dep_state = state.get(dep, DONE)
            if dep_state == IN_PROGRESS:
                cycle_start = path.index(dep)
                cycles.append(path[cycle_start:] + [dep])
            elif dep_state == UNVISITED:
                visit(dep, path)
        path.pop()
        state[node] = DONE

    for node in adjacency:
        if state[node] == UNVISITED:
            visit(node, [])
    return cycles


def build_and_validate():
    """Build the full crafting graph and validate it.

    Raises ValueError if any referenced material is an orphan (doesn't
    resolve to a known item) or if the item graph contains a cycle.
    """
    items = load_rows(ITEM_DT)
    recipes = load_rows(RECIPE_DT)
    buildings = load_rows(BUILDOBJECT_DT)

    resolve = build_resolver(items)
    item_graph, item_orphans = build_item_graph(items, recipes, resolve)
    building_graph, building_orphans = build_building_graph(buildings, resolve)

    # Referential validation across both graphs.
    orphans = item_orphans + building_orphans
    if orphans:
        raise ValueError(f"{len(orphans)} orphan material reference(s): {orphans[:10]}")

    # Cycle validation: only the item graph can form cycles (buildings are
    # never anyone's ingredient).
    adjacency = {item_id: list(entry["ingredients"]) for item_id, entry in item_graph.items()}
    cycles = find_cycles(adjacency)
    if cycles:
        raise ValueError(f"{len(cycles)} cycle(s) in the crafting graph: {cycles[:5]}")

    base_count = sum(1 for entry in item_graph.values() if entry["base"])
    return {
        "_meta": {
            "description": (
                "Validated crafting dependency graph, generated by "
                "scripts/crafting_graph.py from the raw game DataTables. "
                "Item ingredient counts are the raw per-recipe amounts and each "
                "craftable item carries productCount (units yielded per craft) - "
                "one craft consumes 'ingredients' and produces 'productCount'. "
                "Building materials are per structure. Referential and cycle "
                "validation passed at generation time. Consumed by "
                "scripts/build_items_json.py and scripts/build_buildings_json.py."
            ),
            "counts": {
                "items": len(item_graph),
                "base": base_count,
                "craftable": len(item_graph) - base_count,
                "buildings": len(building_graph),
            },
        },
        "items": item_graph,
        "buildings": building_graph,
    }


def main():
    graph = build_and_validate()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(graph, f, indent=2, ensure_ascii=False, sort_keys=True)

    counts = graph["_meta"]["counts"]
    print(f"crafting graph written to {OUTPUT_PATH}")
    print(f"  {counts['items']} items ({counts['base']} base, {counts['craftable']} craftable)")
    print(f"  {counts['buildings']} buildings")
    print("  referential + cycle validation passed")


if __name__ == "__main__":
    main()
