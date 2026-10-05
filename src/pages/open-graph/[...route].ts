import { OGImageRoute } from 'astro-og-canvas';
import { languages, type Lang } from '../../i18n/ui';
import { useTranslations } from '../../i18n/utils';
import { headingFor, momentPathParams, subFor } from '../../lib/moment-display';
import { moments } from '../../lib/moments';
import { formatDate } from '../../lib/months';
import { ogAllScriptsFamilies, ogAllScriptsFonts, ogFamilies, ogFonts } from '../../lib/og';
import { allPairingIds, resolvePairing } from '../../lib/pairings';

interface OgPage {
  lang: Lang;
  title: string;
  description: string;
  accent?: [number, number, number];
  fonts?: string[];
  families?: string[];
}

const hexToRgb = (hex: string): [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];

const blendRgb = (colors: string[]): [number, number, number] => {
  const channels = colors.map(hexToRgb);
  const average = (index: number) =>
    Math.round(channels.reduce((sum, rgb) => sum + rgb[index], 0) / channels.length);
  return [average(0), average(1), average(2)];
};

const langCodes = Object.keys(languages) as Lang[];
const pages: Record<string, OgPage> = {};

for (const lang of langCodes) {
  const t = useTranslations(lang);
  pages[`home/${lang}`] = { lang, title: t('site.title'), description: t('site.description') };

  for (const id of allPairingIds) {
    const pairing = resolvePairing(id, lang);
    pages[`pairing/${lang}/${id}`] = {
      lang,
      title: pairing.name,
      description:
        pairing.description ?? `${pairing.members.join(' · ')} · ${t('site.description')}`,
      accent: blendRgb(pairing.accentColors),
      fonts: ogAllScriptsFonts,
      families: ogAllScriptsFamilies,
    };
  }

  for (const moment of moments) {
    const pairing = resolvePairing(moment.pairing, lang);
    const { year, month, day, id } = momentPathParams(moment);
    pages[`${lang}/${year}/${month}/${day}/${id}`] = {
      lang,
      title: headingFor(moment, lang),
      description: [subFor(moment, lang) || formatDate(moment.date, lang), pairing.name]
        .filter(Boolean)
        .join(' · '),
    };
  }
}

export const { getStaticPaths, GET } = await OGImageRoute({
  pages,
  getImageOptions: (_path, page) => {
    const families = page.families ?? ogFamilies(page.lang);
    return {
      title: page.title,
      description: page.description,
      bgGradient: [
        [24, 24, 27],
        [9, 9, 11],
      ],
      border: { color: page.accent ?? [113, 113, 122], width: 8, side: 'inline-start' },
      padding: 80,
      font: {
        title: { families, weight: 'Bold', size: 72, lineHeight: 1.15 },
        description: {
          families,
          color: [161, 161, 170],
          size: 38,
          lineHeight: 1.3,
        },
      },
      fonts: page.fonts ?? ogFonts(page.lang),
    };
  },
});
