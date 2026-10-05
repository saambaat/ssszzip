import { z } from 'zod';
import type { Lang } from '../i18n/ui';
import { localizedTextSchema, resolveText } from './moment-schema';
import { pairingRegistry, type Pairing } from './pairing-registry';

export const pairingMemberSchema = z.object({
  name: localizedTextSchema,
  fullName: localizedTextSchema.optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, {
    error: 'color must be a 6-digit hex official member color (e.g. #fff924)',
  }),
});

export type PairingMember = z.infer<typeof pairingMemberSchema>;

const imgurIdSchema = (field: string) =>
  z.string().regex(/^[A-Za-z0-9]+$/, {
    error: `${field} must be the bare Imgur media ID (e.g. UwtuZ6W), not a URL or album path`,
  });

export const pairingEntrySchema = z.object({
  name: localizedTextSchema,
  cover: imgurIdSchema('cover'),
  banner: imgurIdSchema('banner'),
  description: localizedTextSchema.optional(),
  members: z.array(pairingMemberSchema).min(2),
});

export type PairingEntry = z.infer<typeof pairingEntrySchema>;

const pairings = Object.fromEntries(
  Object.entries(pairingRegistry).map(([id, entry]) => [id, pairingEntrySchema.parse(entry)]),
) as Record<Pairing, PairingEntry>;

export interface ResolvedPairing {
  name: string;
  cover: string;
  banner: string;
  accentColors: string[];
  description?: string;
  members: string[];
  memberAliases: string[];
}

export const allPairingIds = Object.keys(pairingRegistry) as Pairing[];

export const pairingPaths = () =>
  allPairingIds.map((pairing) => ({ params: { pairing }, props: { pairing } }));

export const accentGradient = (colors: string[]): string =>
  `linear-gradient(160deg, ${colors.map((color) => `${color}4d`).join(', ')}, transparent)`;

export const resolvePairing = (id: Pairing, lang: Lang): ResolvedPairing => {
  const entry = pairings[id];
  const names = entry.members.flatMap((member) => resolveText(member.name, lang) ?? []);
  const fullNames = entry.members.flatMap(
    (member) => resolveText(member.fullName ?? member.name, lang) ?? [],
  );
  return {
    name: resolveText(entry.name, lang) ?? id,
    cover: entry.cover,
    banner: entry.banner,
    accentColors: entry.members.map((member) => member.color),
    description: entry.description && resolveText(entry.description, lang),
    members: names,
    memberAliases: [...new Set([...names, ...fullNames])],
  };
};
