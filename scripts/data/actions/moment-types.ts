import * as p from '@clack/prompts';
import {
  momentTypeEntrySchema,
  resolveText,
  type MomentTypeEntry,
} from '../../../src/lib/moment-schema';
import { describeLocalized, guard } from '../core';
import { offerPullRequest, type ChangeAction, type DataChange } from '../publish';
import {
  pickMomentType,
  promptRequiredLocalizedValue,
  promptSlug,
  promptSourceLang,
  showMomentTypePreview,
} from '../prompts';
import { loadSite, saveSite } from '../store';

const momentTypeChange = (
  action: ChangeAction,
  id: string,
  entry: MomentTypeEntry,
): DataChange => ({
  action,
  kind: 'moment-type',
  key: id,
  summary: resolveText(entry.label, 'en') ?? id,
  details: [`- id: ${id}`, ...describeLocalized('label', entry.label)],
});

export const addMomentType = async (): Promise<void> => {
  const site = await loadSite();
  const id = await promptSlug(
    'Moment type ID',
    '',
    new Set(Object.keys(site.momentTypes)),
  );
  const sourceLang = await promptSourceLang();
  const label = await promptRequiredLocalizedValue('Label', sourceLang);
  const draft = momentTypeEntrySchema.parse({ label });
  showMomentTypePreview(id, draft);
  const confirmed = guard(await p.confirm({ message: 'Save this moment type?' }));
  if (!confirmed) {
    p.log.info('Discarded.');
    return;
  }
  await saveSite({ ...site, momentTypes: { ...site.momentTypes, [id]: draft } });
  p.log.success(`Saved moment type ${id} to src/data/site.json.`);
  await offerPullRequest(momentTypeChange('add', id, draft));
};

export const editMomentType = async (): Promise<void> => {
  const site = await loadSite();
  if (Object.keys(site.momentTypes).length === 0) {
    p.log.warn('No moment types to edit.');
    return;
  }
  const id = await pickMomentType('Which moment type do you want to edit?', site.momentTypes);
  const sourceLang = await promptSourceLang();
  const label = await promptRequiredLocalizedValue(
    'Label',
    sourceLang,
    site.momentTypes[id].label,
  );
  const draft = momentTypeEntrySchema.parse({ label });
  showMomentTypePreview(id, draft);
  const confirmed = guard(await p.confirm({ message: 'Save changes?' }));
  if (!confirmed) {
    p.log.info('Discarded.');
    return;
  }
  await saveSite({ ...site, momentTypes: { ...site.momentTypes, [id]: draft } });
  p.log.success(`Updated moment type ${id}.`);
  await offerPullRequest(momentTypeChange('edit', id, draft));
};

export const deleteMomentType = async (): Promise<void> => {
  const site = await loadSite();
  const ids = Object.keys(site.momentTypes);
  if (ids.length === 0) {
    p.log.warn('No moment types to delete.');
    return;
  }
  if (ids.length <= 1) {
    p.log.error('At least one moment type is required; add another before deleting this one.');
    return;
  }
  const id = await pickMomentType('Which moment type do you want to delete?', site.momentTypes);
  const used = site.moments.filter((moment) => moment.momentType === id);
  if (used.length > 0) {
    p.log.error(`Cannot delete "${id}": ${used.length} moment(s) still use it.`);
    return;
  }
  const entry = site.momentTypes[id];
  showMomentTypePreview(id, entry);
  const confirmed = guard(
    await p.confirm({ message: `Delete moment type ${id}? This cannot be undone.` }),
  );
  if (!confirmed) {
    p.log.info('Kept.');
    return;
  }
  const momentTypes = { ...site.momentTypes };
  delete momentTypes[id];
  await saveSite({ ...site, momentTypes });
  p.log.success(`Deleted moment type ${id}.`);
  await offerPullRequest(momentTypeChange('delete', id, entry));
};
