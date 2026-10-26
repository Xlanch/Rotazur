import { DEFAULT_RATES, type CurrencyCode } from "./format";

export const CURRENCY_CODES = Object.keys(DEFAULT_RATES) as CurrencyCode[];

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && Object.hasOwn(DEFAULT_RATES, value);
}

export function validExchangeRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    && Number.isFinite(1 / value) && 1 / value > 0;
}

/** The API and persisted cache must contain a complete, consistently based table. */
export function readCurrencyRates(value: unknown): Record<CurrencyCode, number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const table = value as Record<string, unknown>;
  if (table.TRY !== 1 || !CURRENCY_CODES.every(code => validExchangeRate(table[code]))) return null;
  return Object.fromEntries(CURRENCY_CODES.map(code => [code, table[code]])) as Record<CurrencyCode, number>;
}

/** Unknown/future dates must not turn reference rates into freshly updated quotes. */
export function rateTimestamp(value: unknown, now = Date.now()): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const time = Date.parse(value);
  return Number.isFinite(time) && time <= now + 5 * 60_000 ? value : undefined;
}

export function ratesAreRecent(value: unknown, now = Date.now()): boolean {
  const timestamp = rateTimestamp(value, now);
  return !!timestamp && Date.parse(timestamp) >= now - 7 * 86400_000;
}
