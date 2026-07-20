"""Generates src/data/bench_recipes.json — the item -> crafting station link.

Every structure blueprint in
`data/Pal/Content/Pal/Blueprint/MapObject/BuildObject/BP_BuildObject_<Id>.json`
that is a crafting station has a `PalMapObjectItemConverterParameterComponent`
component with:

- `TargetTypesA` / `TargetTypesB`: item categories the station accepts
- `TargetRankMax`: the highest item rank it can craft

This is the real link (not an estimate) between a recipe and a crafting
station. This script reads every blueprint, builds each station's rule, cross
references it with `DT_ItemDataTable_Common` (each item's TypeA/TypeB/Rank)
and `DT_ItemRecipeDataTable_Common` (which items have a recipe), and saves the
result to `src/data/bench_recipes.json`.

Some structures (`AncientRelicRecycler`, `RepairBench`) use other components
(`PalMapObjectRecyclerParameterComponent`, `PalMapObjectRepairItemParameterComponent`)
instead of the item converter - so they correctly don't show up as a normal
crafting station.
"""

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path("data/Pal/Content")
PAL = ROOT / "Pal"
BLUEPRINT_DIR = PAL / "Blueprint/MapObject/BuildObject"
ITEM_DT = PAL / "DataTable/Item/DT_ItemDataTable_Common.json"
RECIPE_DT = PAL / "DataTable/Item/DT_ItemRecipeDataTable_Common.json"
BUILDOBJECT_DT = PAL / "DataTable/MapObject/Building/DT_BuildObjectDataTable_Common.json"
NAMES_DT = ROOT / "L10N/en/Pal/DataTable/Text/DT_MapObjectNameText_Common.json"

OUTPUT_PATH = Path("src/data/bench_recipes.json")


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# 1. Extract each crafting station's rule from its blueprint
# ---------------------------------------------------------------------------


def normalize_bench_id(raw_id, build_object_ids):
    """Fixes inconsistent blueprint filenames against the real MapObjectId.

    e.g. BP_BuildObject_Factory_Hard_4.json -> the real MapObjectId is
    "Factory_Hard_04".
    """
    if raw_id in build_object_ids:
        return raw_id
    m = re.match(r"^(.*_)(\d+)$", raw_id)
    if m:
        candidate = f"{m.group(1)}{int(m.group(2)):02d}"
        if candidate in build_object_ids:
            return candidate
    return raw_id


def find_converter_props(blueprint_json):
    for entry in blueprint_json:
        if entry.get("Type") == "PalMapObjectItemConverterParameterComponent":
            return entry.get("Properties", {})
    return None


def build_bench_rules(build_object_ids):
    bench_rules = {}
    unmatched_ids = []

    for path in sorted(BLUEPRINT_DIR.glob("BP_BuildObject_*.json")):
        raw_id = path.stem.replace("BP_BuildObject_", "")
        bench_id = normalize_bench_id(raw_id, build_object_ids)
        if bench_id not in build_object_ids:
            unmatched_ids.append(raw_id)

        props = find_converter_props(load_json(path))
        if not props or not props.get("TargetTypesB"):
            continue  # not a crafting station (or crafts anything with no category filter)

        bench_rules[bench_id] = {
            "typesA": props.get("TargetTypesA", []),
            "typesB": props.get("TargetTypesB", []),
            "rankMin": props.get("TargetRankMin", 0),
            "rankMax": props.get("TargetRankMax", 999999),
        }

    print(f"{len(bench_rules)} crafting station(s) with a category/rank rule found.")
    if unmatched_ids:
        print(
            f"Warning: {len(unmatched_ids)} file(s) with an id not found in "
            f"DT_BuildObjectDataTable_Common: {unmatched_ids}"
        )

    return bench_rules, unmatched_ids


# ---------------------------------------------------------------------------
# 2. Cross reference with items and recipes
# ---------------------------------------------------------------------------


def matching_benches(bench_rules, type_a, type_b, rank):
    matches = []
    for bench_id, rule in bench_rules.items():
        if type_a not in rule["typesA"]:
            continue
        if type_b not in rule["typesB"]:
            continue
        if not (rule["rankMin"] <= rank <= rule["rankMax"]):
            continue
        matches.append(bench_id)
    return sorted(matches, key=lambda b: bench_rules[b]["rankMax"])


def link_items_to_benches(bench_rules, items, recipes):
    item_benches = {}
    unmatched_products = []

    for product_id in recipes:
        item = items.get(product_id)
        if not item:
            unmatched_products.append(product_id)
            continue

        matches = matching_benches(
            bench_rules, item.get("TypeA"), item.get("TypeB"), item.get("Rank", 0)
        )
        if not matches:
            unmatched_products.append(product_id)
            continue

        item_benches[product_id] = {
            "primaryBench": matches[0],
            "allBenches": matches,
        }

    print(f"{len(item_benches)}/{len(recipes)} recipe(s) linked to a crafting station.")
    print(f"{len(unmatched_products)} with no matching station found.")

    return item_benches, unmatched_products


# ---------------------------------------------------------------------------
# 3. Debug: why these recipes didn't match any station
# ---------------------------------------------------------------------------
#
# Two known causes cover almost everything:
#
# 1. `Product_Id` doesn't even exist in `DT_ItemDataTable_Common` (e.g. skin/
#    variant items like `Head001_1` that only appear in the recipe table,
#    never in the item table) - with no TypeA/TypeB/Rank there's no way to
#    know the station at all.
# 2. The item exists but has a very high sentinel `Rank` (99 / 999 / 9999),
#    higher than any station's `TargetRankMax` (the real ceiling is 10, at the
#    Ancient Workbench). Within this group:
#    - `bLegalInGame = False`: cut/disabled content in 1.0 (e.g. the entire
#      "Poison/Fire" Bow/Crossbow line, MindControlDrug, SkyLightBullet) - not
#      craftable by anyone, safe to ignore.
#    - `bLegalInGame = True`: a real item (event armor like `HeadEquip0xx` /
#      `GYM_Head_*`, unique boss weapons like `Spear_QueenBee`, and rank-999
#      `SkillUnlock_*` items) that has a recipe entry but doesn't appear
#      craftable at any normal station - obtained through another path (boss
#      drop, event, Ancient Relic Recycler exchange). Worth checking the wiki
#      manually before assuming these are "not craftable".


def classify_unmatched(items, unmatched_products):
    missing_from_item_table = [pid for pid in unmatched_products if pid not in items]
    found_but_no_bench = [pid for pid in unmatched_products if pid in items]

    cut_content = [pid for pid in found_but_no_bench if not items[pid].get("bLegalInGame")]
    real_but_unmatched = [pid for pid in found_but_no_bench if items[pid].get("bLegalInGame")]

    print(f"Missing from DT_ItemDataTable_Common:  {len(missing_from_item_table)}")
    print(f"Has item, no station (bLegalInGame=False, likely cut content): {len(cut_content)}")
    print(f"Has item, no station (bLegalInGame=True, needs manual review): {len(real_but_unmatched)}")
    print()

    print("--- Grouped by (TypeA, TypeB, Rank) ---")
    combo_counter = Counter()
    combo_examples = {}
    for pid in found_but_no_bench:
        it = items[pid]
        combo = (it.get("TypeA"), it.get("TypeB"), it.get("Rank"))
        combo_counter[combo] += 1
        combo_examples.setdefault(combo, []).append(pid)

    for combo, count in sorted(combo_counter.items()):
        examples = combo_examples[combo][:4]
        print(f"{combo} -> {count} item(s). Ex: {examples}")

    print()
    print("--- Real but unmatched (bLegalInGame=True) - review on the wiki ---")
    print(real_but_unmatched)
    print()
    print("--- Cut content (bLegalInGame=False) ---")
    print(cut_content)
    print()
    print("--- Missing from the item table ---")
    print(missing_from_item_table)

    return missing_from_item_table, cut_content, real_but_unmatched


# ---------------------------------------------------------------------------
# 4. Save the result
# ---------------------------------------------------------------------------
#
# Recipes with no matching station go into `_meta.unmatchedProducts`, already
# classified by reason (`missingItemData`, `cutContent`, `needsReview`)
# instead of a flat list - so the calculator knows whether it's safe to
# ignore them or whether it needs to warn the user / review manually.


def main():
    build_object_ids = set(load_json(BUILDOBJECT_DT)[0]["Rows"].keys())
    bench_rules, _unmatched_ids = build_bench_rules(build_object_ids)

    names_rows = load_json(NAMES_DT)[0]["Rows"]

    def bench_name(bench_id):
        row = names_rows.get(f"MAPOBJECT_NAME_{bench_id}")
        return row["TextData"]["LocalizedString"] if row else bench_id

    for bench_id, rule in bench_rules.items():
        print(
            f"{bench_id:28s} ({bench_name(bench_id)}) -> "
            f"rank <= {rule['rankMax']}, {len(rule['typesB'])} categorie(s)"
        )

    items = load_json(ITEM_DT)[0]["Rows"]
    recipes = load_json(RECIPE_DT)[0]["Rows"]

    item_benches, unmatched_products = link_items_to_benches(bench_rules, items, recipes)
    missing_from_item_table, cut_content, real_but_unmatched = classify_unmatched(
        items, unmatched_products
    )

    output = {
        "_meta": {
            "description": (
                "Item->station link generated from the "
                "PalMapObjectItemConverterParameterComponent (TargetTypesA/TargetTypesB/TargetRankMax) "
                "of each structure blueprint, cross referenced with TypeA/TypeB/Rank from "
                "DT_ItemDataTable_Common. Real game data, not an estimate."
            ),
            "benches": {
                bench_id: {"name": bench_name(bench_id), **rule}
                for bench_id, rule in bench_rules.items()
            },
            "unmatchedProducts": {
                "missingItemData": missing_from_item_table,
                "cutContent": cut_content,
                "needsReview": real_but_unmatched,
            },
        },
        "items": item_benches,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print("Saved to", OUTPUT_PATH.resolve())


if __name__ == "__main__":
    main()
