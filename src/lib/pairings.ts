import { z } from 'zod';
import type { Lang } from '../i18n/ui';
import { localizedTextSchema, resolveText, type Pairing } from './moment-schema';

export const pairingMemberSchema = z.object({
  name: localizedTextSchema,
  fullName: localizedTextSchema.optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, {
    error: 'color must be a 6-digit hex official member color (e.g. #fff924)',
  }),
});

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

export const pairingRegistry = {
  jjinchinz: {
    name: { en: 'JjinChinz', ko: '찐친즈' },
    cover: 'UwtuZ6W',
    banner: 'PaaWbmP',
    description: {
      en: 'The name comes from "찐친" (jjin-chin), Korean slang for a true, real friend. JiWoo and YuBin have been best friends since middle school, years before tripleS brought them together.',
      ko: '이름은 "진짜 친구"라는 뜻의 신조어 "찐친"에서 나왔습니다. 지우와 유빈은 tripleS로 만나기 훨씬 전인 중학교 시절부터 절친이었습니다.',
      zh: '名字取自韩语俚语"찐친"（jjin-chin），意思是真正的朋友。知禹和裕彬从中学起就是挚友，远早于她们加入 tripleS。',
    },
    members: [
      {
        name: { en: 'JiWoo', ko: '지우', zh: '知禹' },
        fullName: { en: 'Lee JiWoo', ko: '이지우', zh: '李知禹' },
        color: '#fff924',
      },
      {
        name: { en: 'YuBin', ko: '유빈', zh: '裕彬' },
        fullName: { en: 'Gong YuBin', ko: '공유빈', zh: '孔裕彬' },
        color: '#ffe3e2',
      },
    ],
  },
} satisfies Record<Pairing, z.input<typeof pairingEntrySchema>>;

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
