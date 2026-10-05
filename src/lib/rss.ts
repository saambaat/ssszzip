import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import type { Lang } from '../i18n/ui';
import { useTranslations } from '../i18n/utils';
import { posterUrl, videoUrl } from './imgur';
import { headingFor, momentHref, subFor } from './moment-display';
import { formatDate } from './months';
import { moments } from './moments';
import { resolvePairing } from './pairings';

const feedLanguages: Record<Lang, string> = { en: 'en', ko: 'ko', zh: 'zh-CN' };

export const momentFeed = (lang: Lang, context: APIContext) => {
  const t = useTranslations(lang);
  const site = new URL(import.meta.env.BASE_URL, context.site ?? context.url);

  return rss({
    title: t('site.title'),
    description: t('site.description'),
    site: site.href,
    xmlns: { media: 'http://search.yahoo.com/mrss/' },
    customData: `<language>${feedLanguages[lang]}</language>`,
    items: moments.map((moment) => {
      const pairing = resolvePairing(moment.pairing, lang);
      const description = [
        subFor(moment, lang) || formatDate(moment.date, lang),
        pairing.name,
      ]
        .filter(Boolean)
        .join(' · ');
      return {
        title: headingFor(moment, lang),
        description,
        link: new URL(momentHref(moment, lang), site).href,
        pubDate: new Date(`${moment.date}T00:00:00Z`),
        customData: `<media:thumbnail url="${posterUrl(moment.id)}"/><media:content url="${videoUrl(moment.id)}" medium="video" type="video/mp4"/>`,
      };
    }),
  });
};
