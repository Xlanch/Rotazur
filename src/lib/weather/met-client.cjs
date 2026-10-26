const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const SOURCE = "MET Norway";
const SOURCE_URL = "https://api.met.no/";
const LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
const USER_AGENT = "Rotazur/1.0 (https://rotazur.com/contact; destekrotazur@gmail.com)";
const ZONES = Object.fromEntries(require("../data/destinations.json").map(city => [city.id, city.timeZone]));

function dateInZone(instant, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(instant));
  const part = (type) => parts.find((p) => p.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function weatherCode(symbol) {
  const name = String(symbol || "").replace(/_(day|night|polartwilight)$/, "");
  if (name.includes("thunder")) return 95;
  if (name.includes("snow")) return name.includes("heavy") ? 75 : name.includes("light") ? 71 : 73;
  if (name.includes("sleet")) return 66;
  if (name.includes("rainshowers")) return name.includes("heavy") ? 82 : name.includes("light") ? 80 : 81;
  if (name.includes("rain")) return name.includes("heavy") ? 65 : name.includes("light") ? 61 : 63;
  return { clearsky: 0, fair: 1, partlycloudy: 2, cloudy: 3, fog: 45 }[name] ?? -1;
}

function summarize(data, timeZone, now = Date.now()) {
  const series = data?.properties?.timeseries;
  if (!Array.isArray(series) || !Number.isFinite(Date.parse(data?.properties?.meta?.updated_at))) throw new Error("Geçersiz MET yanıtı");
  const points = series.filter((p) => Number.isFinite(Date.parse(p.time)) && Number.isFinite(p.data?.instant?.details?.air_temperature));
  const current = points.find((p) => Date.parse(p.time) >= now - 3600_000);
  if (!current || Date.parse(current.time) > now + 6 * 3600_000) throw new Error("Güncel tahmin bulunamadı");
  const period = (p) => p.data.next_1_hours || p.data.next_6_hours || p.data.next_12_hours;
  const symbol = period(current)?.summary?.symbol_code;
  const details = current.data.instant.details;
  const days = new Map();
  const today = dateInZone(now, timeZone);
  for (const p of points) {
    const date = dateInZone(p.time, timeZone);
    if (date < today) continue;
    const temperature = p.data.instant.details.air_temperature;
    const code = weatherCode(period(p)?.summary?.symbol_code);
    const day = days.get(date) || { date, min: temperature, max: temperature, code, rainProb: null };
    day.min = Math.min(day.min, temperature);
    day.max = Math.max(day.max, temperature);
    day.code = Math.max(day.code, code);
    const probability = period(p)?.details?.probability_of_precipitation;
    if (Number.isFinite(probability) && probability >= 0 && probability <= 100) day.rainProb = Math.max(day.rainProb ?? 0, probability);
    days.set(date, day);
  }
  return {
    source: SOURCE, sourceUrl: SOURCE_URL, licenseUrl: LICENSE_URL,
    generatedAt: data.properties.meta.updated_at, timeZone,
    current: {
      temp: Math.round(details.air_temperature * 10) / 10,
      weatherCode: weatherCode(symbol),
      windSpeed: Number.isFinite(details.wind_speed) ? Math.round(details.wind_speed * 3.6) : null,
      isDay: symbol?.endsWith("_day") ? true : symbol?.endsWith("_night") ? false : null,
      validAt: current.time,
    },
    days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({ ...d, min: Math.round(d.min), max: Math.round(d.max) })),
  };
}

function atomicWrite(filename, value) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(value), "utf8");
    fs.renameSync(temporary, filename);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

/** Shared server-only adapter: CC BY 4.0 data, no key or paid fallback. */
function createMetClient({ cacheDir = path.join(process.cwd(), "data", "met-weather-v1"), fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  const pending = new Map();
  let blockedUntil = 0;
  async function read(lat, lon, timeZone) {
    if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lon) || Math.abs(lon) > 180) throw new Error("Geçersiz koordinat");
    const coordinate = (n) => (Math.trunc(n * 10000) / 10000).toFixed(4);
    const key = `${coordinate(lat)}_${coordinate(lon)}`;
    const filename = path.join(cacheDir, `${key}.json`);
    let entry;
    try { entry = JSON.parse(fs.readFileSync(filename, "utf8")); } catch { /* Cold cache. */ }
    if (entry?.provider !== SOURCE) entry = undefined;
    if ((entry?.expiresAt ?? 0) > now() || (entry?.retryAt ?? 0) > now() || blockedUntil > now()) {
      if (!entry?.data) throw new Error("Hava durumu kaynağı geçici olarak beklemede");
      return { ...summarize(entry.data, timeZone, now()), expiresAt: Math.max(entry.expiresAt || 0, entry.retryAt || 0, blockedUntil) };
    }
    const headers = { "User-Agent": USER_AGENT, Accept: "application/json" };
    if (entry?.lastModified) headers["If-Modified-Since"] = entry.lastModified;
    try {
      const response = await fetchImpl(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${coordinate(lat)}&lon=${coordinate(lon)}`, { headers, signal: AbortSignal.timeout(10000) });
      const expiry = Date.parse(response.headers.get("expires") || "");
      const expiresAt = Number.isFinite(expiry) && expiry > now() ? expiry : now() + 30 * 60_000;
      if (response.status === 429 || response.status === 403) {
        const retry = response.headers.get("retry-after");
        const retryAt = retry && /^\d+$/.test(retry) ? now() + Number(retry) * 1000 : Date.parse(retry || "");
        blockedUntil = Math.max(now() + 10 * 60_000, Number.isFinite(retryAt) ? retryAt : 0);
        throw new Error("MET istekleri geçici olarak sınırlandı");
      }
      if (response.status === 304 && entry?.data) entry = { ...entry, expiresAt, retryAt: 0 };
      else {
        if (!response.ok) throw new Error(`MET HTTP ${response.status}`);
        const data = await response.json();
        summarize(data, timeZone, now());
        entry = { provider: SOURCE, expiresAt, lastModified: response.headers.get("last-modified"), data };
      }
      atomicWrite(filename, entry);
      return { ...summarize(entry.data, timeZone, now()), expiresAt };
    } catch (error) {
      const retryAt = Math.max(now() + 10 * 60_000, blockedUntil);
      atomicWrite(filename, { ...entry, provider: SOURCE, retryAt });
      if (entry?.data) return { ...summarize(entry.data, timeZone, now()), expiresAt: retryAt };
      throw error;
    }
  }
  return {
    async getForecast(lat, lon, timeZone = "Europe/Istanbul") {
      const key = `${lat}:${lon}:${timeZone}`;
      if (!pending.has(key)) pending.set(key, read(lat, lon, timeZone).finally(() => pending.delete(key)));
      return pending.get(key);
    },
  };
}

const client = createMetClient();
module.exports = { SOURCE, SOURCE_URL, LICENSE_URL, USER_AGENT, ZONES, dateInZone, weatherCode, summarize, atomicWrite, createMetClient, getForecast: client.getForecast };
