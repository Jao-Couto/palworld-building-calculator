import { categoryOf, CATEGORY_CLASS } from '../lib/category';
import { mockImageUrl } from '../lib/mockImages';
import type { Item } from '../lib/types';
import { CategoryIcon } from './icons';

interface ItemThumbProps {
  id: string;
  item: Item;
  /** Box size in px. */
  size?: number;
  rounded?: string;
  className?: string;
  /** Always render the category-colored icon tile, ignoring any image. Used by
   * the calculator lists so raw + intermediate items share one visual language. */
  iconOnly?: boolean;
}

/**
 * The item's image when available (currently a mock — see mockImages.ts),
 * otherwise a category-colored tile with the category mini-icon as fallback.
 * Used at 140px in cards and ~26px in recipe/cart/result rows.
 */
export function ItemThumb({
  id,
  item,
  size = 26,
  rounded = 'rounded-md',
  className = '',
  iconOnly = false,
}: ItemThumbProps) {
  const category = categoryOf(id, item);
  const url = iconOnly ? null : mockImageUrl(id, item);
  const style = { width: size, height: size } as const;

  if (url) {
    return (
      <img
        src={url}
        alt=""
        style={style}
        className={`shrink-0 object-cover ${rounded} ${className}`}
      />
    );
  }

  return (
    <span
      style={style}
      className={`inline-flex shrink-0 items-center justify-center ${rounded} ${CATEGORY_CLASS[category]} ${className}`}
      aria-hidden="true"
    >
      <CategoryIcon category={category} size={Math.round(size * 0.58)} />
    </span>
  );
}
