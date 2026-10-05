import type { APIContext } from 'astro';
import { momentFeed } from '../../lib/rss';

export const GET = (context: APIContext) => momentFeed('ko', context);
