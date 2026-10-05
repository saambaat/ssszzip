import * as p from '@clack/prompts';
import { languages, type Lang } from '../../src/i18n/ui';
import {
  isRealDate,
  momentTypeSchema,
  pairingSchema,
  resolveText,
  type LocalizedText,
  type Moment,
  type MomentType,
  type MomentTypeEntry,
  type Pairing,
} from '../../src/lib/moment-schema';
import { pairingRegistry } from '../../src/lib/pairing-registry';
import type { PairingEntry, PairingMember } from '../../src/lib/pairings';
import { guard, langOrder } from './core';
import { editLocalized, translateInteractive } from './translate';

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

export const promptRequired = async (message: string, initialValue = ''): Promise<string> => {
  const value = guard(
    await p.text({
      message,
      initialValue,
      validate: (input) => ((input ?? '').trim() === '' ? 'This is required.' : undefined),
    }),
  );
  return value.trim();
};

export const promptSlug = async (
  message: string,
  initialValue: string,
  taken: Set<string>,
  current?: string,
): Promise<string> => {
  const value = guard(
    await p.text({
      message,
      placeholder: 'e.g. jjinchinz',
      initialValue,
      validate: (input) => {
        const slug = (input ?? '').trim().toLowerCase();
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
          return 'Use lowercase letters, digits, and single hyphens.';
        }
        if (taken.has(slug) && slug !== current) return `"${slug}" is already in use.`;
      },
    }),
  );
  return value.trim().toLowerCase();
};

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

export const promptImgurId = async (label: string, initialValue: string): Promise<string> => {
  const value = guard(
    await p.text({
      message: `${label} — Imgur media ID or URL`,
      placeholder: 'e.g. UwtuZ6W',
      initialValue,
      validate: (input) => {
        if (!extractImgurId(input ?? '')) return 'Enter a media ID like UwtuZ6W, or an i.imgur.com URL.';
      },
    }),
  );
  const id = extractImgurId(value);
  if (!id) throw new Error(`Could not read an Imgur media ID for ${label}.`);
  return id;
};

export const promptHexColor = async (label: string, initialValue: string): Promise<string> => {
  const value = guard(
    await p.text({
      message: `${label} (6-digit hex)`,
      placeholder: 'e.g. #fff924',
      initialValue,
      validate: (input) =>
        /^#[0-9a-fA-F]{6}$/.test((input ?? '').trim())
          ? undefined
          : 'Use a 6-digit hex color like #fff924.',
    }),
  );
  return value.trim();
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
      options: pairingSchema.options.map((pairing) => ({
        value: pairing,
        label: `${resolveText(pairingRegistry[pairing].name, 'en') ?? pairing} (${pairing})`,
      })),
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
      message: 'Which language will you type the text in?',
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

export const promptRequiredLocalizedValue = async (
  label: string,
  sourceLang: Lang,
  existing?: LocalizedText,
): Promise<LocalizedText> => {
  if (existing !== undefined) return (await editLocalized(label, existing, sourceLang)) ?? existing;
  const source = await promptRequired(`${label} in ${languages[sourceLang]}`);
  return translateInteractive(label.toLowerCase(), source, sourceLang);
};

export const promptLocalizedValue = async (
  label: string,
  sourceLang: Lang,
  existing?: LocalizedText,
): Promise<LocalizedText | undefined> => {
  if (existing !== undefined) return editLocalized(label, existing, sourceLang);
  const source = await promptLocalizedSource(label, sourceLang, '');
  return source ? translateInteractive(label.toLowerCase(), source, sourceLang) : undefined;
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

export const pickPairing = async (
  message: string,
  pairings: Record<string, PairingEntry>,
  initialValue?: string,
): Promise<string> =>
  guard(
    await p.select({
      message,
      options: Object.entries(pairings).map(([id, entry]) => ({
        value: id,
        label: `${resolveText(entry.name, 'en') ?? id} (${id})`,
      })),
      initialValue,
    }),
  );

export const pickMomentType = async (
  message: string,
  momentTypes: Record<string, MomentTypeEntry>,
  initialValue?: string,
): Promise<string> =>
  guard(
    await p.select({
      message,
      options: Object.entries(momentTypes).map(([id, entry]) => ({
        value: id,
        label: `${resolveText(entry.label, 'en') ?? id} (${id})`,
      })),
      initialValue,
    }),
  );

export const memberLabel = (member: PairingMember): string =>
  resolveText(member.name, 'en') ?? 'Unnamed';

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

export const showPairingPreview = (id: string, entry: PairingEntry): void => {
  const lines = [
    `id: ${id}`,
    `name: ${JSON.stringify(entry.name)}`,
    `cover: ${entry.cover}`,
    `banner: ${entry.banner}`,
  ];
  if (entry.description !== undefined) {
    lines.push(`description: ${JSON.stringify(entry.description)}`);
  }
  for (const member of entry.members) {
    lines.push(
      `member: ${memberLabel(member)} · ${JSON.stringify(member.fullName ?? member.name)} · ${member.color}`,
    );
  }
  p.note(lines.join('\n'), 'Preview');
};

export const showMomentTypePreview = (id: string, entry: MomentTypeEntry): void => {
  p.note([`id: ${id}`, `label: ${JSON.stringify(entry.label)}`].join('\n'), 'Preview');
};
