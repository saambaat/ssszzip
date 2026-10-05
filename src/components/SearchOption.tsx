import { Fragment } from 'react';
import { normalizeQuery, type SearchHit } from '../lib/search';

interface Props {
  hit: SearchHit;
  query?: string;
  active?: boolean;
  compact?: boolean;
  option?: boolean;
  optionRef?: (node: HTMLAnchorElement | null) => void;
}

export const searchOptionId = (hit: SearchHit): string =>
  `search-option-${hit.doc.type}-${hit.doc.id}`;

interface Segment {
  text: string;
  match: boolean;
}

const segment = (text: string, tokens: string[]): Segment[] => {
  const normalized = text.normalize('NFKC').toLowerCase();
  if (tokens.length === 0 || normalized.length !== text.length) {
    return [{ text, match: false }];
  }

  const ranges: [number, number][] = [];
  for (const token of tokens) {
    let index = normalized.indexOf(token);
    while (index !== -1) {
      ranges.push([index, index + token.length]);
      index = normalized.indexOf(token, index + token.length);
    }
  }
  if (ranges.length === 0) return [{ text, match: false }];

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }

  const segments: Segment[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), match: false });
    segments.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments;
};

const Highlighted = ({ text, tokens }: { text: string; tokens: string[] }) => (
  <>
    {segment(text, tokens).map((part, index) =>
      part.match ? (
        <mark key={index} className="rounded-[2px] bg-foreground/15 text-foreground">
          {part.text}
        </mark>
      ) : (
        <Fragment key={index}>{part.text}</Fragment>
      ),
    )}
  </>
);

export default function SearchOption({
  hit,
  query,
  active = false,
  compact = true,
  option = false,
  optionRef,
}: Props) {
  const { doc } = hit;
  const secondary = compact ? (doc.subtitle ?? doc.meta) : doc.subtitle;
  const showMeta = !compact || (doc.type === 'moment' && secondary !== doc.meta);
  const tokens = query ? normalizeQuery(query).split(/\s+/).filter(Boolean) : [];
  const matchedContext = (doc.context ?? []).filter((group) =>
    group.values.some((value) => {
      const normalized = value.normalize('NFKC').toLowerCase();
      return tokens.some((token) => normalized.includes(token));
    }),
  );

  return (
    <a
      href={doc.href}
      ref={optionRef}
      role={option ? 'option' : undefined}
      aria-selected={option ? active : undefined}
      id={option ? searchOptionId(hit) : undefined}
      tabIndex={option ? -1 : undefined}
      className={`flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors ${
        active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
      }`}
    >
      <img
        src={doc.poster}
        alt=""
        loading="lazy"
        className={`${compact ? 'size-10' : 'size-14'} flex-none rounded-md bg-black object-cover`}
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">
          <Highlighted text={doc.title} tokens={tokens} />
        </span>
        {secondary && (
          <span className="block truncate text-xs text-muted-foreground">
            <Highlighted text={secondary} tokens={tokens} />
          </span>
        )}
        {showMeta && doc.meta && (
          <span className="block truncate text-xs text-muted-foreground">
            <Highlighted text={doc.meta} tokens={tokens} />
          </span>
        )}
        {matchedContext.map((group) => (
          <span key={group.label} className="block truncate text-xs text-muted-foreground">
            {group.label}: <Highlighted text={group.values.join(' · ')} tokens={tokens} />
          </span>
        ))}
      </span>
    </a>
  );
}
