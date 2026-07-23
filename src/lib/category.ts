import type { Item, Language } from './types';

/**
 * UI-level material taxonomy from the frontend-redesign spec. This is a
 * presentation grouping (drives the mini-icon + chip color), NOT the game's
 * raw EPalItemTypeA/B — it is derived heuristically from them plus item-id
 * keywords, and only affects visuals, never the crafting calculation.
 */
export type CategoryKey = 'mineral' | 'organic' | 'tech' | 'energy' | 'other';

export const CATEGORY_KEYS: CategoryKey[] = ['mineral', 'organic', 'tech', 'energy', 'other'];

export const CATEGORY_CLASS: Record<CategoryKey, string> = {
  mineral: 'cat-mineral',
  organic: 'cat-organic',
  tech: 'cat-tech',
  energy: 'cat-energy',
  other: 'cat-other',
};

/** The strong (foreground) color per category — used for inline fills like the
 * relative-quantity bars, where a CSS class can't carry a dynamic width. */
export const CATEGORY_COLOR: Record<CategoryKey, string> = {
  mineral: '#185FA5',
  organic: '#3B6D11',
  tech: '#534AB7',
  energy: '#854F0B',
  other: '#5F5E5A',
};

const CATEGORY_LABELS: Record<Language, Record<CategoryKey, string>> = {
  en: { mineral: 'Mineral', organic: 'Organic', tech: 'Tech', energy: 'Energy', other: 'Other' },
  ptBR: { mineral: 'Mineral', organic: 'Orgânico', tech: 'Tecnologia', energy: 'Energia', other: 'Outro' },
};

export function categoryLabel(key: CategoryKey, lang: Language): string {
  return CATEGORY_LABELS[lang][key];
}

// Ordered keyword rules: first match wins. Keyed off the item id (stable,
// language-independent) with a fallback to the game type tail.
const RULES: { key: CategoryKey; test: RegExp }[] = [
  { key: 'energy', test: /paldium|energy|core|electricity|electric|fuel|battery|coal|sulfur/i },
  { key: 'tech', test: /circuit|chip|electronic|parts|plasteel|polymer|carbon|refined|gear|motherboard|ic$/i },
  { key: 'mineral', test: /ingot|ore|stone|metal|iron|copper|quartz|gold|silver|crystal|sand|brick|cement|nail/i },
  {
    key: 'organic',
    test: /wood|lumber|fiber|leather|wool|cloth|bone|horn|berr|meat|egg|flour|wheat|milk|honey|mushroom|fruit|vegetable|seed|hide|pelt|fur|blood/i,
  },
];

const TYPE_HINTS: { key: CategoryKey; test: RegExp }[] = [
  { key: 'organic', test: /Food|MaterialMonster/i },
  { key: 'mineral', test: /MaterialOre/i },
  { key: 'tech', test: /MaterialProccessing|Blueprint/i },
];

export function categoryOf(id: string, item: Item): CategoryKey {
  for (const { key, test } of RULES) if (test.test(id)) return key;
  const typeB = item.category?.typeB ?? '';
  const typeA = item.category?.typeA ?? '';
  for (const { key, test } of TYPE_HINTS) if (test.test(typeB) || test.test(typeA)) return key;
  return 'other';
}

const RARITY_CLASS = ['rar-common', 'rar-uncommon', 'rar-rare', 'rar-epic', 'rar-legendary'];

/** Maps a 0-4 rarity tier to its color class; out-of-range falls back to common. */
export function rarityClass(rarity: number | null | undefined): string {
  if (rarity == null) return RARITY_CLASS[0];
  return RARITY_CLASS[rarity] ?? RARITY_CLASS[0];
}
