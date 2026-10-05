export type SearchDocType = 'moment' | 'pairing';

export type SearchField =
  | 'title'
  | 'name'
  | 'members'
  | 'pairing'
  | 'event'
  | 'description'
  | 'tags'
  | 'type'
  | 'dates';

export interface SearchContext {
  label: string;
  values: string[];
}

export interface SearchDoc {
  id: string;
  type: SearchDocType;
  href: string;
  poster: string;
  title: string;
  subtitle?: string;
  meta?: string;
  context?: SearchContext[];
  /**
   * Searchable text, already normalized (NFKC, lowercase). Values are arrays so
   * every locale variant of a field can be indexed at once.
   */
  search: Partial<Record<SearchField, string[]>>;
}

export interface SearchHit {
  doc: SearchDoc;
  score: number;
}

export interface SearchEngine {
  search: (query: string, limit?: number) => SearchHit[];
}

const fieldWeights: Record<SearchField, number> = {
  title: 3,
  name: 3,
  members: 2.5,
  pairing: 2,
  event: 1.5,
  description: 1,
  tags: 1,
  type: 0.6,
  dates: 0.6,
};

const keys = (Object.keys(fieldWeights) as SearchField[]).map((field) => ({
  name: `search.${field}`,
  weight: fieldWeights[field],
}));

const docKey = (doc: SearchDoc): string => `${doc.type}:${doc.id}`;

const fuzzyLevel = 3;

export const normalizeQuery = (value: string): string =>
  value.normalize('NFKC').toLowerCase().trim();

/**
 * Classifies how well a token matches a doc: exact value (0), prefix (1),
 * substring (2) or fuzzy-only (3, i.e. Fuse matched it with typos).
 */
const matchLevel = (doc: SearchDoc, token: string): number => {
  let level = fuzzyLevel;
  for (const values of Object.values(doc.search)) {
    for (const value of values ?? []) {
      if (value === token) return 0;
      if (value.startsWith(token)) level = Math.min(level, 1);
      else if (value.includes(token)) level = Math.min(level, 2);
    }
  }
  return level;
};

export const createSearchEngine = (
  docs: SearchDoc[],
  Fuse: typeof import('fuse.js').default,
): SearchEngine => {
  const fuse = new Fuse(docs, {
    includeScore: true,
    threshold: 0.3,
    ignoreLocation: true,
    ignoreFieldNorm: true,
    minMatchCharLength: 1,
    keys,
  });

  return {
    search: (query, limit) => {
      const tokens = normalizeQuery(query).split(/\s+/).filter(Boolean);
      if (tokens.length === 0) return [];

      // Every token must match the same doc (AND semantics). Scores add up so
      // docs matching more tokens rank higher; match level dominates Fuse's
      // fuzzy score, which is only used to break ties within a level.
      let candidates: Map<string, SearchHit> | null = null;
      for (const token of tokens) {
        const hasDigit = /\d/.test(token);
        const matches = new Map<string, SearchHit>();
        for (const result of fuse.search(token)) {
          const level = matchLevel(result.item, token);
          // Digit tokens (years, dates, IDs) should not match other digits fuzzily.
          if (hasDigit && level === fuzzyLevel) continue;
          const score = level + (result.score ?? 1);
          matches.set(docKey(result.item), { doc: result.item, score });
        }
        if (candidates === null) {
          candidates = matches;
        } else {
          const next = new Map<string, SearchHit>();
          for (const [key, hit] of candidates) {
            const match = matches.get(key);
            if (match) next.set(key, { doc: hit.doc, score: hit.score + match.score });
          }
          candidates = next;
        }
        if (candidates.size === 0) break;
      }

      const hits = [...(candidates?.values() ?? [])].sort((a, b) => a.score - b.score);
      return limit === undefined ? hits : hits.slice(0, limit);
    },
  };
};

