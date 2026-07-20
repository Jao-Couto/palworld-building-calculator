"""Builds src/data/items.json for the crafting calculator.

Combines:
- DT_ItemDataTable_Common (item -> TypeA/TypeB, used only to enumerate known ids)
- DT_ItemRecipeDataTable_Common (item -> ingredients, normalized to "per 1 unit produced")
- DT_ItemNameText_Common (en) (item -> display name)
- src/data/bench_recipes.json (item -> crafting station, display-only metadata)

Only items that are either craftable (have a recipe) or used as an ingredient
somewhere are included, to keep the search index limited to the actual crafting
graph (matches ARCHITECTURE.md's data model).
"""

import json
from pathlib import Path

ROOT = Path("data/Pal/Content")
PAL = ROOT / "Pal"
ITEM_DT = PAL / "DataTable/Item/DT_ItemDataTable_Common.json"
RECIPE_DT = PAL / "DataTable/Item/DT_ItemRecipeDataTable_Common.json"
NAMES_DT = ROOT / "L10N/en/Pal/DataTable/Text/DT_ItemNameText_Common.json"
BENCH_RECIPES = Path("src/data/bench_recipes.json")

OUTPUT_PATH = Path("src/data/items.json")


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main():
    items = load_json(ITEM_DT)[0]["Rows"]
    recipes = load_json(RECIPE_DT)[0]["Rows"]
    names = load_json(NAMES_DT)[0]["Rows"]
    bench_recipes = load_json(BENCH_RECIPES)["items"]

    # A handful of Material_Id values in the raw recipe data have wrong casing
    # (e.g. "cloth" instead of "Cloth", "FIber" instead of "Fiber") - resolve
    # those case-insensitively against the real item ids instead of dropping them.
    items_by_lower = {item_id.lower(): item_id for item_id in items}

    def resolve_item_id(raw_id):
        if raw_id in items:
            return raw_id
        return items_by_lower.get(raw_id.lower())

    def item_name(item_id):
        row = names.get(f"ITEM_NAME_{item_id}")
        if row:
            return row["TextData"]["LocalizedString"]
        return item_id

    # Reachable set: anything craftable, plus anything used as an ingredient.
    reachable = set(recipes.keys())
    for recipe in recipes.values():
        for i in range(1, 6):
            material_id = recipe.get(f"Material{i}_Id")
            if material_id and material_id != "None":
                resolved = resolve_item_id(material_id)
                if resolved:
                    reachable.add(resolved)

    output = {}
    skipped_unknown_id = []

    for item_id in sorted(reachable):
        recipe = recipes.get(item_id)

        if not recipe:
            # Raw material: never a Product_Id, only ever an ingredient.
            output[item_id] = {
                "name": item_name(item_id),
                "workbench": None,
                "base": True,
                "ingredients": {},
            }
            continue

        product_count = recipe.get("Product_Count") or 1
        ingredients = {}
        for i in range(1, 6):
            material_id = recipe.get(f"Material{i}_Id")
            material_count = recipe.get(f"Material{i}_Count") or 0
            if not material_id or material_id == "None" or material_count == 0:
                continue
            resolved_id = resolve_item_id(material_id)
            if not resolved_id:
                skipped_unknown_id.append((item_id, material_id))
                continue
            # Normalize to "quantity needed to produce 1 unit of item_id".
            ingredients[resolved_id] = material_count / product_count

        bench_entry = bench_recipes.get(item_id)
        workbench = bench_entry["primaryBench"] if bench_entry else None

        output[item_id] = {
            "name": item_name(item_id),
            "workbench": workbench,
            "base": False,
            "ingredients": ingredients,
        }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False, sort_keys=True)

    print(f"{len(output)} items written to {OUTPUT_PATH}")
    base_count = sum(1 for v in output.values() if v["base"])
    print(f"  {base_count} raw materials, {len(output) - base_count} craftable")
    if skipped_unknown_id:
        print(f"  {len(skipped_unknown_id)} ingredient reference(s) skipped (unknown item id): {skipped_unknown_id[:10]}")


if __name__ == "__main__":
    main()
