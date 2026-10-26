#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runWeatherSync } from './weather-sync.mjs';
import engine from '../src/lib/automation/flight-sync.cjs';
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (fs.existsSync(path.join(rootDir, '.env.local'))) loadEnvFile(path.join(rootDir, '.env.local'));
const safeHttpGet = engine.requestJson;
export async function runCurrencySync() {
  console.log('\n💱 [DÖVİZ] Canlı Merkez Bankası & Global Kurlar Senkronize Ediliyor...');
  try {
    const data = await safeHttpGet('https://open.er-api.com/v6/latest/TRY', 8000);
    if (data?.result === 'success' && ['USD', 'EUR', 'GBP', 'RUB', 'CNY', 'SAR', 'AED'].every(code => Number.isFinite(data.rates?.[code]) && data.rates[code] > 0)) {
      const rates = {
        TRY: 1,
        USD: 1 / data.rates.USD,
        EUR: 1 / data.rates.EUR,
        GBP: 1 / data.rates.GBP,
        RUB: 1 / data.rates.RUB,
        CNY: 1 / data.rates.CNY,
        SAR: 1 / data.rates.SAR,
        AED: 1 / data.rates.AED,
        localPerEur: Object.fromEntries(Object.entries(data.rates)
          .filter(([, rate]) => Number.isFinite(rate) && rate > 0)
          .map(([code, rate]) => [code, rate / data.rates.EUR])),
        updatedAt: data.time_last_update_utc || new Date().toISOString(),
        provider: 'ExchangeRate-API Global Sync',
        live: true,
      };

      const dataDir = path.join(rootDir, 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const currencyFile = path.join(dataDir, 'currency_rates.json');
      fs.writeFileSync(currencyFile, JSON.stringify(rates, null, 2), 'utf8');
      console.log(`[✓] 8 Global Para Birimi Güncellendi:`);
      console.log(`    1 USD = ${rates.USD} ₺ | 1 EUR = ${rates.EUR} ₺ | 1 GBP = ${rates.GBP} ₺`);
      console.log(`    1 SAR = ${rates.SAR} ₺ | 1 AED = ${rates.AED} ₺ | 1 CNY = ${rates.CNY} ₺ | 1 RUB = ${rates.RUB} ₺`);
      console.log(`[✓] Kaydedilen dosya: ${currencyFile}`);
      return rates;
    }
  } catch (err) {
    console.warn("Döviz kaynağına erişilemedi; mevcut kurlar korundu.");
  }
}


export async function main() {
  const result = await engine.syncFlights({ root: rootDir });
  console.log(JSON.stringify({ provider: result.provider, timeZone: result.timeZone, nextScheduledSync: result.nextScheduledSync, ...result.stats }));
  // Group capacity is not verified by Data API; do not trigger price alarms or email.
  await runCurrencySync();
  try { await runWeatherSync(); } catch { console.warn('Hava durumu güncellenemedi; mevcut kayıtlar korundu.'); }
  if (result.stats.errors || result.stats.skipped) process.exitCode = 1;
  return result;
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(() => { console.error('Güncelleme tamamlanamadı; anahtarları ve ağ bağlantısını kontrol edin.'); process.exitCode = 1; });
}
