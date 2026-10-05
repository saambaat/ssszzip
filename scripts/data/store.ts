import { readFile, writeFile } from 'node:fs/promises';
import { formatIssues, type Moment } from '../../src/lib/moment-schema';
import { siteDataSchema, type SiteData } from '../../src/lib/site-schema';
import { dataLabel, dataPath } from './core';

const momentRecord = (moment: Moment): Record<string, unknown> => {
  const record: Record<string, unknown> = {
    id: moment.id,
    pairing: moment.pairing,
    momentType: moment.momentType,
    date: moment.date,
  };
  if (moment.title !== undefined) record.title = moment.title;
  if (moment.event !== undefined) record.event = moment.event;
  if (moment.credit !== undefined) record.credit = moment.credit;
  if (moment.tags.length > 0) record.tags = moment.tags;
  return record;
};

export const loadSite = async (): Promise<SiteData> => {
  const raw = JSON.parse(await readFile(dataPath, 'utf8')) as unknown;
  const parsed = siteDataSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid ${dataLabel}:\n${formatIssues(parsed.error)}`);
  }
  return parsed.data;
};

export const saveSite = async (data: SiteData): Promise<void> => {
  const records = {
    pairings: data.pairings,
    momentTypes: data.momentTypes,
    moments: [...data.moments].sort((a, b) => b.date.localeCompare(a.date)).map(momentRecord),
  };
  const parsed = siteDataSchema.safeParse(records);
  if (!parsed.success) {
    throw new Error(`Refusing to write invalid data:\n${formatIssues(parsed.error)}`);
  }
  await writeFile(dataPath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
};
