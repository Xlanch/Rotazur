import type { LanguageCode } from './translations';

export const LANGUAGE_LOCALES: Record<LanguageCode, string> = {
  tr: 'tr-TR', en: 'en-GB', de: 'de-DE', ru: 'ru-RU', zh: 'zh-CN', es: 'es-ES', fr: 'fr-FR', ar: 'ar-SA-u-ca-gregory',
};
export type MessageCatalog = Record<string, string>;
export const messageKey = (text: string) => text.replace(/\s+/gu, ' ').trim();
export function isLanguage(value: unknown): value is LanguageCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LANGUAGE_LOCALES, value);
}

type Template = { source: string; target: string; literals: string[]; slots: string[]; anchor: string; weight: number };
function compile(source: string, target: string): Template | null {
  const slots = [...source.matchAll(/\{(\d+)\}/g)].map(m => m[1]);
  if (!slots.length || slots.length > 20 || /\{\d+\}\s*\{\d+\}/.test(source)) return null;
  const literals = source.split(/\{\d+\}/);
  const anchor = [...literals].sort((a, b) => b.length - a.length)[0];
  const weight = literals.join('').replace(/[^\p{L}\p{N}]/gu, '').length;
  if (weight < 3 || !anchor.trim()) return null;
  return { source, target, slots, literals, anchor, weight };
}
// Deterministic, bounded matching: no dynamically constructed regular expressions or backtracking.
function capture(template: Template, input: string): Record<string, string> | null {
  const { literals, slots } = template;
  if (!input.startsWith(literals[0])) return null;
  const values: Record<string, string> = {};
  let cursor = literals[0].length;
  for (let i = 0; i < slots.length; i++) {
    const next = literals[i + 1];
    const last = i === slots.length - 1;
    const end = last ? input.length - next.length : input.indexOf(next, cursor);
    if (end < cursor || (last && !input.endsWith(next))) return null;
    const value = input.slice(cursor, end);
    if (Object.prototype.hasOwnProperty.call(values, slots[i]) && values[slots[i]] !== value) return null;
    values[slots[i]] = value;
    cursor = end + next.length;
  }
  return cursor === input.length ? values : null;
}

/** Pure presentation translation. Never changes provider DTOs, IDs, prices, URLs or persisted user content. */
export function createTranslator(catalog: MessageCatalog, language: LanguageCode) {
  const locale = LANGUAGE_LOCALES[language];
  const templates = Object.entries(catalog).map(([s, t]) => compile(s, t)).filter((t): t is Template => !!t)
    .sort((a, b) => b.weight - a.weight);
  const cache = new Map<string, string>();
  const prefixes = new Map<string, [string, string][]>();
  for (const [source, target] of Object.entries(catalog)) {
    if (/\{\d+\}/.test(source) || source.replace(/[^\p{L}]/gu, '').length < 3) continue;
    const list = prefixes.get(source[0]) || []; list.push([source, target]); prefixes.set(source[0], list);
  }
  for (const list of prefixes.values()) list.sort((a, b) => b[0].length - a[0].length);
  const foldCase = (value: string) => value.toLocaleLowerCase('tr-TR').replaceAll('ı', 'i');
  const caseInsensitive = new Map(Object.keys(catalog).map(key => [foldCase(key), key]));
  function translate(raw: string, depth = 0): string {
    if (language === 'tr' || !raw || raw.length > 24000 || depth > 12) return raw;
    if (isLanguage(raw) || /^rotazur$/i.test(raw)) return raw;
    if (/\r?\n/.test(raw)) return raw.split(/(\r?\n)/).map((line, i) => i % 2 ? line : translate(line, depth + 1)).join('');
    if (/^[A-Z]{2,3}$/.test(raw) && raw !== 'KUR' && raw !== 'MOD') return raw; // Currency, airport, country and language codes.
    if (/^[₺€$£¥₽]\s*[A-Z]{3}$/.test(raw)) return raw;
    if (cache.has(raw)) return cache.get(raw)!;
    if (/^\s*(?:https?:\/\/|mailto:|data:)/i.test(raw)) return raw;
    const leading = raw.match(/^\s*/u)?.[0] || '', trailing = raw.match(/\s*$/u)?.[0] || '';
    const key = messageKey(raw);
    let result = Object.prototype.hasOwnProperty.call(catalog, key) ? catalog[key] : undefined;
    if (result === undefined && /\p{L}/u.test(key) && key === key.toLocaleUpperCase('tr-TR')) {
      const lower = foldCase(key);
      const match = caseInsensitive.get(lower);
      if (match) result = catalog[match].toLocaleUpperCase(locale);
    }
    const quantity = /^(\d+\s*[×x]\s*)([^\d].*)$/u.exec(key);
    if (result === undefined && quantity) return leading + quantity[1] + translate(quantity[2], depth + 1) + trailing;
    if (result === undefined && key.length <= 12000) {
      for (const template of templates) {
        if (!key.includes(template.anchor)) continue;
        const values = capture(template, key);
        if (!values) continue;
        result = template.target.replace(/\{(\d+)\}/g, (token, slot) =>
          Object.prototype.hasOwnProperty.call(values, slot) ? translate(values[slot], depth + 1) : token);
        break;
      }
    }
    if (result === undefined) {
      const prefix = /^([^\p{L}\p{N}{]+)([\p{L}].*)$/u.exec(raw);
      if (prefix) return prefix[1] + translate(prefix[2], depth + 1);
      const knownPrefix = prefixes.get(key[0])?.find(([source]) => key.startsWith(source) && key.length > source.length
        && !/[\p{L}\p{N}]/u.test(key[source.length]));
      if (knownPrefix) return leading + knownPrefix[1] + translate(key.slice(knownPrefix[0].length), depth + 1) + trailing;
      // Composed provider descriptions, itinerary suffixes and clipboard/Markdown lines.
      const pieces = raw.split(/( · | — | - | \| |(?<=[.!?])\s+(?=[\p{Lu}]))/u);
      if (pieces.length > 1) result = pieces.map((p, i) => i % 2 ? p : translate(p, depth + 1)).join('');
      else return raw; // User notes, proper names and genuinely new source text retain their original wording.
      if (cache.size < 20000) cache.set(raw, result);
      return result;
    }
    result = leading + result + trailing;
    if (cache.size < 20000) cache.set(raw, result);
    return result;
  }
  return (text: string) => translate(text);
}
