import * as p from '@clack/prompts';
import type { Lang } from '../../../src/i18n/ui';
import { resolveText } from '../../../src/lib/moment-schema';
import {
  pairingEntrySchema,
  type PairingEntry,
  type PairingMember,
} from '../../../src/lib/pairings';
import { describeLocalized, guard } from '../core';
import { offerPullRequest, type ChangeAction, type DataChange } from '../publish';
import {
  memberLabel,
  pickPairing,
  promptHexColor,
  promptImgurId,
  promptLocalizedValue,
  promptRequiredLocalizedValue,
  promptSlug,
  promptSourceLang,
  showPairingPreview,
} from '../prompts';
import { loadSite, saveSite } from '../store';

const pairingChange = (action: ChangeAction, id: string, entry: PairingEntry): DataChange => ({
  action,
  kind: 'pairing',
  key: id,
  summary: resolveText(entry.name, 'en') ?? id,
  details: [
    `- id: ${id}`,
    ...describeLocalized('name', entry.name),
    ...describeLocalized('description', entry.description),
    `- cover: ${entry.cover}`,
    `- banner: ${entry.banner}`,
    ...entry.members.map((member) => `- member: ${memberLabel(member)} (${member.color})`),
  ],
});

const promptMember = async (sourceLang: Lang, existing?: PairingMember): Promise<PairingMember> => {
  const name = await promptRequiredLocalizedValue('Member name', sourceLang, existing?.name);
  const fullName = await promptLocalizedValue('Member full name', sourceLang, existing?.fullName);
  const color = await promptHexColor('Official member color', existing?.color ?? '');
  return fullName === undefined ? { name, color } : { name, fullName, color };
};

const addMembers = async (sourceLang: Lang): Promise<PairingMember[]> => {
  const members: PairingMember[] = [];
  for (;;) {
    members.push(await promptMember(sourceLang));
    if (members.length < 2) continue;
    const more = guard(await p.confirm({ message: 'Add another member?', initialValue: false }));
    if (!more) break;
  }
  return members;
};

const editMembers = async (members: PairingMember[], sourceLang: Lang): Promise<PairingMember[]> => {
  const result = [...members];
  for (;;) {
    const options = [
      { value: 'add', label: 'Add a member' },
      ...result.map((member, index) => ({
        value: `edit:${index}`,
        label: `Edit ${memberLabel(member)}`,
      })),
      ...(result.length > 2
        ? result.map((member, index) => ({
            value: `remove:${index}`,
            label: `Remove ${memberLabel(member)}`,
          }))
        : []),
      { value: 'done', label: 'Done' },
    ];
    const choice = guard(
      await p.select({ message: `Members (${result.length}, minimum 2)`, options }),
    );
    if (choice === 'done') break;
    if (choice === 'add') {
      result.push(await promptMember(sourceLang));
      continue;
    }
    const [command, rawIndex] = choice.split(':');
    const index = Number(rawIndex);
    if (command === 'edit') result[index] = await promptMember(sourceLang, result[index]);
    else result.splice(index, 1);
  }
  return result;
};

export const addPairing = async (): Promise<void> => {
  const site = await loadSite();
  const id = await promptSlug('Pairing ID (used in URLs)', '', new Set(Object.keys(site.pairings)));
  const sourceLang = await promptSourceLang();
  const name = await promptRequiredLocalizedValue('Pairing name', sourceLang);
  const cover = await promptImgurId('Cover image', '');
  const banner = await promptImgurId('Banner image', '');
  const description = await promptLocalizedValue('Pairing description', sourceLang);
  const members = await addMembers(sourceLang);
  const draft = pairingEntrySchema.parse({ name, cover, banner, description, members });
  showPairingPreview(id, draft);
  const confirmed = guard(await p.confirm({ message: 'Save this pairing?' }));
  if (!confirmed) {
    p.log.info('Discarded.');
    return;
  }
  await saveSite({ ...site, pairings: { ...site.pairings, [id]: draft } });
  p.log.success(`Saved pairing ${id} to src/data/site.json.`);
  await offerPullRequest(pairingChange('add', id, draft));
};

export const editPairing = async (): Promise<void> => {
  const site = await loadSite();
  const ids = Object.keys(site.pairings);
  if (ids.length === 0) {
    p.log.warn('No pairings to edit.');
    return;
  }
  const id = await pickPairing('Which pairing do you want to edit?', site.pairings);
  const existing = site.pairings[id];
  const sourceLang = await promptSourceLang();
  const name = await promptRequiredLocalizedValue('Pairing name', sourceLang, existing.name);
  const cover = await promptImgurId('Cover image', existing.cover);
  const banner = await promptImgurId('Banner image', existing.banner);
  const description = await promptLocalizedValue(
    'Pairing description',
    sourceLang,
    existing.description,
  );
  const members = await editMembers(existing.members, sourceLang);
  const draft = pairingEntrySchema.parse({ name, cover, banner, description, members });
  showPairingPreview(id, draft);
  const confirmed = guard(await p.confirm({ message: 'Save changes?' }));
  if (!confirmed) {
    p.log.info('Discarded.');
    return;
  }
  await saveSite({ ...site, pairings: { ...site.pairings, [id]: draft } });
  p.log.success(`Updated pairing ${id}.`);
  await offerPullRequest(pairingChange('edit', id, draft));
};

export const deletePairing = async (): Promise<void> => {
  const site = await loadSite();
  const ids = Object.keys(site.pairings);
  if (ids.length === 0) {
    p.log.warn('No pairings to delete.');
    return;
  }
  if (ids.length <= 1) {
    p.log.error('At least one pairing is required; add another before deleting this one.');
    return;
  }
  const id = await pickPairing('Which pairing do you want to delete?', site.pairings);
  const used = site.moments.filter((moment) => moment.pairing === id);
  if (used.length > 0) {
    p.log.error(`Cannot delete "${id}": ${used.length} moment(s) still reference it.`);
    return;
  }
  const entry = site.pairings[id];
  showPairingPreview(id, entry);
  const confirmed = guard(
    await p.confirm({ message: `Delete pairing ${id}? This cannot be undone.` }),
  );
  if (!confirmed) {
    p.log.info('Kept.');
    return;
  }
  const pairings = { ...site.pairings };
  delete pairings[id];
  await saveSite({ ...site, pairings });
  p.log.success(`Deleted pairing ${id}.`);
  await offerPullRequest(pairingChange('delete', id, entry));
};
