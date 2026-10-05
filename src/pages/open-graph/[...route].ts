import { OGImageRoute } from 'astro-og-canvas';
import { languages, type Lang } from '../../i18n/ui';
import { useTranslations } from '../../i18n/utils';
import { headingFor, momentPathParams, subFor } from '../../lib/moment-display';
import { moments } from '../../lib/moments';
import { formatDate } from '../../lib/months';
import { ogFamilies, ogFonts } from '../../lib/og';
import { resolvePairing } from '../../lib/pairings';

interface OgPage {
  lang: Lang;
  title: string;
  description: string;
}

const langCodes = Object.keys(languages) as Lang[];
const pages: Record<string, OgPage> = {};

for (const lang of langCodes) {
  const t = useTranslations(lang);
  pages[`home/${lang}`] = { lang, title: t('site.title'), description: t('site.description') };

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
  getImageOptions: (_path, page) => ({
    title: page.title,
    description: page.description,
    bgGradient: [
      [24, 24, 27],
      [9, 9, 11],
    ],
    border: { color: [113, 113, 122], width: 8, side: 'inline-start' },
    padding: 80,
    font: {
      title: { families: ogFamilies(page.lang), weight: 'Bold', size: 72, lineHeight: 1.15 },
      description: {
        families: ogFamilies(page.lang),
        color: [161, 161, 170],
        size: 38,
        lineHeight: 1.3,
      },
    },
    fonts: ogFonts(page.lang),
  }),
});
