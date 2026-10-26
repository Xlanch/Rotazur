import fs from "node:fs";
import path from "node:path";
import { CITIES } from "../cities";
import { db } from "../db";
import { CITY_CLIMATE_GUIDES, getWeatherInfo, type ClimateProfile } from "../weather/city-climate";
import { getForecast, ZONES, SOURCE, atomicWrite, dateInZone } from "../weather/met-client.cjs";

export interface WeatherForecastDay {
  date: string; dayName: string; minTemp: number; maxTemp: number;
  weatherCode: number; description: string; icon: string; rainProb: number | null;
}
export interface CityDailyWeather {
  cityId: string; cityName: string; country: string; flag: string; lat: number; lon: number;
  source: "MET Norway"; expiresAt: number; timeZone: string;
  current: {
    temp: number; weatherCode: number; description: string; icon: string;
    windSpeed: number | null; isDay: boolean | null; updatedAt: string; validAt: string;
  };
  forecast: WeatherForecastDay[];
  climateGuide: ClimateProfile & { currentSeasonVerdict: string };
}
export interface SyncedWeatherData {
  provider: "MET Norway"; lastSync: string; nextScheduledSync: string;
  totalCities: number; cities: Record<string, CityDailyWeather>;
}

const CACHE_FILE = path.join(process.cwd(), "data", "daily_met_weather_v1.json");
const TURKISH_DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const pending = new Map<string, Promise<CityDailyWeather | null>>();
let weatherSyncInFlight: Promise<SyncedWeatherData> | null = null;
let lastAttempt = 0;

function climateGuide(city: (typeof CITIES)[number]): CityDailyWeather["climateGuide"] {
  const base = CITY_CLIMATE_GUIDES[city.id] || {
    idealMonths: "İlkbahar & Sonbahar", idealSeason: "Ilıman dönemler",
    summary: `${city.name} için mevsim koşullarını seyahat öncesinde kontrol edin.`,
    seasonTips: { spring: "Katmanlı giysiler alın.", summer: "Güneşten korunun.", autumn: "Yağmurluk bulundurun.", winter: "Soğuk havaya hazırlıklı olun." },
    packingTips: "Mevsime uygun giysiler ve rahat ayakkabılar.", bestFor: "Şehir gezileri",
  };
  const localMonth = Number(dateInZone(Date.now(), ZONES[city.id] || "Europe/Istanbul").slice(5, 7));
  const month = city.lat < 0 ? (localMonth + 5) % 12 + 1 : localMonth;
  const season = month >= 3 && month <= 5 ? "spring" : month >= 6 && month <= 8 ? "summer" : month >= 9 && month <= 11 ? "autumn" : "winter";
  return { ...base, currentSeasonVerdict: base.seasonTips[season] };
}

/** Compatibility for the scheduler status endpoint. Uses the provider's next permitted refresh. */
export function getNext0400AmIso(): string {
  return getLatestSyncedWeather()?.nextScheduledSync || new Date(Date.now() + 30 * 60_000).toISOString();
}

export function getLatestSyncedWeather(): SyncedWeatherData | null {
  try {
    const value = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    if (value.provider !== SOURCE || !value.cities || !Number.isFinite(Date.parse(value.lastSync))) return null;
    return value as SyncedWeatherData;
  } catch { return null; }
}

export function isWeatherSyncStale(): boolean {
  const data = getLatestSyncedWeather();
  return !data || Date.parse(data.nextScheduledSync) <= Date.now() || !Number.isFinite(Date.parse(data.nextScheduledSync));
}

export function getCityWeather(cityId: string): CityDailyWeather | null {
  const city = CITIES.find((c) => c.id === cityId);
  const item = getLatestSyncedWeather()?.cities[cityId];
  // Reject old provider data and forecasts which can no longer describe today's conditions.
  if (!city || item?.source !== SOURCE || !Number.isFinite(Date.parse(item.current?.validAt)) ||
      Date.parse(item.current.validAt) < Date.now() - 12 * 3600_000) return null;
  return { ...item, climateGuide: climateGuide(city) };
}

function saveCity(item: CityDailyWeather) {
  const previous = getLatestSyncedWeather();
  const cities = { ...(previous?.cities || {}), [item.cityId]: item };
  const now = Date.now();
  const next = Math.max(now + 60_000, Math.min(...Object.values(cities).map((c) => c.expiresAt)));
  atomicWrite(CACHE_FILE, { provider: SOURCE, lastSync: new Date().toISOString(), nextScheduledSync: new Date(next).toISOString(), totalCities: Object.keys(cities).length, cities });
  try {
    db.prepare(`INSERT OR REPLACE INTO daily_weather_sync
      (city_id, city_name, country, temp, weather_code, description, icon, data_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).run(
        item.cityId, item.cityName, item.country, item.current.temp, item.current.weatherCode,
        item.current.description, item.current.icon, JSON.stringify(item));
  } catch { console.warn("[weather-sync] SQLite hava durumu yedeği yazılamadı."); }
}

export function ensureCityWeather(cityId: string): Promise<CityDailyWeather | null> {
  const existing = getCityWeather(cityId);
  if (existing && existing.expiresAt > Date.now()) return Promise.resolve(existing);
  if (pending.has(cityId)) return pending.get(cityId)!;
  const task = (async () => {
    const city = CITIES.find((c) => c.id === cityId);
    if (!city) return null;
    try {
      const data = await getForecast(city.lat, city.lon, ZONES[city.id]);
      const info = getWeatherInfo(data.current.weatherCode);
      const item: CityDailyWeather = {
        cityId: city.id, cityName: city.name, country: city.country, flag: city.flag, lat: city.lat, lon: city.lon,
        source: SOURCE, expiresAt: data.expiresAt, timeZone: data.timeZone,
        current: { ...data.current, description: info.description, icon: info.icon, updatedAt: data.generatedAt },
        forecast: data.days.slice(0, 7).map((day) => ({
          date: day.date, dayName: TURKISH_DAYS[new Date(day.date + "T12:00:00Z").getUTCDay()],
          minTemp: day.min, maxTemp: day.max, weatherCode: day.code,
          ...getWeatherInfo(day.code), rainProb: day.rainProb,
        })),
        climateGuide: climateGuide(city),
      };
      saveCity(item);
      return item;
    } catch {
      console.warn(`[weather-sync] ${city.id} için güncel tahmin alınamadı.`);
      return existing;
    }
  })().finally(() => pending.delete(cityId));
  pending.set(cityId, task);
  return task;
}

/** Called only by an active page or the existing explicit scheduler. Provider Expires is always respected. */
export function syncAllDailyWeather(force = false): Promise<SyncedWeatherData> {
  if (weatherSyncInFlight) return weatherSyncInFlight;
  const cached = getLatestSyncedWeather();
  if (cached && ((!force && cached.totalCities === CITIES.length && !isWeatherSyncStale()) || Date.now() - lastAttempt < 10 * 60_000)) return Promise.resolve(cached);
  lastAttempt = Date.now();
  weatherSyncInFlight = (async () => {
    for (const city of CITIES) {
      await ensureCityWeather(city.id);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    const data = getLatestSyncedWeather();
    if (!data) throw new Error("Hava durumu kaynağına şu an ulaşılamıyor.");
    return data;
  })().finally(() => { weatherSyncInFlight = null; });
  return weatherSyncInFlight;
}
