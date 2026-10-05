import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as p from '@clack/prompts';
import { languages, type Lang } from '../../src/i18n/ui';
import type { LocalizedText } from '../../src/lib/moment-schema';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const dataPath = join(repoRoot, 'src', 'data', 'site.json');
export const dataLabel = 'src/data/site.json';

export const langOrder = Object.keys(languages) as Lang[];

export type LocalizedMap = Partial<Record<Lang, string>>;

export const asLocalizedMap = (value: LocalizedText | undefined): LocalizedMap | undefined => {
  if (value === undefined) return undefined;
  return typeof value === 'string' ? { en: value } : { ...value };
};

export const describeLocalized = (label: string, value: LocalizedText | undefined): string[] => {
  const map = asLocalizedMap(value);
  return map === undefined
    ? []
    : langOrder.map((lang) => `- ${label}.${lang}: ${map[lang] ?? '—'}`);
};

export class Cancelled extends Error {}

export const guard = <T>(value: T): Exclude<T, symbol> => {
  if (p.isCancel(value)) throw new Cancelled();
  return value as Exclude<T, symbol>;
};
