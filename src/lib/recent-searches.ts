const limit = 5;

const storageKey = (lang: string): string => `recent-searches:${lang}`;

export const getRecentSearches = (lang: string): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(lang));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
      .slice(0, limit);
  } catch {
    return [];
  }
};

export const addRecentSearch = (lang: string, term: string): void => {
  const value = term.trim();
  if (typeof window === 'undefined' || value === '') return;
  const next = [value, ...getRecentSearches(lang).filter((item) => item !== value)].slice(0, limit);
  try {
    window.localStorage.setItem(storageKey(lang), JSON.stringify(next));
  } catch {
    return;
  }
};

export const clearRecentSearches = (lang: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(lang));
  } catch {
    return;
  }
};
