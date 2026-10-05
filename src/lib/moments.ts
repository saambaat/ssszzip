import { momentPathParams } from './moment-display';
import { parseMoments } from './moment-schema';
import { rawMoments } from './site-data';

export const moments = parseMoments(rawMoments, 'src/data/site.json').sort((a, b) =>
  b.date.localeCompare(a.date),
);

export const momentPaths = () =>
  moments.map((moment) => ({ params: momentPathParams(moment), props: { moment } }));
