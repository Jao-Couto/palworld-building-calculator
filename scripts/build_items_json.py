"""Builds src/data/items.json for the crafting calculator.

The crafting graph itself (which items exist, whether each is base, and its
normalized ingredients) comes from src/data/crafting_graph.json, produced and
validated by scripts/crafting_graph.py. This script only adds display
enrichment on top of that validated graph:

- DT_ItemDataTable_Common (item -> TypeA/TypeB/Rarity/Price)
- DT_ItemNameText_Common (en, pt-BR) (item -> display name)
- DT_ItemDescriptionText_Common (en, pt-BR) (item -> flavor/description text)
- src/data/bench_recipes.json (item -> crafting station, display-only metadata)

Only items that are either craftable (have a recipe) or used as an ingredient
somewhere are included (that's exactly the crafting_graph.json item set), to
keep the search index limited to the actual crafting graph (matches
ARCHITECTURE.md's data model).
"""

import json
import re
from pathlib import Path

ROOT = Path("data/Pal/Content")
PAL = ROOT / "Pal"
ITEM_DT = PAL / "DataTable/Item/DT_ItemDataTable_Common.json"
CRAFTING_GRAPH = Path("src/data/crafting_graph.json")
NAMES_DT_EN = ROOT / "L10N/en/Pal/DataTable/Text/DT_ItemNameText_Common.json"
NAMES_DT_PT_BR = ROOT / "L10N/pt-BR/Pal/DataTable/Text/DT_ItemNameText_Common.json"
DESC_DT_EN = ROOT / "L10N/en/Pal/DataTable/Text/DT_ItemDescriptionText_Common.json"
DESC_DT_PT_BR = ROOT / "L10N/pt-BR/Pal/DataTable/Text/DT_ItemDescriptionText_Common.json"
PAL_NAMES_DT_EN = ROOT / "L10N/en/Pal/DataTable/Text/DT_PalNameText_Common.json"
BUILDING_NAMES_DT_EN = ROOT / "L10N/en/Pal/DataTable/Text/DT_MapObjectNameText_Common.json"
BUILDING_NAMES_DT_PT_BR = ROOT / "L10N/pt-BR/Pal/DataTable/Text/DT_MapObjectNameText_Common.json"
BENCH_RECIPES = Path("src/data/bench_recipes.json")
UI_COMMON_DT_EN = ROOT / "L10N/en/Pal/DataTable/Text/DT_UI_Common_Text_Common.json"
UI_COMMON_DT_PT_BR = ROOT / "L10N/pt-BR/Pal/DataTable/Text/DT_UI_Common_Text_Common.json"

OUTPUT_PATH = Path("src/data/items.json")

# Description strings embed game rich-text tags, e.g. "<mapObjectName id=|Factory_Hard_04|/>"
# or "<itemName id=|Wood|/>", that reference another item/building's own display name, and
# others like "<uiCommon id=|X| style=|Elem_Fire|/>" or "<characterName id=|X|/>" that reference
# data (icon styles, Pal names) this dataset doesn't include - those are stripped instead of
# shown raw to the player.
RICH_TEXT_TAG = re.compile(r"<(\w+)(?:\s+id=\|([^|]*)\|)?[^>]*/>")


def resolve_rich_text(text, item_names, building_names, pal_names, ui_common):
    def replace(match):
        tag, tag_id = match.group(1), match.group(2)
        if tag == "itemName" and tag_id:
            row = item_names.get(f"ITEM_NAME_{tag_id}")
            return row["TextData"]["LocalizedString"] if row else tag_id
        if tag == "mapObjectName" and tag_id:
            row = building_names.get(f"MAPOBJECT_NAME_{tag_id}")
            return row["TextData"]["LocalizedString"] if row else tag_id
        if tag == "characterName" and tag_id:
            row = pal_names.get(f"PAL_NAME_{tag_id}")
            return row["TextData"]["LocalizedString"] if row else tag_id
        if tag == "uiCommon" and tag_id:
            row = ui_common.get(f"{tag_id}")
            return row["TextData"]["LocalizedString"] if row else tag_id
        return ""

    return RICH_TEXT_TAG.sub(replace, text)


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main():
    items = load_json(ITEM_DT)[0]["Rows"]
    graph = load_json(CRAFTING_GRAPH)["items"]
    names_en = load_json(NAMES_DT_EN)[0]["Rows"]
    names_pt_br = load_json(NAMES_DT_PT_BR)[0]["Rows"]
    desc_en = load_json(DESC_DT_EN)[0]["Rows"]
    desc_pt_br = load_json(DESC_DT_PT_BR)[0]["Rows"]
    building_names_en = load_json(BUILDING_NAMES_DT_EN)[0]["Rows"]
    building_names_pt_br = load_json(BUILDING_NAMES_DT_PT_BR)[0]["Rows"]
    bench_recipes = load_json(BENCH_RECIPES)["items"]
    pal_names_en = load_json(PAL_NAMES_DT_EN)[0]["Rows"]
    ui_common_en = load_json(UI_COMMON_DT_EN)[0]["Rows"]
    ui_common_pt_br = load_json(UI_COMMON_DT_PT_BR)[0]["Rows"]

    def name_key_for(item_id):
        # Some items (NPC-only weapon variants, debug items, equipment tiers that
        # share one description, ...) override which text-table row to use instead
        # of the default ITEM_NAME_<item_id> - the override value is already a
        # full row key (e.g. "ITEM_NAME_NPC_WEAPON"), not just an id suffix.
        override = items.get(item_id, {}).get("OverrideName")
        return override if override and override != "None" else f"ITEM_NAME_{item_id}"

    def description_key_for(item_id):
        override = items.get(item_id, {}).get("OverrideDescription")
        return override if override and override != "None" else f"ITEM_DESC_{item_id}"

    def item_name(item_id):
        name = {
          "en": None,
          "ptBR": None,
        }
        name_key = name_key_for(item_id)
        row = names_en.get(name_key)
        if row:
            name["en"] = row["TextData"]["LocalizedString"]
        row = names_pt_br.get(name_key)
        if row:
            name["ptBR"] = row["TextData"]["LocalizedString"]
        return name

    def item_description(item_id):
        description = {
          "en": None,
          "ptBR": None,
        }
        desc_key = description_key_for(item_id)
        row = desc_en.get(desc_key)
        if row:
            description["en"] = resolve_rich_text(
                row["TextData"]["LocalizedString"], names_en, building_names_en, pal_names_en, ui_common_en
            )
        row = desc_pt_br.get(desc_key)
        if row:
            description["ptBR"] = resolve_rich_text(
                row["TextData"]["LocalizedString"], names_pt_br, building_names_pt_br, pal_names_en, ui_common_pt_br
            )
        return description

    def item_category(item_id):
        # Not every recipe Product_Id/Material_Id exists in DT_ItemDataTable_Common
        # (e.g. skin/variant items only referenced from the recipe table), so this
        # is display-only metadata and can legitimately be all-None.
        row = items.get(item_id)
        if not row:
            return {"typeA": None, "typeB": None}
        return {"typeA": row.get("TypeA"), "typeB": row.get("TypeB")}

    # The item set and its normalized ingredients come straight from the
    # validated crafting graph - this script only layers display metadata
    # (name/description/category/price/rarity/workbench) on top.
    output = {}

    for item_id, entry in graph.items():
        is_base = entry["base"]
        # Base materials are never crafted, so they have no workbench.
        bench_entry = None if is_base else bench_recipes.get(item_id)
        workbench = bench_entry["primaryBench"] if bench_entry else None
        row = items.get(item_id, {})

        item_out = {
            "name": item_name(item_id),
            "description": item_description(item_id),
            "category": item_category(item_id),
            "price": row.get("Price"),
            "rarity": row.get("Rarity"),
            "workbench": workbench,
            "base": is_base,
            "ingredients": entry["ingredients"],
        }
        # Only craftable items have a yield; ingredients are raw per-recipe
        # amounts, so the consumer needs productCount to know how many units a
        # craft produces (see scripts/crafting_graph.py).
        if not is_base:
            item_out["productCount"] = entry["productCount"]
        output[item_id] = item_out

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False, sort_keys=True)

    print(f"{len(output)} items written to {OUTPUT_PATH}")
    base_count = sum(1 for v in output.values() if v["base"])
    print(f"  {base_count} raw materials, {len(output) - base_count} craftable")


if __name__ == "__main__":
    main()
