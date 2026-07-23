import { categoryOf, type CategoryKey } from './category';
import type { Item } from './types';

/**
 * MOCK image provider. The generated data has no `item.imageUrl` yet (see the
 * frontend-redesign data-model gap), so this stands in until real sprites are
 * exported. It returns a deterministic inline-SVG data URI (a colored tile with
 * the item's initials) for craftable items, and `null` for raw materials — so
 * both UI paths (real `<img>` vs. category-icon fallback) are exercised.
 *
 * Replace this with the real `item.imageUrl` from the ETL output when available.
 */
const CATEGORY_HEX: Record<CategoryKey, { bg: string; fg: string }> = {
  mineral: { bg: '#E6F1FB', fg: '#185FA5' },
  organic: { bg: '#EAF3DE', fg: '#3B6D11' },
  tech: { bg: '#EEEDFE', fg: '#534AB7' },
  energy: { bg: '#FAEEDA', fg: '#854F0B' },
  other: { bg: '#F1EFE8', fg: '#5F5E5A' },
};

function initials(id: string): string {
  const cleaned = id.replace(/[_-]+/g, ' ').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '');
  return letters.toUpperCase().slice(0, 2) || '??';
}

export function mockImageUrl(id: string, item: Item): string | null {
  // A real field wins if it ever gets populated.
  if (item.imageUrl) return item.imageUrl;
  // Raw materials fall through to the category-icon fallback in the UI.
  if (item.base) return null;

  const { bg, fg } = CATEGORY_HEX[categoryOf(id, item)];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140"><rect width="140" height="140" rx="14" fill="${bg}"/><text x="70" y="70" dy=".35em" text-anchor="middle" font-family="Rajdhani, sans-serif" font-size="52" font-weight="700" fill="${fg}">${initials(id)}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
