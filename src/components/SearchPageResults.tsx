import { useEffect, useMemo, useState } from 'react';
import type { Lang } from '../i18n/ui';
import { useTranslations } from '../i18n/utils';
import { createSearchEngine, type SearchDoc } from '../lib/search';
import { loadSearchDocs } from '../lib/search-client';
import { useSearchQuery } from '../lib/search-store';
import { addRecentSearch } from '../lib/recent-searches';
import SearchOption from './SearchOption';

interface Props {
  lang: Lang;
}

export default function SearchPageResults({ lang }: Props) {
  const t = useTranslations(lang);
  const query = useSearchQuery();
  const [docs, setDocs] = useState<SearchDoc[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSearchDocs(lang)
      .then((loaded) => {
        if (!cancelled) setDocs(loaded);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const engine = useMemo(() => (docs ? createSearchEngine(docs) : null), [docs]);

  const hits = useMemo(() => {
    if (!engine || query.trim() === '') return [];
    return engine.search(query);
  }, [engine, query]);

  const momentHits = useMemo(() => hits.filter((hit) => hit.doc.type === 'moment'), [hits]);
  const pairingHits = useMemo(() => hits.filter((hit) => hit.doc.type === 'pairing'), [hits]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const value = query.trim();
    if (value === '') url.searchParams.delete('q');
    else url.searchParams.set('q', value);
    window.history.replaceState(null, '', url);
  }, [query]);

  const trimmed = query.trim();

  if (trimmed === '') {
    return <p className="mt-4 text-sm text-muted-foreground">{t('search.hint')}</p>;
  }

  if (failed) {
    return <p className="mt-4 text-sm text-muted-foreground">{t('search.error')}</p>;
  }

  if (!engine) {
    return <p className="mt-4 text-sm text-muted-foreground">{t('search.loading')}</p>;
  }

  if (hits.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">{t('search.empty')}</p>;
  }

  return (
    <div className="mt-4 space-y-8" onClick={() => addRecentSearch(lang, trimmed)}>
      {momentHits.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-medium text-muted-foreground">
            {t('search.moments')} ({momentHits.length})
          </h2>
          <div className="space-y-0.5">
            {momentHits.map((hit) => (
              <SearchOption key={`moment-${hit.doc.id}`} hit={hit} query={trimmed} compact={false} />
            ))}
          </div>
        </section>
      )}
      {pairingHits.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-medium text-muted-foreground">
            {t('nav.pairings')} ({pairingHits.length})
          </h2>
          <div className="space-y-0.5">
            {pairingHits.map((hit) => (
              <SearchOption key={`pairing-${hit.doc.id}`} hit={hit} query={trimmed} compact={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
