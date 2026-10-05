import type { Lang } from '../i18n/ui';
import { localePath } from '../i18n/utils';
import type { SearchDoc } from './search';

const cache = new Map<Lang, Promise<SearchDoc[]>>();

/** Fetches (once per language) the build-time search index. */
export const loadSearchDocs = (lang: Lang): Promise<SearchDoc[]> => {
  let pending = cache.get(lang);
  if (pending === undefined) {
    pending = fetch(localePath(lang, 'search-index.json'))
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load search index: ${response.status}`);
        return response.json() as Promise<{ docs: SearchDoc[] }>;
      })
      .then((payload) => payload.docs);
    cache.set(lang, pending);
    pending.catch(() => cache.delete(lang));
  }
  return pending;
};

let fuseModule: Promise<typeof import('fuse.js')> | undefined;

export const loadFuse = (): Promise<typeof import('fuse.js')> =>
  (fuseModule ??= import('fuse.js'));
