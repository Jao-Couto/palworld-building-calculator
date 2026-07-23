import type { SVGProps } from 'react';
import type { CategoryKey } from '../lib/category';

/**
 * Small inline-SVG icon set (stroke = currentColor). Replaces an external icon
 * dependency (lucide-react / tabler) so the app has no extra runtime package;
 * swap for a real icon library later if desired. Icons inherit size via
 * `width`/`height` (default 20) and color via `currentColor`.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...props }: IconProps): IconProps {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...props,
  };
}

export const GemIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 3h12l4 6-10 12L2 9z" />
    <path d="M2 9h20M12 3l4 6-4 12M12 3L8 9l4 12" />
  </svg>
);

export const LeafIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 16-9 0 8-4 12-9 12" />
    <path d="M4 20c2-4 5-6 9-7" />
  </svg>
);

export const CpuIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
    <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" />
    <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
  </svg>
);

export const SparklesIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l1.8 4.9L18.7 9l-4.9 1.8L12 15l-1.8-4.2L5.3 9l4.9-1.1z" />
    <path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
  </svg>
);

export const HexagonIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2.5 20 7v10l-8 4.5L4 17V7z" />
  </svg>
);

export const SunIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const MoonIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

export const StarIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17.9 6.8 19.6l1-5.8-4.3-4.1 5.9-.9z" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const CATEGORY_ICON: Record<CategoryKey, (p: IconProps) => JSX.Element> = {
  mineral: GemIcon,
  organic: LeafIcon,
  tech: CpuIcon,
  energy: SparklesIcon,
  other: HexagonIcon,
};

export function CategoryIcon({ category, ...p }: IconProps & { category: CategoryKey }) {
  const Icon = CATEGORY_ICON[category];
  return <Icon {...p} />;
}
