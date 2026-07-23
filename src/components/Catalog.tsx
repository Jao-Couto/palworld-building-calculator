import { useMemo, useState } from 'react';
import { formatQuantity } from '../lib/format';
import { rarityLabel, resolveName, UI_TEXT } from '../lib/i18n';
import type { Item, ItemDatabase, Language, LocalizedName } from '../lib/types';

interface CatalogProps {
	db: ItemDatabase;
	lang: Language;
}

type SortKey = 'name' | 'price' | 'rarity';
type SortOrder = 'asc' | 'desc';

const ALL = 'all';

interface Entry {
	id: string;
	item: Item;
	name: string;
}

function ItemCard({
	entry,
	db,
	lang,
}: {
	entry: Entry;
	db: ItemDatabase;
	lang: Language;
}) {
	const { item, name } = entry;
	const t = UI_TEXT[lang].catalog;
	const typeLabel = item.category?.uiDisplay?.[lang] ?? item.category?.typeA;
	const rarityText = rarityLabel(item.rarity, lang);
	const description = item.description
		? resolveName(item.description, lang, '')
		: '';
	const ingredientEntries = Object.entries(item.ingredients);

	return (
		<div className='flex flex-col gap-3 p-4 border rounded-lg border-slate-700 bg-slate-800/50'>
			<div>
				<h3 className='font-semibold text-slate-100'>{name}</h3>
				<div className='mt-1 flex flex-wrap gap-1.5'>
					{typeLabel && (
						<span className='rounded-full bg-slate-900 px-2 py-0.5 text-xs text-slate-300'>
							{typeLabel}
						</span>
					)}
					{rarityText && (
						<span className='rounded-full bg-slate-900 px-2 py-0.5 text-xs text-slate-300'>
							{rarityText}
						</span>
					)}
				</div>
			</div>

			{description && (
				<p className='text-sm whitespace-pre-line text-slate-400'>
					{description}
				</p>
			)}

			{item.price != null && (
				<div className='flex items-center justify-between rounded-md bg-slate-900 px-3 py-1.5 text-sm'>
					<span className='text-slate-400'>{t.price}</span>
					<span className='font-mono text-slate-100'>
						{item.price.toLocaleString()}
					</span>
				</div>
			)}

			{item.base ? (
				<div className='text-xs tracking-wide uppercase text-slate-500'>
					{t.rawMaterial}
				</div>
			) : (
				ingredientEntries.length > 0 && (
					<div>
						<div className='mb-1 text-xs font-semibold tracking-wide uppercase text-slate-400'>
							{t.recipe}
							{item.productCount && item.productCount > 1 ? (
								<span className='ml-1 font-mono normal-case text-slate-500'>
									×{item.productCount}
								</span>
							) : null}
						</div>
						<ul className='space-y-1 text-sm'>
							{ingredientEntries.map(([ingredientId, quantity]) => (
								<li
									key={ingredientId}
									className='flex items-center justify-between'>
									<span className='text-slate-300'>
										{resolveName(db[ingredientId]?.name, lang, ingredientId)}
									</span>
									<span className='font-mono text-slate-400'>
										{formatQuantity(quantity)}
									</span>
								</li>
							))}
						</ul>
					</div>
				)
			)}
		</div>
	);
}

export function Catalog({ db, lang }: CatalogProps) {
	const t = UI_TEXT[lang].catalog;
	const [query, setQuery] = useState('');
	const [typeFilter, setTypeFilter] = useState<string>(ALL);
	const [rarityFilter, setRarityFilter] = useState<string>(ALL);
	const [sortKey, setSortKey] = useState<SortKey>('name');
	const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

	const entries = useMemo<Entry[]>(
		() =>
			Object.entries(db).map(([id, item]) => ({
				id,
				item,
				name: resolveName(item.name, lang, id),
			})),
		[db, lang],
	);

	const typeOptions = useMemo(() => {
		const values = new Map<string, LocalizedName>();
		for (const { item } of entries) {
			if (item.category?.typeA)
				values.set(
					item.category.typeA,
					item.category.uiDisplay ?? { en: '', ptBR: '' },
				);
		}
		return Array.from(values.entries()).sort(
			(a, b) => a[1].en?.localeCompare(b[1].en ?? '') ?? 0,
		);
	}, [entries, lang]);

	console.log(typeOptions);

	const rarityOptions = useMemo(() => {
		const values = new Set<number>();
		for (const { item } of entries) {
			if (item.rarity != null) values.add(item.rarity);
		}
		return Array.from(values).sort((a, b) => a - b);
	}, [entries]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return entries.filter(({ id, item, name }) => {
			if (q && !name.toLowerCase().includes(q) && !id.toLowerCase().includes(q))
				return false;
			if (typeFilter !== ALL && item.category?.typeA !== typeFilter)
				return false;
			if (rarityFilter !== ALL && String(item.rarity ?? '') !== rarityFilter)
				return false;
			return true;
		});
	}, [entries, query, typeFilter, rarityFilter]);

	const sorted = useMemo(() => {
		const factor = sortOrder === 'asc' ? 1 : -1;
		return [...filtered].sort((a, b) => {
			if (sortKey === 'price')
				return factor * ((a.item.price ?? 0) - (b.item.price ?? 0));
			if (sortKey === 'rarity')
				return factor * ((a.item.rarity ?? 0) - (b.item.rarity ?? 0));
			return factor * a.name.localeCompare(b.name);
		});
	}, [filtered, sortKey, sortOrder]);

	const selectClassName =
		'w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus:border-sky-500 focus:outline-none';
	const labelClassName = 'mb-1 block text-sm font-medium text-slate-300';

	return (
		<div className='space-y-6'>
			<div className='grid gap-4 p-4 border rounded-lg border-slate-700 bg-slate-800/50 sm:grid-cols-2 lg:grid-cols-4'>
				<div>
					<label htmlFor='catalog-search' className={labelClassName}>
						{t.searchLabel}
					</label>
					<input
						id='catalog-search'
						type='text'
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder={t.searchPlaceholder}
						className={selectClassName + ' placeholder-slate-500'}
					/>
				</div>

				<div>
					<label htmlFor='catalog-type' className={labelClassName}>
						{t.typeLabel}
					</label>
					<select
						id='catalog-type'
						value={typeFilter}
						onChange={(e) => setTypeFilter(e.target.value)}
						className={selectClassName}>
						<option value={ALL}>{t.all}</option>
						{typeOptions.map(([typeA, display]) => (
							<option key={typeA} value={typeA}>
								{display[lang]}
							</option>
						))}
					</select>
				</div>

				<div>
					<label htmlFor='catalog-rarity' className={labelClassName}>
						{t.rarityLabel}
					</label>
					<select
						id='catalog-rarity'
						value={rarityFilter}
						onChange={(e) => setRarityFilter(e.target.value)}
						className={selectClassName}>
						<option value={ALL}>{t.all}</option>
						{rarityOptions.map((rarity) => (
							<option key={rarity} value={String(rarity)}>
								{rarityLabel(rarity, lang)}
							</option>
						))}
					</select>
				</div>

				<div className='grid grid-cols-2 gap-2'>
					<div>
						<label htmlFor='catalog-sort' className={labelClassName}>
							{t.sortLabel}
						</label>
						<select
							id='catalog-sort'
							value={sortKey}
							onChange={(e) => setSortKey(e.target.value as SortKey)}
							className={selectClassName}>
							<option value='name'>{t.sortName}</option>
							<option value='price'>{t.sortPrice}</option>
							<option value='rarity'>{t.sortRarity}</option>
						</select>
					</div>
					<div>
						<label htmlFor='catalog-order' className={labelClassName}>
							{t.orderLabel}
						</label>
						<select
							id='catalog-order'
							value={sortOrder}
							onChange={(e) => setSortOrder(e.target.value as SortOrder)}
							className={selectClassName}>
							<option value='asc'>{t.orderAsc}</option>
							<option value='desc'>{t.orderDesc}</option>
						</select>
					</div>
				</div>
			</div>

			{sorted.length === 0 ? (
				<p className='text-sm text-slate-500'>{t.noResults}</p>
			) : (
				<div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
					{sorted.map((entry) => (
						<ItemCard key={entry.id} entry={entry} db={db} lang={lang} />
					))}
				</div>
			)}
		</div>
	);
}
