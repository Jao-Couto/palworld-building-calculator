"""Runs the full data pipeline end-to-end.

Chains the existing build scripts in dependency order, each via its own main():

  1. generate_bench_recipes -> src/data/bench_recipes.json   (input for items)
  2. crafting_graph         -> src/data/crafting_graph.json  (validated graph;
                                                              raises on orphan/cycle)
  3. build_items_json       -> src/data/items.json           (graph + enrichment)
  4. build_buildings_json   -> src/data/buildings.json       (graph + items.json)

If step 2 fails validation it raises, aborting the run before any stale
items.json/buildings.json is written.

The other three scripts use repo-root-relative paths, so this runner chdirs to
the repo root first - which makes `python scripts/main.py` work from anywhere.
"""

import os
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPTS_DIR.parent

sys.path.insert(0, str(SCRIPTS_DIR))  # allow `import <sibling script>`
os.chdir(REPO_ROOT)  # generate_bench_recipes/build_*.py use repo-root-relative paths

import build_buildings_json
import build_items_json
import crafting_graph
import generate_bench_recipes

STEPS = [
    ("bench recipes  (item -> crafting station)", generate_bench_recipes.main),
    ("crafting graph (validated: referential + cycle)", crafting_graph.main),
    ("items.json     (graph + enrichment)", build_items_json.main),
    ("buildings.json (graph + enrichment)", build_buildings_json.main),
]


def main():
    for i, (label, step) in enumerate(STEPS, 1):
        print(f"\n=== [{i}/{len(STEPS)}] {label} ===")
        step()
    print("\npipeline completo.")


if __name__ == "__main__":
    main()
