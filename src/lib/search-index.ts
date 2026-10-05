import { ui, type Lang, type UIKey } from '../i18n/ui';
import { localePath } from '../i18n/utils';
import { thumbUrl } from './imgur';
import { headingFor, momentHref, subFor } from './moment-display';
import { moments } from './moments';
import { formatDate, monthName } from './months';
import type { LocalizedText, Moment, Pairing } from './moment-schema';
import { allPairingIds, pairingRegistry, resolvePairing } from './pairings';
import type { SearchDoc } from './search';

const langs = Object.keys(ui) as Lang[];

const normalize = (value: string): string => value.normalize('NFKC').toLowerCase();

const texts = (value: LocalizedText | undefined): string[] => {
  if (value === undefined) return [];
  const values = typeof value === 'string' ? [value] : Object.values(value);
  return values.map(normalize);
};

const uiTexts = (key: UIKey): string[] => langs.map((lang) => normalize(ui[lang][key]));

const memberTexts = (pairing: Pairing): string[] => {
  const entry = pairingRegistry[pairing];
  const values = entry.members.flatMap((member) => [
    ...texts(member.name),
    ...texts(member.fullName ?? member.name),
  ]);
  return [...new Set(values)];
};

const momentDoc = (moment: Moment, lang: Lang): SearchDoc => {
  const pairing = resolvePairing(moment.pairing, lang);
  const month = moment.date.slice(0, 7);
  return {
    id: moment.id,
    type: 'moment',
    href: momentHref(moment, lang),
    poster: thumbUrl(moment.id),
    title: headingFor(moment, lang),
    subtitle: subFor(moment, lang) || undefined,
    meta: [pairing.name, ui[lang][`momentType.${moment.momentType}`]].join(' · '),
    context: [
      { label: ui[lang]['pairing.members'], values: pairing.members },
      { label: ui[lang]['moment.tags'], values: moment.tags },
    ].filter((group) => group.values.length > 0),
    search: {
      title: texts(moment.title),
      event: texts(moment.event),
      members: memberTexts(moment.pairing),
      pairing: [moment.pairing, ...texts(pairingRegistry[moment.pairing].name)],
      type: [moment.momentType, ...uiTexts(`momentType.${moment.momentType}`)],
      tags: moment.tags.map(normalize),
      dates: [
        moment.date,
        moment.date.slice(0, 4),
        ...langs.flatMap((code) => [monthName(month, code), formatDate(moment.date, code)]),
      ].map(normalize),
    },
  };
};

const pairingDoc = (pairing: Pairing, lang: Lang): SearchDoc => {
  const entry = pairingRegistry[pairing];
  const resolved = resolvePairing(pairing, lang);
  return {
    id: pairing,
    type: 'pairing',
    href: localePath(lang, `/${pairing}`),
    poster: thumbUrl(entry.cover),
    title: resolved.name,
    subtitle: resolved.members.join(' · '),
    meta: resolved.description,
    search: {
      name: texts(entry.name),
      members: memberTexts(pairing),
      description: texts(entry.description),
      pairing: [normalize(pairing)],
    },
  };
};

export const buildSearchDocs = (lang: Lang): SearchDoc[] => [
  ...moments.map((moment) => momentDoc(moment, lang)),
  ...allPairingIds.map((pairing) => pairingDoc(pairing, lang)),
];
