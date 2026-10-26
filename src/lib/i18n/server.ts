import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createTranslator, isLanguage, type MessageCatalog } from './runtime';
import type { LanguageCode } from './translations';
import type { Metadata } from 'next';

const cache = new Map<LanguageCode, MessageCatalog>();
export async function initialLanguage(value: unknown): Promise<{ language: LanguageCode; catalog: MessageCatalog }> {
  if (!isLanguage(value) || value === 'tr') return { language: 'tr', catalog: {} };
  try {
    let catalog = process.env.NODE_ENV === 'production' ? cache.get(value) : undefined;
    if (!catalog) {
      catalog = JSON.parse(await readFile(path.join(process.cwd(), 'public', 'i18n', `${value}.json`), 'utf8')) as MessageCatalog;
      if (!catalog || Array.isArray(catalog) || Object.values(catalog).some(item => typeof item !== 'string')) throw new Error('Invalid catalog');
      if (process.env.NODE_ENV === 'production') cache.set(value, catalog);
    }
    return { language: value, catalog };
  } catch { return { language: 'tr', catalog: {} }; }
}

/** Keep Next's streamed page metadata in the same language as the server-rendered content. */
export async function localizedMetadata(metadata: Metadata): Promise<Metadata> {
  const { cookies } = await import('next/headers');
  const selected = await initialLanguage((await cookies()).get('rotazur_lang')?.value);
  return translateMetadata(metadata, selected.language, selected.catalog);
}

export function translateMetadata(metadata: Metadata, language: LanguageCode, catalog: MessageCatalog): Metadata {
  const text = createTranslator(catalog, language);
  const title = (value: Metadata['title']): Metadata['title'] => typeof value === 'string' ? text(value)
    : value ? Object.fromEntries(Object.entries(value).map(([key, value]) => [key, typeof value === 'string' ? text(value) : value])) as Metadata['title'] : value;
  const result: Metadata = { ...metadata };
  if (metadata.title) result.title = title(metadata.title);
  if (metadata.description) result.description = text(metadata.description);
  if (metadata.keywords) result.keywords = Array.isArray(metadata.keywords) ? metadata.keywords.map(text) : text(metadata.keywords);
  if (metadata.openGraph) result.openGraph = { ...metadata.openGraph,
    ...(metadata.openGraph.title ? { title: title(metadata.openGraph.title) } : {}),
    ...(metadata.openGraph.description ? { description: text(metadata.openGraph.description) } : {}),
    locale: { tr: 'tr_TR', en: 'en_GB', de: 'de_DE', ru: 'ru_RU', zh: 'zh_CN', es: 'es_ES', fr: 'fr_FR', ar: 'ar_AR' }[language],
  } as NonNullable<Metadata['openGraph']>;
  if (metadata.twitter) result.twitter = { ...metadata.twitter,
    ...(metadata.twitter.title ? { title: title(metadata.twitter.title) } : {}),
    ...(metadata.twitter.description ? { description: text(metadata.twitter.description) } : {}),
  } as NonNullable<Metadata['twitter']>;
  return result;
}
