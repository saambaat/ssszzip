import * as p from '@clack/prompts';
import { momentSchema, resolveText, type Moment } from '../../../src/lib/moment-schema';
import { describeLocalized, guard } from '../core';
import { offerPullRequest, type ChangeAction, type DataChange } from '../publish';
import {
  parseTags,
  pickMoment,
  promptDate,
  promptId,
  promptLocalizedSource,
  promptMomentType,
  promptOptional,
  promptPairing,
  promptSourceLang,
  showPreview,
  today,
} from '../prompts';
import { loadSite, saveSite } from '../store';
import { editLocalized, translateInteractive } from '../translate';

const eventSummary = (moment: Moment): string =>
  [moment.date, resolveText(moment.event, 'en')].filter(Boolean).join(' · ');

const momentChange = (action: ChangeAction, moment: Moment): DataChange => {
  const details = [
    `- id: ${moment.id}`,
    `- pairing: ${moment.pairing}`,
    `- momentType: ${moment.momentType}`,
    `- date: ${moment.date}`,
    ...describeLocalized('event', moment.event),
    ...describeLocalized('title', moment.title),
  ];
  if (moment.credit !== undefined) details.push(`- credit: ${moment.credit}`);
  if (moment.tags.length > 0) details.push(`- tags: ${moment.tags.join(', ')}`);
  return {
    action,
    kind: 'moment',
    key: moment.id,
    summary: eventSummary(moment),
    details,
  };
};

export const addMoment = async (): Promise<void> => {
  const site = await loadSite();
  const taken = new Set(site.moments.map((moment) => moment.id));
  const id = await promptId('', taken);
  const pairing = await promptPairing();
  const momentType = await promptMomentType();
  const date = await promptDate(today());
  const sourceLang = await promptSourceLang();
  const eventSource = await promptLocalizedSource('Event', sourceLang, '');
  const titleSource = await promptLocalizedSource('Title', sourceLang, '');
  const event = eventSource ? await translateInteractive('event', eventSource, sourceLang) : undefined;
  const title = titleSource ? await translateInteractive('title', titleSource, sourceLang) : undefined;
  const credit = await promptOptional('Credit (URL) — leave empty to skip', '');
  const tags = parseTags(await promptOptional('Tags (comma separated) — leave empty to skip', ''));
  const draft = momentSchema.parse({
    id,
    pairing,
    momentType,
    date,
    title,
    event,
    credit: credit || undefined,
    tags,
  });
  showPreview(draft);
  const confirmed = guard(await p.confirm({ message: 'Save this moment?' }));
  if (!confirmed) {
    p.log.info('Discarded.');
    return;
  }
  await saveSite({ ...site, moments: [...site.moments, draft] });
  p.log.success(`Saved moment ${draft.id} to src/data/site.json.`);
  await offerPullRequest(momentChange('add', draft));
};

export const editMoment = async (): Promise<void> => {
  const site = await loadSite();
  if (site.moments.length === 0) {
    p.log.warn('No moments to edit.');
    return;
  }
  const target = await pickMoment('Which moment do you want to edit?', site.moments);
  const sourceLang = await promptSourceLang();
  const id = await promptId(target.id, new Set(site.moments.map((moment) => moment.id)), target.id);
  const pairing = await promptPairing(target.pairing);
  const momentType = await promptMomentType(target.momentType);
  const date = await promptDate(target.date);
  const event = await editLocalized('Event', target.event, sourceLang);
  const title = await editLocalized('Title', target.title, sourceLang);
  const credit = await promptOptional('Credit (URL) — leave empty to remove', target.credit ?? '');
  const tags = parseTags(
    await promptOptional('Tags (comma separated) — leave empty to remove', target.tags.join(', ')),
  );
  const draft = momentSchema.parse({
    id,
    pairing,
    momentType,
    date,
    title,
    event,
    credit: credit || undefined,
    tags,
  });
  showPreview(draft);
  const confirmed = guard(await p.confirm({ message: 'Save changes?' }));
  if (!confirmed) {
    p.log.info('Discarded.');
    return;
  }
  await saveSite({
    ...site,
    moments: site.moments.map((moment) => (moment.id === target.id ? draft : moment)),
  });
  p.log.success(`Updated ${draft.id}.`);
  await offerPullRequest(momentChange('edit', draft));
};

export const deleteMoment = async (): Promise<void> => {
  const site = await loadSite();
  if (site.moments.length === 0) {
    p.log.warn('No moments to delete.');
    return;
  }
  const target = await pickMoment('Which moment do you want to delete?', site.moments);
  showPreview(target);
  const confirmed = guard(await p.confirm({ message: `Delete ${target.id}? This cannot be undone.` }));
  if (!confirmed) {
    p.log.info('Kept.');
    return;
  }
  await saveSite({ ...site, moments: site.moments.filter((moment) => moment.id !== target.id) });
  p.log.success(`Deleted ${target.id}.`);
  await offerPullRequest(momentChange('delete', target));
};
