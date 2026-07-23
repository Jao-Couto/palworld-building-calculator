import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

function readTheme(): Theme {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return 'dark';
  }
  return 'light';
}

/** Theme state synced to the `dark` class on <html> and persisted in localStorage. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return [theme, toggle];
}

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function useStoredList(key: string): [string[], (next: string[]) => void] {
  const [list, setList] = useState<string[]>(() => readList(key));
  const update = useCallback(
    (next: string[]) => {
      setList(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [key],
  );
  return [list, update];
}

export function useFavorites() {
  const [ids, setIds] = useStoredList('favorites');
  const favorites = new Set(ids);
  const toggle = useCallback(
    (id: string) => setIds(favorites.has(id) ? ids.filter((x) => x !== id) : [...ids, id]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids],
  );
  return { has: (id: string) => favorites.has(id), toggle, ids };
}

const RECENT_LIMIT = 8;

export function useRecentlyViewed() {
  const [ids, setIds] = useStoredList('recentlyViewed');
  const push = useCallback(
    (id: string) => setIds([id, ...ids.filter((x) => x !== id)].slice(0, RECENT_LIMIT)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids],
  );
  return { ids, push };
}
