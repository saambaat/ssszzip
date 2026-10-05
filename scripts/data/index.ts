#!/usr/bin/env bun
import * as p from '@clack/prompts';
import {
  addMoment,
  addMomentType,
  addPairing,
  deleteMoment,
  deleteMomentType,
  deletePairing,
  editMoment,
  editMomentType,
  editPairing,
} from './actions';
import { Cancelled, guard } from './core';

const actions: Record<string, () => Promise<void>> = {
  'add-moment': addMoment,
  'edit-moment': editMoment,
  'delete-moment': deleteMoment,
  'add-pairing': addPairing,
  'edit-pairing': editPairing,
  'delete-pairing': deletePairing,
  'add-moment-type': addMomentType,
  'edit-moment-type': editMomentType,
  'delete-moment-type': deleteMomentType,
};

const main = async (): Promise<void> => {
  p.intro('fansign data editor');
  for (;;) {
    const action = guard(
      await p.select({
        message: 'What do you want to do?',
        options: [
          { value: 'add-moment', label: 'Add a moment' },
          { value: 'edit-moment', label: 'Edit a moment' },
          { value: 'delete-moment', label: 'Delete a moment' },
          { value: 'add-pairing', label: 'Add a pairing' },
          { value: 'edit-pairing', label: 'Edit a pairing' },
          { value: 'delete-pairing', label: 'Delete a pairing' },
          { value: 'add-moment-type', label: 'Add a moment type' },
          { value: 'edit-moment-type', label: 'Edit a moment type' },
          { value: 'delete-moment-type', label: 'Delete a moment type' },
          { value: 'quit', label: 'Quit' },
        ],
      }),
    );
    if (action === 'quit') break;
    try {
      await actions[action]();
    } catch (error) {
      if (error instanceof Cancelled) p.log.warn('Operation cancelled.');
      else throw error;
    }
  }
  p.outro('Done.');
};

await main().catch((error: unknown) => {
  if (error instanceof Cancelled) {
    p.cancel('Cancelled.');
    return;
  }
  p.log.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
