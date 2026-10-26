#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import met from "../src/lib/weather/met-client.cjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Warms the same commercial-use cache as the application, always honoring MET expiry headers. */
export async function runWeatherSync() {
  const cities = JSON.parse(fs.readFileSync(path.join(rootDir, "data", "cities_coords.json"), "utf8"));
  const client = met.createMetClient({ cacheDir: path.join(rootDir, "data", "met-weather-v1") });
  let successCount = 0;
  for (const city of cities) {
    try {
      await client.getForecast(city.lat, city.lon, met.ZONES[city.id]);
      successCount++;
      console.log(`[weather-sync] ✓ ${city.name} — MET Norway`);
    } catch {
      console.warn(`[weather-sync] ${city.name} tahmini alınamadı; önceki önbellek korunuyor.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  console.log(`[weather-sync] ${successCount}/${cities.length} şehir; CC BY 4.0, ücretli API kullanılmadı.`);
  return { totalCities: successCount };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runWeatherSync().catch(() => { console.error("[weather-sync] Senkronizasyon başarısız."); process.exitCode = 1; });
}
