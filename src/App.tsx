import { useMemo, useState } from 'react';
import { Cart } from './components/Cart';
import { Catalog } from './components/Catalog';
import { ItemSelector } from './components/ItemSelector';
import { QuantityList } from './components/QuantityList';
import buildingsJson from './data/buildings.json';
import itemsJson from './data/items.json';
import { aggregateCart } from './lib/craftingGraph';
import { LANGUAGES, UI_TEXT } from './lib/i18n';
import type { CartEntry, ItemDatabase, Language } from './lib/types';

const itemsDb = itemsJson as ItemDatabase;
const buildingsDb = buildingsJson as ItemDatabase;

// Buildings can need items (e.g. a workbench needs Ingots) as ingredients, so
// the DAG walk needs both data sets merged into a single lookup.
const db: ItemDatabase = { ...itemsDb, ...buildingsDb };

const itemIds = Object.keys(itemsDb).filter((id) => !itemsDb[id].base);
const buildingIds = Object.keys(buildingsDb).filter((id) => !buildingsDb[id].base);

type Section = 'item' | 'building';
type View = 'calculator' | 'catalog';

const SECTION_IDS: Section[] = ['item', 'building'];
const VIEW_IDS: View[] = ['calculator', 'catalog'];

export default function App() {
  const [view, setView] = useState<View>('calculator');
  const [section, setSection] = useState<Section>('item');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [lang, setLang] = useState<Language>('en');

  const result = useMemo(() => aggregateCart(db, cart), [cart]);
  const t = UI_TEXT[lang];

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

  const activeSection = t.sections[section];

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t.title}</h1>
            <p className="text-sm text-slate-400">{t.description}</p>
          </div>

          <div className="flex shrink-0 gap-1">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLang(l.id)}
                className={
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors ' +
                  (lang === l.id
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700')
                }
              >
                {l.label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex gap-2">
          {VIEW_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors ' +
                (view === id
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700')
              }
            >
              {t.views[id]}
            </button>
          ))}
        </div>

        {view === 'catalog' ? (
          <Catalog db={itemsDb} lang={lang} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <div className="lg:sticky lg:top-8 lg:self-start">
              <Cart
                db={db}
                lang={lang}
                entries={cart}
                onChangeQuantity={updateCartQuantity}
                onRemove={removeFromCart}
                onClear={() => setCart([])}
              />
            </div>

            <div className="space-y-6">
              <div className="flex gap-2">
                {SECTION_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => changeSection(id)}
                    className={
                      'rounded-md px-3 py-1.5 text-sm font-medium transition-colors ' +
                      (section === id
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700')
                    }
                  >
                    {t.sections[id].labelPlural}
                  </button>
                ))}
              </div>

              <ItemSelector
                db={db}
                lang={lang}
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
                  lang={lang}
                  title={t.results.rawMaterialsTitle}
                  quantities={result.rawMaterials}
                  emptyMessage={t.results.rawMaterialsEmpty}
                />
                <QuantityList
                  db={db}
                  lang={lang}
                  title={t.results.intermediatesTitle}
                  quantities={result.intermediates}
                  emptyMessage={t.results.intermediatesEmpty}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
