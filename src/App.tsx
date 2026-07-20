import { useMemo, useState } from 'react';
import { Cart } from './components/Cart';
import { ItemSelector } from './components/ItemSelector';
import { QuantityList } from './components/QuantityList';
import buildingsJson from './data/buildings.json';
import itemsJson from './data/items.json';
import { aggregateCart } from './lib/craftingGraph';
import type { CartEntry, ItemDatabase } from './lib/types';

const itemsDb = itemsJson as ItemDatabase;
const buildingsDb = buildingsJson as ItemDatabase;

// Buildings can need items (e.g. a workbench needs Ingots) as ingredients, so
// the DAG walk needs both data sets merged into a single lookup.
const db: ItemDatabase = { ...itemsDb, ...buildingsDb };

const itemIds = Object.keys(itemsDb).filter((id) => !itemsDb[id].base);
const buildingIds = Object.keys(buildingsDb).filter((id) => !buildingsDb[id].base);

type Section = 'item' | 'building';

const SECTIONS: { id: Section; label: string; placeholder: string }[] = [
  { id: 'item', label: 'Item', placeholder: 'Search a craftable item…' },
  { id: 'building', label: 'Building', placeholder: 'Search a buildable structure…' },
];

export default function App() {
  const [section, setSection] = useState<Section>('item');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<CartEntry[]>([]);

  const result = useMemo(() => aggregateCart(db, cart), [cart]);

  function changeSection(next: Section) {
    setSection(next);
    setSelectedItemId(null);
  }

  function addToCart() {
    if (!selectedItemId) return;
    setCart((prev) => {
      const existing = prev.find((entry) => entry.itemId === selectedItemId);
      if (existing) {
        return prev.map((entry) =>
          entry.itemId === selectedItemId
            ? { ...entry, quantity: entry.quantity + quantity }
            : entry,
        );
      }
      return [...prev, { itemId: selectedItemId, quantity }];
    });
    setSelectedItemId(null);
    setQuantity(1);
  }

  function updateCartQuantity(itemId: string, nextQuantity: number) {
    setCart((prev) =>
      prev.map((entry) => (entry.itemId === itemId ? { ...entry, quantity: nextQuantity } : entry)),
    );
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => prev.filter((entry) => entry.itemId !== itemId));
  }

  const activeSection = SECTIONS.find((s) => s.id === section)!;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Palworld Building Calculator</h1>
          <p className="text-sm text-slate-400">
            Add items and buildings to the cart to see the total raw materials and intermediates
            needed to craft everything, recipes expanded recursively.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="lg:sticky lg:top-8 lg:self-start">
            <Cart
              db={db}
              entries={cart}
              onChangeQuantity={updateCartQuantity}
              onRemove={removeFromCart}
              onClear={() => setCart([])}
            />
          </div>

          <div className="space-y-6">
            <div className="flex gap-2">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => changeSection(s.id)}
                  className={
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors ' +
                    (section === s.id
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700')
                  }
                >
                  {s.label}s
                </button>
              ))}
            </div>

            <ItemSelector
              db={db}
              selectableIds={section === 'item' ? itemIds : buildingIds}
              selectedItemId={selectedItemId}
              quantity={quantity}
              label={activeSection.label}
              placeholder={activeSection.placeholder}
              onSelectItem={setSelectedItemId}
              onChangeQuantity={setQuantity}
              onAddToCart={addToCart}
            />

            <div className="grid gap-6 sm:grid-cols-2">
              <QuantityList
                db={db}
                title="Raw materials needed"
                quantities={result.rawMaterials}
                emptyMessage="Add something to the cart to see the raw materials needed."
              />
              <QuantityList
                db={db}
                title="Intermediates needed"
                quantities={result.intermediates}
                emptyMessage="Add something to the cart to see the intermediates needed."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
