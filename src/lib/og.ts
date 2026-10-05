import type { Lang } from '../i18n/ui';
import type { Moment, Pairing } from './moment-schema';
import { momentPathParams } from './moment-display';

const fontsource = (name: string, file: string): string =>
  `https://cdn.jsdelivr.net/fontsource/fonts/${name}@5.3.0/${file}.ttf`;

const notoCjk = (script: 'KR' | 'SC', weight: 'Regular' | 'Bold'): string =>
  `https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/SubsetOTF/${script}/NotoSans${script}-${weight}.otf`;

const latinFonts = [
  fontsource('noto-sans', 'latin-400-normal'),
  fontsource('noto-sans', 'latin-700-normal'),
];

const fontsByLang: Record<Lang, string[]> = {
  en: latinFonts,
  ko: [...latinFonts, notoCjk('KR', 'Regular'), notoCjk('KR', 'Bold')],
  zh: [...latinFonts, notoCjk('SC', 'Regular'), notoCjk('SC', 'Bold')],
};

const familiesByLang: Record<Lang, string[]> = {
  en: ['Noto Sans'],
  ko: ['Noto Sans KR', 'Noto Sans'],
  zh: ['Noto Sans SC', 'Noto Sans'],
};

const allScriptsFonts = [
  ...latinFonts,
  notoCjk('KR', 'Regular'),
  notoCjk('KR', 'Bold'),
  notoCjk('SC', 'Regular'),
  notoCjk('SC', 'Bold'),
];

const allScriptsFamilies = ['Noto Sans', 'Noto Sans KR', 'Noto Sans SC'];

export const ogFonts = (lang: Lang): string[] => fontsByLang[lang];

export const ogFamilies = (lang: Lang): string[] => familiesByLang[lang];

export const ogAllScriptsFonts = allScriptsFonts;

export const ogAllScriptsFamilies = allScriptsFamilies;

export const ogHomePath = (lang: Lang): string => `open-graph/home/${lang}.png`;

export const ogPairingPath = (pairing: Pairing, lang: Lang): string =>
  `open-graph/pairing/${lang}/${pairing}.png`;

export const ogMomentPath = (moment: Moment, lang: Lang): string => {
  const { year, month, day, id } = momentPathParams(moment);
  return `open-graph/${lang}/${year}/${month}/${day}/${id}.png`;
};
