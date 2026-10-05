import * as p from '@clack/prompts';
import { guard } from './core';
import {
  commitDataFile,
  compareUrl,
  createBranch,
  currentBranch,
  defaultBranch,
  isGitRepo,
  openPullRequest,
  pushBranch,
  switchBranch,
  uniqueBranchName,
} from './git';

export type ChangeAction = 'add' | 'edit' | 'delete';

export type ChangeKind = 'moment' | 'pairing' | 'moment-type';

export interface DataChange {
  action: ChangeAction;
  kind: ChangeKind;
  key: string;
  summary: string;
  details: string[];
}

const verbs: Record<ChangeAction, string> = {
  add: 'Add',
  edit: 'Update',
  delete: 'Remove',
};

const kindLabels: Record<ChangeKind, string> = {
  moment: 'moment',
  pairing: 'pairing',
  'moment-type': 'moment type',
};

export const offerPullRequest = async (change: DataChange): Promise<void> => {
  if (!isGitRepo()) {
    p.log.warn('Not inside a git repository; skipping branch and PR.');
    return;
  }
  const base = defaultBranch();
  const original = currentBranch();
  const branch = uniqueBranchName(`data/${change.action}-${change.kind}-${change.key}`);
  const wants = guard(
    await p.confirm({
      message: `Create branch "${branch}" and open a PR to ${base}?`,
      initialValue: true,
    }),
  );
  if (!wants) return;
  if (original !== base) {
    p.log.warn(`Branching from "${original}", so the PR may include its commits.`);
  }

  const title = `${verbs[change.action]} ${kindLabels[change.kind]} ${change.key} (${change.summary})`;
  const body = [
    'Automated by `bun run data`.',
    '',
    `- action: ${change.action}`,
    `- entity: ${kindLabels[change.kind]}`,
    `- key: ${change.key}`,
    ...change.details,
  ].join('\n');
  const spinner = p.spinner();

  spinner.start(`Creating branch "${branch}"...`);
  const created = createBranch(branch);
  if (!created.ok) {
    spinner.stop('Could not create the branch.');
    p.log.error(created.stderr);
    return;
  }
  spinner.stop(`Created "${branch}".`);

  spinner.start('Committing src/data/site.json...');
  const committed = commitDataFile(title);
  if (!committed.ok) {
    spinner.stop('Commit failed.');
    p.log.error(committed.stderr);
    switchBranch(original);
    return;
  }
  spinner.stop('Committed.');

  spinner.start(`Pushing "${branch}"...`);
  const pushed = pushBranch(branch);
  if (!pushed.ok) {
    spinner.stop('Push failed.');
    p.log.error(pushed.stderr);
    switchBranch(original);
    return;
  }
  spinner.stop('Pushed.');

  spinner.start('Opening the pull request...');
  const pr = openPullRequest({ base, branch, title, body });
  if (pr.ok) {
    spinner.stop('Pull request opened.');
    p.log.success(pr.stdout);
  } else {
    spinner.stop('Could not open the PR automatically.');
    p.log.warn(pr.stderr);
    const url = compareUrl(base, branch);
    if (url) p.log.info(`Open it manually: ${url}`);
  }

  const restored = switchBranch(original);
  if (!restored.ok) {
    p.log.warn(`Could not switch back to "${original}": ${restored.stderr}`);
  }
};
