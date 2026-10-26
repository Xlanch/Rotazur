import "server-only";
import fs from "node:fs";
import path from "node:path";
import { cached, fetchJson } from "../server-utils";
import { CITIES } from "../cities";
import { readCurrencyRates, validExchangeRate, rateTimestamp, ratesAreRecent } from "../currency-rates";
import { isIsoDate } from "../travel-utils";

export interface Rates {
  TRY: number;
  EUR: number; // 1 EUR = x TRY
  USD: number; // 1 USD = x TRY
  GBP: number; // 1 GBP = x TRY
  RUB: number; // 1 RUB = x TRY
  CNY: number; // 1 CNY = x TRY
  SAR: number; // 1 SAR = x TRY
  AED: number; // 1 AED = x TRY
  localPerEur?: Record<string, number>; // Destination currencies: 1 EUR = x local units.
  updatedAt?: string;
  live: boolean;
}

const FALLBACK: Rates = {
  TRY: 1,
  EUR: 55.68,
  USD: 49.60,
  GBP: 66.30,
  RUB: 0.60,
  CNY: 7.40,
  SAR: 13.23,
  AED: 13.51,
  live: false,
};

const cacheFilePath = path.join(process.cwd(), "data", "currency_rates.json");
const CURRENCIES = ["EUR", "USD", "GBP", "RUB", "CNY", "SAR", "AED"] as const;
const LOCAL_CURRENCIES = [...new Set(["EUR", "USD", "GBP", "RUB", "CNY", "SAR", "AED", ...CITIES.map(city => city.currencyCode).filter((code): code is string => !!code)])];
const validRates = (rates: Record<string, number> | undefined) =>
  !!rates && CURRENCIES.every((code) => validExchangeRate(rates[code]));

function localRates(quotes: Record<string, number>): Record<string, number> {
  return Object.fromEntries(LOCAL_CURRENCIES.filter((code) => validExchangeRate(quotes[code]) && validExchangeRate(quotes[code] / quotes.EUR))
    .map((code) => [code, quotes[code] / quotes.EUR]));
}

/**
 * Dosyaya en güncel kurları yedekler
 */
function saveRatesToFile(rates: Rates) {
  try {
    const dir = path.dirname(cacheFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(cacheFilePath, JSON.stringify(rates, null, 2), "utf8");
  } catch {
    // ignore file write errors
  }
}

/**
 * Dosyadan son kaydedilmiş kurları okur
 */
function readRatesFromFile(): Rates | null {
  try {
    if (fs.existsSync(cacheFilePath)) {
      const raw = fs.readFileSync(cacheFilePath, "utf8");
      const rates = JSON.parse(raw);
      const table = readCurrencyRates(rates);
      if (!table) return null;
      const cross = rates.localPerEur;
      const localPerEur = cross && typeof cross === "object" && !Array.isArray(cross)
        ? Object.fromEntries(LOCAL_CURRENCIES.filter(code => validExchangeRate(cross[code])).map(code => [code, cross[code]]))
        : undefined;
      return { ...table, localPerEur, updatedAt: rateTimestamp(rates.updatedAt), live: false };
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Canlı Döviz Kurları Sağlayıcısı (8 Para Birimi)
 * open.er-api.com ve Frankfurter kaynaklarını kullanarak her gün günceller
 */
export async function getRates(): Promise<Rates> {
  const result = await cached("live_currency_rates_v5", 24 * 3600_000, async () => {
    // 1. Kaynak: Open ExchangeRate API (Tüm para birimleri mevcut)
    try {
      const data = await fetchJson<{
        result: string;
        rates: Record<string, number>;
        time_last_update_utc?: string;
      }>("https://open.er-api.com/v6/latest/TRY", undefined, 6000);

      if (data?.result === "success" && validRates(data.rates)) {
        const rates: Rates = {
          TRY: 1,
          USD: 1 / data.rates.USD,
          EUR: 1 / data.rates.EUR,
          GBP: 1 / data.rates.GBP,
          RUB: 1 / data.rates.RUB,
          CNY: 1 / data.rates.CNY,
          SAR: 1 / data.rates.SAR,
          AED: 1 / data.rates.AED,
          localPerEur: localRates(data.rates),
          updatedAt: rateTimestamp(data.time_last_update_utc),
          live: ratesAreRecent(data.time_last_update_utc),
        };

        saveRatesToFile(rates);
        return rates;
      }
    } catch (e) {
      console.warn("[Currency] open.er-api.com failed, trying fallback:", e);
    }

    // 2. Frankfurter v2 blended rates are free for commercial use and cover all seven quotes.
    try {
        const rows = await fetchJson<{ base: string; quote: string; rate: number; date: string }[]>(
          `https://api.frankfurter.dev/v2/rates?base=TRY&quotes=${LOCAL_CURRENCIES.join(",")}`, undefined, 6000);
        const quotes = Object.fromEntries(Array.isArray(rows) ? rows.filter((row) => row.base === "TRY").map((row) => [row.quote, row.rate]) : []);
        if (validRates(quotes) && rows.every((row) => isIsoDate(row.date))) {
          const rates: Rates = {
            TRY: 1,
            EUR: 1 / quotes.EUR,
            USD: 1 / quotes.USD,
            GBP: 1 / quotes.GBP,
            CNY: 1 / quotes.CNY,
            RUB: 1 / quotes.RUB,
            SAR: 1 / quotes.SAR,
            AED: 1 / quotes.AED,
            localPerEur: localRates(quotes),
            updatedAt: rateTimestamp(rows.map((row) => row.date).sort()[0]),
            live: rows.every(row => ratesAreRecent(row.date)),
          };

          saveRatesToFile(rates);
          return rates;
        }
    } catch { /* Use the previous stored rates, clearly marked as not live. */ }

    // 3. Dosyadaki son kaydedilmiş kurları kullan
    const fileRates = readRatesFromFile();
    if (fileRates) {
      return { ...fileRates, live: false };
    }

    return FALLBACK;
  });
  return { ...result, live: result.live && ratesAreRecent(result.updatedAt) };
}
