import { formatMinutes, timeMinutes } from "./travel-utils";

export const tl = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(
    Math.round(n),
  );

export type CurrencyCode = "TRY" | "EUR" | "USD" | "GBP" | "RUB" | "CNY" | "SAR" | "AED";

export const DEFAULT_RATES: Record<CurrencyCode, number> = {
  TRY: 1,
  EUR: 55.68,
  USD: 49.60,
  GBP: 66.30,
  RUB: 0.60,
  CNY: 7.40,
  SAR: 13.23,
  AED: 13.51,
};

export function fmtCur(
  tryAmount: number,
  currency: CurrencyCode = "TRY",
  rates?: Partial<Record<CurrencyCode, number>>,
  locale?: string,
) {
  if (currency === "TRY") {
    return locale ? new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(Math.round(tryAmount)) : tl(tryAmount);
  }

  const suppliedRate = rates?.[currency];
  const rate = typeof suppliedRate === "number" && Number.isFinite(suppliedRate) && suppliedRate > 0
    && Number.isFinite(tryAmount / suppliedRate) ? suppliedRate : DEFAULT_RATES[currency] || 1;
  const converted = tryAmount / rate;

  const localeMap: Record<CurrencyCode, string> = {
    TRY: "tr-TR",
    EUR: "de-DE",
    USD: "en-US",
    GBP: "en-GB",
    RUB: "ru-RU",
    CNY: "zh-CN",
    SAR: "ar-SA",
    AED: "ar-AE",
  };

  try {
    return new Intl.NumberFormat(locale || localeMap[currency] || "en-US", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(Math.round(converted));
  } catch {
    return `${Math.round(converted)} ${currency}`;
  }
}

/** Actual payments keep kuruş precision; estimated travel packages keep their existing format. */
export function fmtMoney(amountTry: number, currency: CurrencyCode = "TRY", rates?: Partial<Record<CurrencyCode, number>>, locale = "tr-TR"): string {
  const rate = currency === "TRY" ? 1 : rates?.[currency] ?? DEFAULT_RATES[currency];
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(amountTry / (typeof rate === "number" && Number.isFinite(rate) && rate > 0 && Number.isFinite(amountTry / rate) ? rate : DEFAULT_RATES[currency]));
}

export const num = (n: number) => new Intl.NumberFormat("tr-TR").format(Math.round(n));

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }, locale = "tr-TR") =>
  new Date(iso + "T12:00:00").toLocaleDateString(locale, opts);

export const fmtDuration = (min: number) => Number.isFinite(min) && min > 0 ? `${Math.floor(min / 60)}s ${min % 60}dk` : "Süre doğrulanmadı";

export const timeOf = (s: string) => {
  const minutes = timeMinutes(s);
  return minutes === null ? "Saat bekleniyor" : formatMinutes(minutes);
};

export function weatherIcon(code: number) {
  if (code === 0) return { icon: "☀️", label: "Açık" };
  if (code <= 2) return { icon: "🌤️", label: "Az bulutlu" };
  if (code <= 3) return { icon: "☁️", label: "Bulutlu" };
  if (code <= 48) return { icon: "🌫️", label: "Sisli" };
  if (code <= 67) return { icon: "🌧️", label: "Yağmurlu" };
  if (code <= 77) return { icon: "❄️", label: "Karlı" };
  if (code <= 82) return { icon: "🌦️", label: "Sağanak" };
  return { icon: "⛈️", label: "Fırtına" };
}

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}
