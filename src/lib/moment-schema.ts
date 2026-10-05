import { z } from 'zod';
import { defaultLang, languages, type Lang } from '../i18n/ui';
import { pairingIds, pairingSchema, type Pairing } from './pairing-registry';
import { momentTypeRegistry } from './site-data';

export { pairingIds, pairingSchema, type Pairing };

const localeKeys = Object.keys(languages) as [Lang, ...Lang[]];

export const localizedTextSchema = z.union([
  z.string().min(1),
  z.partialRecord(z.enum(localeKeys), z.string().min(1)),
]);

export type LocalizedText = z.infer<typeof localizedTextSchema>;

export const resolveText = (value: LocalizedText | undefined, lang: Lang): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  return value[lang] ?? value[defaultLang] ?? Object.values(value)[0];
};

export type MomentType = keyof typeof momentTypeRegistry;

export const momentTypeEntrySchema = z.object({ label: localizedTextSchema });

export type MomentTypeEntry = z.infer<typeof momentTypeEntrySchema>;

const momentTypes = Object.fromEntries(
  Object.entries(momentTypeRegistry).map(([id, entry]) => [id, momentTypeEntrySchema.parse(entry)]),
) as Record<MomentType, MomentTypeEntry>;

export const momentTypeIds = Object.keys(momentTypeRegistry) as [MomentType, ...MomentType[]];

export const momentTypeSchema = z.enum(momentTypeIds);

export { momentTypeRegistry };

export const resolveMomentType = (id: MomentType, lang: Lang): string =>
  resolveText(momentTypes[id].label, lang) ?? id;

export const isRealDate = (value: string): boolean => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const momentSchema = z
  .object({
    id: z
      .string()
      .min(1, 'id is required')
      .regex(/^[A-Za-z0-9]+$/, {
        error: 'id must be the bare Imgur media ID (e.g. aMmtnGX), not a URL or album path',
      }),
    pairing: pairingSchema,
    momentType: momentTypeSchema,
    date: z
      .iso
      .date({ error: 'date must be yyyy-MM-dd' })
      .refine(isRealDate, { error: 'date must be a real calendar date' }),
    title: localizedTextSchema.optional(),
    event: localizedTextSchema.optional(),
    credit: z.url({ error: 'credit must be a URL' }).optional(),
    tags: z.array(z.string().min(1)).default([]),
  })
  .strict();

export type Moment = z.infer<typeof momentSchema>;

export const momentListSchema = z.array(momentSchema);

export const formatIssues = (error: z.ZodError): string =>
  error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');

export const parseMoments = (value: unknown, source = 'moments'): Moment[] => {
  const parsed = momentListSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`Invalid ${source}:\n${formatIssues(parsed.error)}`);
  }
  return parsed.data;
};
