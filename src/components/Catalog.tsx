import { useEffect, useMemo, useState } from 'react';
import { rarityLabel, resolveName, UI_TEXT } from '../lib/i18n';
import type { Item, ItemDatabase, Language, LocalizedName } from '../lib/types';
import { SearchIcon, StarIcon } from './icons';
import { ItemCard } from './ItemCard';
import { ItemThumb } from './ItemThumb';

interface CatalogProps {
  db: ItemDatabase;
  lang: Language;
  favorites: { has: (id: string) => boolean; toggle: (id: string) => void };
  recentIds: string[];
  onAddToCart: (id: string, quantity: number) => void;
  onOpenDetails: (id: string) => void;
}

type SortKey = 'name' | 'price' | 'rarity';
type SortOrder = 'asc' | 'desc';

const ALL = 'all';
const SUGGESTION_LIMIT = 6;

interface Entry {
  id: string;
  item: Item;
  name: string;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-full border px-3 py-1 text-sm font-medium transition-colors ' +
        (active
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-border bg-surface text-text-secondary hover:border-accent/50 hover:text-text-primary')
      }
    >
      {children}
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="h-36 animate-pulse bg-surface-2" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-2/3 animate-pulse rounded bg-surface-2" />
        <div className="h-3 w-full animate-pulse rounded bg-surface-2" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-surface-2" />
        <div className="h-9 w-full animate-pulse rounded-lg bg-surface-2" />
      </div>
    </div>
  );
}

export function Catalog({ db, lang, favorites, recentIds, onAddToCart, onOpenDetails }: CatalogProps) {
  const t = UI_TEXT[lang].catalog;
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [rarityFilter, setRarityFilter] = useState<string>(ALL);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ~200ms debounce for the query that drives filtering + suggestions.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(handle);
  }, [query]);
  const pending = query !== debouncedQuery;

  const entries = useMemo<Entry[]>(
    () => Object.entries(db).map(([id, item]) => ({ id, item, name: resolveName(item.name, lang, id) })),
    [db, lang],
  );

  const typeOptions = useMemo(() => {
    const values = new Map<string, LocalizedName>();
    for (const { item } of entries) {
      if (item.category?.typeA)
        values.set(item.category.typeA, item.category.uiDisplay ?? { en: '', ptBR: '' });
    }
    return Array.from(values.entries()).sort((a, b) => (a[1].en ?? '').localeCompare(b[1].en ?? ''));
  }, [entries]);

  const rarityOptions = useMemo(() => {
    const values = new Set<number>();
    for (const { item } of entries) if (item.rarity != null) values.add(item.rarity);
    return Array.from(values).sort((a, b) => a - b);
  }, [entries]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return entries
      .filter(({ id, name }) => name.toLowerCase().includes(q) || id.toLowerCase().includes(q))
      .slice(0, SUGGESTION_LIMIT);
  }, [entries, query]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return entries.filter(({ id, item, name }) => {
      if (q && !name.toLowerCase().includes(q) && !id.toLowerCase().includes(q)) return false;
      if (typeFilter !== ALL && item.category?.typeA !== typeFilter) return false;
      if (rarityFilter !== ALL && String(item.rarity ?? '') !== rarityFilter) return false;
      if (favoritesOnly && !favorites.has(id)) return false;
      return true;
    });
  }, [entries, debouncedQuery, typeFilter, rarityFilter, favoritesOnly, favorites]);

  const sorted = useMemo(() => {
    const factor = sortOrder === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === 'price') return factor * ((a.item.price ?? 0) - (b.item.price ?? 0));
      if (sortKey === 'rarity') return factor * ((a.item.rarity ?? 0) - (b.item.rarity ?? 0));
      return factor * a.name.localeCompare(b.name);
    });
  }, [filtered, sortKey, sortOrder]);

  const recentEntries = recentIds
    .map((id) => (db[id] ? { id, item: db[id], name: resolveName(db[id].name, lang, id) } : null))
    .filter((x): x is Entry => x != null);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortOrder('asc');
    }
  }

  const filtersActive = typeFilter !== ALL || rarityFilter !== ALL || favoritesOnly || query !== '';
  const sortArrow = sortOrder === 'asc' ? ' ↑' : ' ↓';

  return (
    <div className="space-y-5">
      {recentEntries.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {t.recentTitle}
          </h2>
          <div className="flex flex-wrap gap-2">
            {recentEntries.map(({ id, item, name }) => (
              <button
                key={id}
                type="button"
                onClick={() => onOpenDetails(id)}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text-primary hover:border-accent/50"
              >
                <ItemThumb id={id} item={item} size={22} />
                <span className="max-w-[10rem] truncate">{name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
        {/* Search with autocomplete */}
        <div className="relative">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            <SearchIcon size={18} />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchLabel}
            className="w-full rounded-lg border border-border bg-bg py-2 pl-10 pr-3 text-text-primary placeholder-text-muted focus:border-accent focus:outline-none"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul
              aria-label={t.suggestionsAria}
              className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lg"
            >
              {suggestions.map(({ id, item, name }) => (
                <li key={id}>
                  <button
                    type="button"
                    // onMouseDown fires before input blur, so the click isn't lost.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onOpenDetails(id);
                      setShowSuggestions(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-2"
                  >
                    <ItemThumb id={id} item={item} size={24} />
                    <span className="truncate">{name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Type chips */}
        <div className="flex flex-wrap gap-2">
          <Chip active={typeFilter === ALL} onClick={() => setTypeFilter(ALL)}>
            {t.all}
          </Chip>
          {typeOptions.map(([typeA, display]) => (
            <Chip key={typeA} active={typeFilter === typeA} onClick={() => setTypeFilter(typeA)}>
              {display[lang] || typeA.split('::').pop()}
            </Chip>
          ))}
        </div>

        {/* Rarity + favorites + sort */}
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={rarityFilter === ALL} onClick={() => setRarityFilter(ALL)}>
            {t.rarityLabel}: {t.all}
          </Chip>
          {rarityOptions.map((rarity) => (
            <Chip
              key={rarity}
              active={rarityFilter === String(rarity)}
              onClick={() => setRarityFilter(String(rarity))}
            >
              {rarityLabel(rarity, lang)}
            </Chip>
          ))}
          <span className="mx-1 h-5 w-px bg-border" />
          <button
            type="button"
            onClick={() => setFavoritesOnly((v) => !v)}
            aria-pressed={favoritesOnly}
            className={
              'flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors ' +
              (favoritesOnly
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border bg-surface text-text-secondary hover:text-text-primary')
            }
          >
            <StarIcon size={14} filled={favoritesOnly} />
            {t.favoritesOnly}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-text-muted">{t.sortLabel}:</span>
          <Chip active={sortKey === 'name'} onClick={() => toggleSort('name')}>
            {t.sortName}
            {sortKey === 'name' ? sortArrow : ''}
          </Chip>
          <Chip active={sortKey === 'price'} onClick={() => toggleSort('price')}>
            {t.sortPrice}
            {sortKey === 'price' ? sortArrow : ''}
          </Chip>
          <Chip active={sortKey === 'rarity'} onClick={() => toggleSort('rarity')}>
            {t.sortRarity}
            {sortKey === 'rarity' ? sortArrow : ''}
          </Chip>
          <span className="ml-auto text-sm text-text-muted">{t.resultsCount(sorted.length)}</span>
          {filtersActive && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setTypeFilter(ALL);
                setRarityFilter(ALL);
                setFavoritesOnly(false);
              }}
              className="text-sm text-accent hover:text-accent2"
            >
              {t.clearFilters}
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {pending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-text-muted">{t.noResults}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map(({ id, item, name }) => (
            <ItemCard
              key={id}
              id={id}
              item={item}
              name={name}
              db={db}
              lang={lang}
              isFavorite={favorites.has(id)}
              onToggleFavorite={favorites.toggle}
              onAddToCart={onAddToCart}
              onOpenDetails={onOpenDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}
