import * as p from '@clack/prompts';
import { z } from 'zod';
import { languages, type Lang } from '../../src/i18n/ui';
import { formatIssues, type LocalizedText } from '../../src/lib/moment-schema';
import { asLocalizedMap, guard, langOrder, type LocalizedMap } from './core';

const manualTranslate = async (
  label: string,
  source: string,
  sourceLang: Lang,
  prefilled?: LocalizedMap,
): Promise<LocalizedMap> => {
  const result: LocalizedMap = { [sourceLang]: source };
  for (const lang of langOrder) {
    if (lang === sourceLang) continue;
    const value = guard(
      await p.text({
        message: `${label} in ${languages[lang]} — leave empty to skip`,
        initialValue: prefilled?.[lang] ?? '',
      }),
    );
    const trimmed = value.trim();
    if (trimmed !== '') result[lang] = trimmed;
  }
  return result;
};

const translationSchema = z.object(
  Object.fromEntries(langOrder.map((lang) => [lang, z.string().min(1)])),
);

const parseJson = (text: string): unknown => {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  return JSON.parse(trimmed) as unknown;
};

const aiTranslate = async (label: string, source: string, sourceLang: Lang): Promise<LocalizedMap> => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not set. Add it to .env or choose manual translation.');
  }
  const baseUrl = (process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com').replace(/\/+$/, '');
  const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';
  const targetLanguages = langOrder
    .map((lang) => `${languages[lang]} (${lang})`)
    .join(', ');
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            `You translate text for a K-pop fansign archive website. Translate the given ${label} into: ${targetLanguages}. ` +
            'Keep group names, member names, venues, and brands accurate and natural. Be concise, the way a fan would phrase a calendar entry. ' +
            `Reply with only a JSON object whose keys are ${langOrder.join(', ')} and whose values are the translations.`,
        },
        {
          role: 'user',
          content: JSON.stringify({ [label]: source, sourceLanguage: sourceLang }),
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DeepSeek request failed (${response.status}): ${body.slice(0, 300)}`);
  }
  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('DeepSeek returned an empty response.');
  const parsed = translationSchema.safeParse(parseJson(content));
  if (!parsed.success) {
    throw new Error(`Unexpected DeepSeek response:\n${formatIssues(parsed.error)}`);
  }
  return { ...parsed.data, [sourceLang]: source };
};

export const translateInteractive = async (
  label: string,
  source: string,
  sourceLang: Lang,
  prefilled?: LocalizedMap,
): Promise<LocalizedText> => {
  const mode = guard(
    await p.select({
      message: `How should the ${label} be translated?`,
      options: [
        { value: 'ai', label: 'AI (DeepSeek)', hint: 'uses .env keys' },
        { value: 'manual', label: 'Manual', hint: 'type each language yourself' },
      ],
    }),
  );
  if (mode === 'ai') {
    const spinner = p.spinner();
    spinner.start(`Translating ${label} with DeepSeek...`);
    try {
      const result = await aiTranslate(label, source, sourceLang);
      spinner.stop('Translated.');
      p.note(
        langOrder.map((lang) => `${languages[lang]}: ${result[lang] ?? ''}`).join('\n'),
        `${label} translations`,
      );
      const keep = guard(await p.confirm({ message: 'Use these translations?' }));
      if (keep) return result;
    } catch (error) {
      spinner.stop('Translation failed.');
      p.log.error(error instanceof Error ? error.message : String(error));
      p.log.info('Falling back to manual translation.');
    }
  }
  return manualTranslate(label, source, sourceLang, prefilled);
};

export const editLocalized = async (
  label: string,
  existing: LocalizedText | undefined,
  sourceLang: Lang,
): Promise<LocalizedText | undefined> => {
  const map = asLocalizedMap(existing);
  const initial = map?.[sourceLang] ?? '';
  const value = guard(
    await p.text({
      message: `${label} in ${languages[sourceLang]} — leave empty to remove`,
      initialValue: initial,
    }),
  );
  const trimmed = value.trim();
  if (trimmed === initial) return existing;
  if (trimmed === '') return undefined;
  return translateInteractive(label.toLowerCase(), trimmed, sourceLang, map);
};
