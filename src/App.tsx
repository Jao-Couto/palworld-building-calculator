import { useMemo, useRef, useState } from 'react';
import { Cart } from './components/Cart';
import { Catalog } from './components/Catalog';
import { ItemDetailModal } from './components/ItemDetailModal';
import { ItemSelector } from './components/ItemSelector';
import { MoonIcon, SunIcon } from './components/icons';
import { ItemThumb } from './components/ItemThumb';
import { QuantityList } from './components/QuantityList';
import buildingsJson from './data/buildings.json';
import itemsJson from './data/items.json';
import { aggregateCart } from './lib/craftingGraph';
import { useFavorites, useRecentlyViewed, useTheme } from './lib/hooks';
import { LANGUAGES, resolveName, UI_TEXT } from './lib/i18n';
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

interface Toast {
  id: number;
  itemId: string;
  message: string;
}

export default function App() {
  const [view, setView] = useState<View>('calculator');
  const [section, setSection] = useState<Section>('item');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [lang, setLang] = useState<Language>('en');
  const [theme, toggleTheme] = useTheme();
  const favorites = useFavorites();
  const recent = useRecentlyViewed();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);

  const result = useMemo(() => aggregateCart(db, cart), [cart]);
  const t = UI_TEXT[lang];

  function showToast(message: string, itemId = '') {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev, { id, itemId, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 2000);
  }

  function pushToast(itemId: string, quantityAdded: number) {
    const name = db[itemId] ? resolveName(db[itemId].name, lang, itemId) : itemId;
    showToast(t.toast.added(name, quantityAdded), itemId);
  }

  function addItem(itemId: string, qty: number) {
    if (!itemId || qty <= 0) return;
    setCart((prev) => {
      const existing = prev.find((entry) => entry.itemId === itemId);
      if (existing) {
        return prev.map((entry) =>
          entry.itemId === itemId ? { ...entry, quantity: entry.quantity + qty } : entry,
        );
      }
      return [...prev, { itemId, quantity: qty }];
    });
    pushToast(itemId, qty);
  }

  function changeSection(next: Section) {
    setSection(next);
    setSelectedItemId(null);
  }

  function addSelectedToCart() {
    if (!selectedItemId) return;
    addItem(selectedItemId, quantity);
    setSelectedItemId(null);
    setQuantity(1);
  }

  function openDetails(itemId: string) {
    setDetailId(itemId);
    recent.push(itemId);
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

  const segItem = (active: boolean) =>
    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ' +
    (active ? 'bg-accent text-white' : 'bg-surface text-text-secondary hover:text-text-primary');

  return (
    <div className="min-h-screen bg-bg px-4 py-8 text-text-primary">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">{t.title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-text-secondary">{t.description}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex gap-1">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLang(l.id)}
                  className={
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors ' +
                    (lang === l.id
                      ? 'bg-accent text-white'
                      : 'bg-surface text-text-secondary hover:text-text-primary')
                  }
                >
                  {l.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t.theme.toggleAria}
              className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
              {theme === 'dark' ? t.theme.toLight : t.theme.toDark}
            </button>
          </div>
        </header>

        <div className="flex gap-2">
          {VIEW_IDS.map((id) => (
            <button key={id} type="button" onClick={() => setView(id)} className={segItem(view === id)}>
              {t.views[id]}
            </button>
          ))}
        </div>

        {view === 'catalog' ? (
          <Catalog
            db={itemsDb}
            lang={lang}
            favorites={favorites}
            recentIds={recent.ids}
            onAddToCart={addItem}
            onOpenDetails={openDetails}
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-[300px_1fr]">
            <div className="md:sticky md:top-4 md:self-start">
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
                    className={segItem(section === id)}
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
                onAddToCart={addSelectedToCart}
              />

              <div className="grid gap-6 sm:grid-cols-2">
                <QuantityList
                  db={db}
                  lang={lang}
                  title={t.results.rawMaterialsTitle}
                  quantities={result.rawMaterials}
                  emptyMessage={t.results.rawMaterialsEmpty}
                  onSelect={openDetails}
                  onToast={showToast}
                />
                <QuantityList
                  db={db}
                  lang={lang}
                  title={t.results.intermediatesTitle}
                  quantities={result.intermediates}
                  emptyMessage={t.results.intermediatesEmpty}
                  onSelect={openDetails}
                  onToast={showToast}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {detailId && (
        <ItemDetailModal
          id={detailId}
          db={db}
          lang={lang}
          isFavorite={favorites.has(detailId)}
          onToggleFavorite={favorites.toggle}
          onAddToCart={addItem}
          onClose={() => setDetailId(null)}
        />
      )}

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-lg"
          >
            {db[toast.itemId] && <ItemThumb id={toast.itemId} item={db[toast.itemId]} size={22} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
