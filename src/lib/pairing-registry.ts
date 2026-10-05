import { z } from 'zod';
import { pairingRegistry } from './site-data';

export { pairingRegistry };

export type Pairing = keyof typeof pairingRegistry;

export const pairingIds = Object.keys(pairingRegistry) as [Pairing, ...Pairing[]];

export const pairingSchema = z.enum(pairingIds);
