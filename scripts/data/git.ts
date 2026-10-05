import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './core';

export type CommandResult = { ok: boolean; stdout: string; stderr: string };

const run = (command: string, args: string[]): CommandResult => {
  const result = spawnSync(command, args, { cwd: repoRoot, encoding: 'utf8' });
  return {
    ok: result.error === undefined && result.status === 0,
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim() || (result.error?.message ?? ''),
  };
};

let ghPath: string | undefined | null = null;

export const ghCommand = (): string | undefined => {
  if (ghPath !== null) return ghPath;
  const candidates = [
    process.env.GH_BIN,
    'gh',
    process.platform === 'win32' && process.env.ProgramFiles
      ? join(process.env.ProgramFiles, 'GitHub CLI', 'gh.exe')
      : undefined,
    process.platform === 'win32' && process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, 'Programs', 'GitHub CLI', 'gh.exe')
      : undefined,
    process.platform === 'darwin' ? '/opt/homebrew/bin/gh' : undefined,
    process.platform === 'darwin' ? '/usr/local/bin/gh' : undefined,
    '/usr/bin/gh',
  ].filter((candidate): candidate is string => Boolean(candidate));
  for (const candidate of candidates) {
    if (candidate.includes('/') || candidate.includes('\\')) {
      if (existsSync(candidate) && run(candidate, ['--version']).ok) {
        ghPath = candidate;
        return ghPath;
      }
    } else if (run(candidate, ['--version']).ok) {
      ghPath = candidate;
      return ghPath;
    }
  }
  ghPath = undefined;
  return ghPath;
};

export const isGitRepo = (): boolean => run('git', ['rev-parse', '--is-inside-work-tree']).ok;

export const currentBranch = (): string =>
  run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).stdout;

export const defaultBranch = (): string => {
  const ref = run('git', ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']);
  return ref.ok && ref.stdout ? ref.stdout.replace(/^origin\//, '') : 'main';
};

const branchExists = (name: string): boolean =>
  run('git', ['show-ref', '--verify', '--quiet', `refs/heads/${name}`]).ok;

export const uniqueBranchName = (base: string): string => {
  let name = base;
  let suffix = 2;
  while (branchExists(name)) {
    name = `${base}-${suffix}`;
    suffix += 1;
  }
  return name;
};

export const createBranch = (name: string): CommandResult => run('git', ['switch', '-c', name]);

export const switchBranch = (name: string): CommandResult => run('git', ['switch', name]);

export const commitDataFile = (message: string): CommandResult => {
  const added = run('git', ['add', 'src/data/site.json']);
  if (!added.ok) return added;
  return run('git', ['commit', '-m', message]);
};

export const pushBranch = (branch: string): CommandResult =>
  run('git', ['push', '-u', 'origin', branch]);

export const openPullRequest = (options: {
  base: string;
  branch: string;
  title: string;
  body: string;
}): CommandResult => {
  const gh = ghCommand();
  if (!gh) return { ok: false, stdout: '', stderr: 'GitHub CLI (gh) was not found.' };
  return run(gh, [
    'pr',
    'create',
    '--base',
    options.base,
    '--head',
    options.branch,
    '--title',
    options.title,
    '--body',
    options.body,
  ]);
};

export const compareUrl = (base: string, branch: string): string | undefined => {
  const remote = run('git', ['remote', 'get-url', 'origin']);
  const match = remote.ok
    ? remote.stdout.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/)
    : undefined;
  if (!match) return undefined;
  return `https://github.com/${match[1]}/${match[2]}/compare/${base}...${branch}?expand=1`;
};
