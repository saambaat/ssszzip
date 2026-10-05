import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { HistoryIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Lang } from '../i18n/ui';
import { localePath, useTranslations } from '../i18n/utils';
import { createSearchEngine, type SearchDoc } from '../lib/search';
import { loadSearchDocs } from '../lib/search-client';
import { setSearchQuery, useSearchQuery } from '../lib/search-store';
import { addRecentSearch, clearRecentSearches, getRecentSearches } from '../lib/recent-searches';
import SearchOption, { searchOptionId } from './SearchOption';

interface Props {
  lang: Lang;
  mode?: 'dropdown' | 'page';
}

const overlayLimits = { moment: 5, pairing: 3 } as const;

export default function Search({ lang, mode = 'dropdown' }: Props) {
  const t = useTranslations(lang);
  const query = useSearchQuery();
  const [docs, setDocs] = useState<SearchDoc[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef(new Map<number, HTMLAnchorElement>());

  const ensureDocs = useCallback(() => {
    if (docs || failed) return;
    loadSearchDocs(lang)
      .then(setDocs)
      .catch(() => setFailed(true));
  }, [docs, failed, lang]);

  useEffect(() => {
    if (query.trim() !== '') ensureDocs();
  }, [query, ensureDocs]);

  useEffect(() => {
    setRecent(getRecentSearches(lang));
  }, [lang]);

  useEffect(() => {
    const focusInput = () => {
      const input =
        inputRef.current ?? (document.getElementById('site-search') as HTMLInputElement | null);
      input?.focus();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      const typing =
        target !== null &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        focusInput();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        focusInput();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const engine = useMemo(() => (docs ? createSearchEngine(docs) : null), [docs]);

  const hits = useMemo(() => {
    if (!engine || query.trim() === '') return [];
    return engine.search(query);
  }, [engine, query]);

  const momentHits = useMemo(() => hits.filter((hit) => hit.doc.type === 'moment'), [hits]);
  const pairingHits = useMemo(() => hits.filter((hit) => hit.doc.type === 'pairing'), [hits]);
  const visibleHits = useMemo(
    () => [
      ...momentHits.slice(0, overlayLimits.moment),
      ...pairingHits.slice(0, overlayLimits.pairing),
    ],
    [momentHits, pairingHits],
  );

  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  useEffect(() => {
    if (activeIndex < 0) return;
    optionRefs.current.get(activeIndex)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, visibleHits]);

  const trimmed = query.trim();
  const showPanel =
    mode === 'dropdown' && focused && !dismissed && (trimmed !== '' || recent.length > 0);
  const activeHit = activeIndex >= 0 ? visibleHits[activeIndex] : undefined;

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (mode !== 'dropdown' || visibleHits.length === 0) return;
      event.preventDefault();
      setActiveIndex((current) => {
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const next = current + delta;
        if (next < 0) return visibleHits.length - 1;
        if (next >= visibleHits.length) return 0;
        return next;
      });
      return;
    }

    if (event.key === 'Enter') {
      if (showPanel && activeHit) {
        event.preventDefault();
        addRecentSearch(lang, trimmed);
        window.location.assign(activeHit.doc.href);
        return;
      }
      if (mode === 'dropdown' && trimmed !== '') {
        event.preventDefault();
        addRecentSearch(lang, trimmed);
        window.location.assign(`${localePath(lang, 'search')}?q=${encodeURIComponent(trimmed)}`);
        return;
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      if (showPanel) {
        setDismissed(true);
      } else if (query !== '') {
        setSearchQuery('');
      }
    }
  };

  return (
    <div
      className="relative w-full min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
          setDismissed(false);
        }
      }}
    >
      <Input
        ref={inputRef}
        id="site-search"
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={mode === 'dropdown' ? 'search-results' : undefined}
        aria-activedescendant={activeHit ? searchOptionId(activeHit) : undefined}
        aria-autocomplete="list"
        aria-label={t('search.label')}
        placeholder={t('search.placeholder')}
        autoComplete="off"
        value={query}
        onChange={(event) => {
          setSearchQuery(event.target.value);
          setDismissed(false);
        }}
        onFocus={() => {
          setFocused(true);
          setDismissed(false);
          setRecent(getRecentSearches(lang));
          ensureDocs();
        }}
        onKeyDown={handleKeyDown}
        className="h-8 w-full rounded-full"
      />
      {showPanel && (
        <div className="absolute top-full right-0 z-50 mt-2 w-full overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg">
          {trimmed === '' ? (
            <div id="search-results" className="p-1">
              <div className="flex items-center justify-between px-2.5 pt-1.5 pb-1">
                <p className="text-xs font-medium text-muted-foreground">{t('search.recent')}</p>
                <button
                  type="button"
                  onClick={() => {
                    clearRecentSearches(lang);
                    setRecent([]);
                    inputRef.current?.focus();
                  }}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t('search.clear')}
                </button>
              </div>
              {recent.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    addRecentSearch(lang, term);
                    window.location.assign(
                      `${localePath(lang, 'search')}?q=${encodeURIComponent(term)}`,
                    );
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent/60"
                >
                  <HistoryIcon className="size-4 flex-none text-muted-foreground" />
                  <span className="truncate">{term}</span>
                </button>
              ))}
            </div>
          ) : failed ? (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">{t('search.error')}</p>
          ) : !docs ? (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">{t('search.loading')}</p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">{t('search.empty')}</p>
          ) : (
            <div
              id="search-results"
              role="listbox"
              aria-label={t('search.label')}
              onClick={() => addRecentSearch(lang, trimmed)}
              className="max-h-[min(70vh,24rem)] overflow-y-auto p-1"
            >
              {momentHits.length > 0 && (
                <div role="group" aria-label={t('search.moments')}>
                  <p className="px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
                    {t('search.moments')} ({momentHits.length})
                  </p>
                  {momentHits.slice(0, overlayLimits.moment).map((hit, index) => (
                    <SearchOption
                      key={`moment-${hit.doc.id}`}
                      hit={hit}
                      query={trimmed}
                      active={hit === activeHit}
                      option
                      optionRef={(node) => {
                        if (node) optionRefs.current.set(index, node);
                        else optionRefs.current.delete(index);
                      }}
                    />
                  ))}
                </div>
              )}
              {pairingHits.length > 0 && (
                <div role="group" aria-label={t('nav.pairings')}>
                  <p className="px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
                    {t('nav.pairings')} ({pairingHits.length})
                  </p>
                  {pairingHits.slice(0, overlayLimits.pairing).map((hit, index) => (
                    <SearchOption
                      key={`pairing-${hit.doc.id}`}
                      hit={hit}
                      query={trimmed}
                      active={hit === activeHit}
                      option
                      optionRef={(node) => {
                        const globalIndex =
                          Math.min(momentHits.length, overlayLimits.moment) + index;
                        if (node) optionRefs.current.set(globalIndex, node);
                        else optionRefs.current.delete(globalIndex);
                      }}
                    />
                  ))}
                </div>
              )}
              {hits.length > visibleHits.length && (
                <a
                  href={`${localePath(lang, 'search')}?q=${encodeURIComponent(trimmed)}`}
                  className="mt-1 block rounded-lg border-t px-2.5 py-2 text-center text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/60"
                >
                  {t('search.viewAll')} ({hits.length})
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
