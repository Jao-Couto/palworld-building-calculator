"""Builds src/data/buildings.json for the crafting calculator.

Combines:
- DT_BuildObjectDataTable_Common (buildable structure -> category/rank/materials)
- DT_MapObjectNameText_Common (en, pt-BR) (structure -> display name)
- DT_ItemDataTable_Common (used only to validate material ids)

Output shape mirrors src/data/items.json's Item type (name/base/ingredients),
so a structure can be fed straight into the same calculate() DAG walk as a
regular item - a building is just a node whose "recipe" always produces 1
unit and is never anyone else's ingredient.

Some building materials (e.g. crop seeds used by farm plots) are never used
as an ingredient in any item recipe, so they're absent from items.json's
reachable set. Those get added here too, as base:true leaf entries, so a
consumer that merges items.json + buildings.json always has every ingredient
id covered.
"""

import json
from pathlib import Path

ROOT = Path("data/Pal/Content")
PAL = ROOT / "Pal"
ITEM_DT = PAL / "DataTable/Item/DT_ItemDataTable_Common.json"
BUILDOBJECT_DT = PAL / "DataTable/MapObject/Building/DT_BuildObjectDataTable_Common.json"
BUILDING_NAMES_DT_EN = ROOT / "L10N/en/Pal/DataTable/Text/DT_MapObjectNameText_Common.json"
BUILDING_NAMES_DT_PT_BR = ROOT / "L10N/pt-BR/Pal/DataTable/Text/DT_MapObjectNameText_Common.json"
ITEM_NAMES_DT_EN = ROOT / "L10N/en/Pal/DataTable/Text/DT_ItemNameText_Common.json"
ITEM_NAMES_DT_PT_BR = ROOT / "L10N/pt-BR/Pal/DataTable/Text/DT_ItemNameText_Common.json"

OUTPUT_PATH = Path("src/data/buildings.json")

MATERIAL_SLOTS = 4  # DT_BuildObjectDataTable_Common only has Material1..4


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main():
    items = load_json(ITEM_DT)[0]["Rows"]
    buildings = load_json(BUILDOBJECT_DT)[0]["Rows"]
    building_names_en = load_json(BUILDING_NAMES_DT_EN)[0]["Rows"]
    building_names_pt = load_json(BUILDING_NAMES_DT_PT_BR)[0]["Rows"]
    item_names_en = load_json(ITEM_NAMES_DT_EN)[0]["Rows"]
    item_names_pt = load_json(ITEM_NAMES_DT_PT_BR)[0]["Rows"]

    # A handful of Material_Id values in the raw data have wrong casing
    # (e.g. "cloth" instead of "Cloth") - resolve case-insensitively instead
    # of dropping them, same as scripts/build_items_json.py.
    items_by_lower = {item_id.lower(): item_id for item_id in items}

    def resolve_item_id(raw_id):
        if raw_id in items:
            return raw_id
        return items_by_lower.get(raw_id.lower())

    def building_name(building_id):
        name = {
          "en": None,
          "ptBR": None,
        }
        row = building_names_en.get(f"MAPOBJECT_NAME_{building_id}")
        if row:
            name["en"] = row["TextData"]["LocalizedString"]
        row = building_names_pt.get(f"MAPOBJECT_NAME_{building_id}")
        if row:
            name["ptBR"] = row["TextData"]["LocalizedString"]
        return name

    def item_name(item_id):
        name = {
          "en": None,
          "ptBR": None,
        }
        row = item_names_en.get(f"ITEM_NAME_{item_id}")
        if row:
            name["en"] = row["TextData"]["LocalizedString"]
        row = item_names_pt.get(f"ITEM_NAME_{item_id}")
        if row:
            name["ptBR"] = row["TextData"]["LocalizedString"]
        return name

    output = {}
    skipped_unknown_id = []
    referenced_ingredient_ids = set()

    for building_id, building in sorted(buildings.items()):
        ingredients = {}
        for i in range(1, MATERIAL_SLOTS + 1):
            material_id = building.get(f"Material{i}_Id")
            material_count = building.get(f"Material{i}_Count") or 0
            if not material_id or material_id == "None" or material_count == 0:
                continue
            resolved_id = resolve_item_id(material_id)
            if not resolved_id:
                skipped_unknown_id.append((building_id, material_id))
                continue
            ingredients[resolved_id] = material_count
            referenced_ingredient_ids.add(resolved_id)

        output[building_id] = {
            "name": building_name(building_id),
            "category": {
                "typeA": building.get("TypeA"),
                "typeB": building.get("TypeB"),
                "uiDisplay": building.get("TypeUIDisplay"),
            },
            "rank": building.get("Rank", 0),
            "base": False,
            "ingredients": ingredients,
        }

    # Materials that are never craftable and never used as an ingredient in
    # any item recipe (e.g. crop seeds) don't exist in items.json's reachable
    # set. Add them here as base:true leaves so nothing referenced above is
    # left dangling once a consumer merges items.json + buildings.json.
    items_json_ids = set(json.loads((Path("src/data/items.json")).read_text(encoding="utf-8")))
    extra_leaf_ids = sorted(referenced_ingredient_ids - items_json_ids - output.keys())
    for item_id in extra_leaf_ids:
        output[item_id] = {
            "name": item_name(item_id),
            "category": None,
            "rank": items.get(item_id, {}).get("Rank", 0),
            "base": True,
            "ingredients": {},
        }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False, sort_keys=True)

    print(f"{len(output)} entries written to {OUTPUT_PATH} ({len(buildings)} buildings, {len(extra_leaf_ids)} extra leaf material(s))")
    no_materials = sum(1 for v in output.values() if v["base"] is False and not v["ingredients"])
    if no_materials:
        print(f"  {no_materials} building(s) have no materials at all (decorative/free to place?)")
    if extra_leaf_ids:
        print(f"  extra leaf materials added: {extra_leaf_ids}")
    if skipped_unknown_id:
        print(
            f"  {len(skipped_unknown_id)} ingredient reference(s) skipped (unknown item id): "
            f"{skipped_unknown_id[:10]}"
        )


if __name__ == "__main__":
    main()
