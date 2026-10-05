import { z } from 'zod';
import { momentListSchema, momentTypeEntrySchema } from './moment-schema';
import { pairingEntrySchema } from './pairings';

export const siteDataSchema = z.object({
  pairings: z.record(z.string(), pairingEntrySchema),
  momentTypes: z.record(z.string(), momentTypeEntrySchema),
  moments: momentListSchema,
});

export type SiteData = z.infer<typeof siteDataSchema>;
