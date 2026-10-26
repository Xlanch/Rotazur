"use client";

import { useLanguage } from './LanguageContext';
import { fmtCur, fmtMoney, fmtDate, timeOf, weatherIcon, type CurrencyCode } from '@/lib/format';

export function useLocaleFormat() {
  const { locale, lang, translate } = useLanguage();
  return {
    locale,
    tl: (amount: number) => fmtCur(amount, 'TRY', undefined, locale),
    num: (amount: number) => new Intl.NumberFormat(locale).format(Math.round(amount)),
    fmtCur: (amount: number, currency?: CurrencyCode, rates?: Partial<Record<CurrencyCode, number>>) => fmtCur(amount, currency, rates, locale),
    fmtMoney: (amount: number, currency?: CurrencyCode, rates?: Partial<Record<CurrencyCode, number>>) => fmtMoney(amount, currency, rates, locale),
    fmtDate: (iso: string, options?: Intl.DateTimeFormatOptions) => fmtDate(iso, options, locale),
    fmtDuration: (minutes: number) => {
      if (!Number.isFinite(minutes) || minutes <= 0) return translate('Süre doğrulanmadı');
      const units = { tr: ['s', 'dk'], en: ['h', 'min'], de: ['Std.', 'Min.'], ru: ['ч', 'мин'], zh: ['小时', '分钟'], es: ['h', 'min'], fr: ['h', 'min'], ar: ['س', 'د'] }[lang];
      return `${Math.floor(minutes / 60)}${units[0]} ${minutes % 60}${units[1]}`;
    },
    timeOf: (value: string) => translate(timeOf(value)),
    weatherIcon: (code: number) => { const value = weatherIcon(code); return { ...value, label: translate(value.label) }; },
  };
}
