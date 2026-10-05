import * as p from '@clack/prompts';
import { languages, type Lang } from '../../src/i18n/ui';
import {
  isRealDate,
  momentTypeSchema,
  pairingSchema,
  resolveText,
  type Moment,
  type MomentType,
  type Pairing,
} from '../../src/lib/moment-schema';
import { guard, langOrder } from './core';

export const extractImgurId = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (/^[A-Za-z0-9]+$/.test(trimmed)) return trimmed;
  return trimmed.match(/imgur\.com\/(?:gallery\/|a\/)?([A-Za-z0-9]+)/i)?.[1];
};

export const parseTags = (value: string): string[] =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

export const today = (): string => new Date().toISOString().slice(0, 10);

const dateSeparators = /[\u2010-\u2015\u2212/.\s]+/g;

export const normalizeDateInput = (value: string): string => {
  const trimmed = value.trim();
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6)}`;
  }
  return trimmed.replace(dateSeparators, '-').replace(/-+/g, '-');
};

export const promptOptional = async (message: string, initialValue: string): Promise<string> =>
  guard(await p.text({ message, initialValue })).trim();

export const promptId = async (
  initialValue: string,
  taken: Set<string>,
  current?: string,
): Promise<string> => {
  const value = guard(
    await p.text({
      message: 'Imgur media ID or URL',
      placeholder: 'e.g. aMmtnGX',
      initialValue,
      validate: (input) => {
        const id = extractImgurId(input ?? '');
        if (!id) return 'Enter a media ID like aMmtnGX, or an i.imgur.com URL.';
        if (taken.has(id) && id !== current) return `Another moment already uses "${id}".`;
      },
    }),
  );
  const id = extractImgurId(value);
  if (!id) throw new Error('Could not read an Imgur media ID.');
  return id;
};

export const promptDate = async (initialValue: string): Promise<string> => {
  const value = guard(
    await p.text({
      message: 'Date (yyyy-MM-dd; separators optional)',
      placeholder: 'e.g. 2026-10-03, 2026/10/03, or 20261003',
      initialValue,
      validate: (input) => {
        const normalized = normalizeDateInput(input ?? '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
          return 'Use yyyy-MM-dd, yyyy/MM/dd, or yyyymmdd.';
        }
        if (!isRealDate(normalized)) return 'Not a real calendar date.';
      },
    }),
  );
  return normalizeDateInput(value);
};

export const promptPairing = async (initialValue?: Pairing): Promise<Pairing> =>
  guard(
    await p.select({
      message: 'Pairing',
      options: pairingSchema.options.map((pairing) => ({ value: pairing, label: pairing })),
      initialValue,
    }),
  );

export const promptMomentType = async (initialValue?: MomentType): Promise<MomentType> =>
  guard(
    await p.select({
      message: 'Moment type',
      options: momentTypeSchema.options.map((momentType) => ({
        value: momentType,
        label: momentType,
      })),
      initialValue,
    }),
  );

export const promptSourceLang = async (): Promise<Lang> =>
  guard(
    await p.select({
      message: 'Which language will you type the event/title in?',
      options: langOrder.map((lang) => ({ value: lang, label: `${languages[lang]} (${lang})` })),
    }),
  );

export const promptLocalizedSource = async (
  label: string,
  sourceLang: Lang,
  initialValue: string,
): Promise<string | undefined> => {
  const value = guard(
    await p.text({
      message: `${label} in ${languages[sourceLang]} — leave empty to skip`,
      initialValue,
    }),
  );
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const labelFor = (moment: Moment): string =>
  resolveText(moment.title, 'en') ??
  [moment.date, resolveText(moment.event, 'en')].filter(Boolean).join(' · ');

export const pickMoment = async (message: string, items: Moment[]): Promise<Moment> => {
  const id = guard(
    await p.select({
      message,
      options: items.map((moment) => ({
        value: moment.id,
        label: labelFor(moment),
        hint: moment.id,
      })),
      maxItems: 12,
    }),
  );
  const found = items.find((moment) => moment.id === id);
  if (!found) throw new Error(`Moment ${id} not found.`);
  return found;
};

export const showPreview = (moment: Moment): void => {
  const lines = [
    `id: ${moment.id}`,
    `pairing: ${moment.pairing}`,
    `momentType: ${moment.momentType}`,
    `date: ${moment.date}`,
  ];
  if (moment.title !== undefined) lines.push(`title: ${JSON.stringify(moment.title)}`);
  if (moment.event !== undefined) lines.push(`event: ${JSON.stringify(moment.event)}`);
  if (moment.credit !== undefined) lines.push(`credit: ${moment.credit}`);
  if (moment.tags.length > 0) lines.push(`tags: ${moment.tags.join(', ')}`);
  p.note(lines.join('\n'), 'Preview');
};
