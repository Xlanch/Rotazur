const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const met = require("../src/lib/weather/met-client.cjs");
const { createLoader } = require("./test-helpers.cjs");

const now = Date.parse("2026-10-22T16:00:00Z");
const point = (time, temp, symbol = "rain_day", extra = {}) => ({ time, data: {
  instant: { details: { air_temperature: temp, wind_speed: 5, ...extra } },
  next_6_hours: { summary: { symbol_code: symbol }, details: {} },
} });
const fixture = () => ({ properties: { meta: { updated_at: "2026-10-22T15:00:00Z" }, timeseries: [
  point("2026-10-22T16:00:00Z", 12), point("2026-10-22T22:00:00Z", 8),
  point("2026-10-23T04:00:00Z", 7), point("2026-10-23T10:00:00Z", 19, "fair_day"),
] } });
function temporary(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rotazur-commercial-"));
  t.after(() => {
    assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}
function response(data, headers = {}, status = 200) {
  return new Response(status === 304 ? null : JSON.stringify(data), { status, headers });
}

test("MET daily summaries respect destination dates, measured units and missing values", () => {
  const data = met.summarize(fixture(), "Europe/Rome", now);
  assert.equal(data.current.windSpeed, 18); // m/s -> km/h
  assert.equal(data.days[0].date, "2026-10-22");
  assert.deepEqual([data.days[1].min, data.days[1].max], [7, 19]);
  assert.ok(data.days.every((day) => day.rainProb === null));
  assert.equal(met.summarize(fixture(), "Asia/Tokyo", now).days[0].date, "2026-10-23");
  assert.equal(met.weatherCode("heavyrainshowersandthunder_night"), 95);
  assert.equal(met.weatherCode("sleet_day"), 66);
  assert.equal(met.weatherCode(undefined), -1);
  const missing = fixture();
  missing.properties.timeseries[0].data.instant.details.wind_speed = null;
  assert.equal(met.summarize(missing, "Europe/Rome", now).current.windSpeed, null);
  assert.throws(() => met.summarize({}, "Europe/Rome", now));
  assert.throws(() => met.summarize(fixture(), "Europe/Rome", now + 5 * 86400_000));
});

test("MET caches until Expires across client instances and identifies requests at four decimals", async (t) => {
  const cacheDir = temporary(t);
  let calls = 0;
  const fetchImpl = async (url, init) => {
    calls++;
    assert.match(url, /lat=41\.9028&lon=12\.4964$/);
    assert.match(init.headers["User-Agent"], /rotazur\.com\/contact/);
    return response(fixture(), { expires: new Date(now + 3600_000).toUTCString(), "last-modified": new Date(now - 3600_000).toUTCString() });
  };
  const options = { cacheDir, now: () => now, fetchImpl };
  const client = met.createMetClient(options);
  await Promise.all(Array.from({ length: 8 }, () => client.getForecast(41.902899, 12.496499, "Europe/Rome")));
  assert.equal(calls, 1);
  await met.createMetClient(options).getForecast(41.902899, 12.496499, "Europe/Rome");
  assert.equal(calls, 1);
});

test("MET revalidates expired forecasts with the exact Last-Modified and accepts 304", async (t) => {
  const cacheDir = temporary(t);
  let clock = now;
  let calls = 0;
  const modified = new Date(now - 3600_000).toUTCString();
  const client = met.createMetClient({ cacheDir, now: () => clock, fetchImpl: async (_, init) => {
    calls++;
    if (calls === 1) return response(fixture(), { expires: new Date(now + 60_000).toUTCString(), "last-modified": modified });
    assert.equal(init.headers["If-Modified-Since"], modified);
    return response(null, { expires: new Date(now + 3600_000).toUTCString() }, 304);
  } });
  await client.getForecast(41, 12, "Europe/Rome");
  clock += 61_000;
  const result = await client.getForecast(41, 12, "Europe/Rome");
  assert.equal(result.current.temp, 12);
  await client.getForecast(41, 12, "Europe/Rome");
  assert.equal(calls, 2);
});

test("MET respects rate-limit backoff for other cities and across restarts", async (t) => {
  const cacheDir = temporary(t);
  let calls = 0;
  const options = { cacheDir, now: () => now, fetchImpl: async () => { calls++; return response({}, { "retry-after": "3600" }, 429); } };
  const client = met.createMetClient(options);
  await assert.rejects(client.getForecast(41, 12));
  await assert.rejects(client.getForecast(42, 13));
  await assert.rejects(met.createMetClient(options).getForecast(41, 12));
  assert.equal(calls, 1);
});

test("unavailable MET keeps a usable previous forecast and avoids repeated retries", async (t) => {
  const cacheDir = temporary(t);
  let clock = now;
  let calls = 0;
  const client = met.createMetClient({ cacheDir, now: () => clock, fetchImpl: async () => {
    if (++calls > 1) throw new Error("test outage");
    return response(fixture(), { expires: new Date(now + 60_000).toUTCString() });
  } });
  await client.getForecast(41, 12);
  clock += 61_000;
  assert.equal((await client.getForecast(41, 12)).source, "MET Norway");
  await client.getForecast(41, 12);
  assert.equal(calls, 2);
});

test("trip weather requires coverage of the whole date range and never queries historical endpoints", async () => {
  let calls = 0;
  const today = met.dateInZone(Date.now(), "Europe/Rome");
  const tomorrow = new Date(Date.parse(today + "T12:00:00Z") + 86400_000).toISOString().slice(0, 10);
  const load = createLoader({
    "../weather/met-client.cjs": { ...met, getForecast: async () => { calls++; return { source: "MET Norway", days: [{ date: today, max: 20, min: 10, code: 2 }] }; } },
    "../cities": { CITIES: [{ id: "roma", lat: 41, lon: 12 }] },
  });
  const { getWeather } = load("src/lib/providers/weather.ts");
  assert.equal((await getWeather(41, 12, today, today)).source, "MET Norway");
  assert.equal(await getWeather(41, 12, today, tomorrow), null);
  assert.equal(await getWeather(41, 12, "2099-01-01", "2099-01-02"), null);
  assert.equal(await getWeather(41, 12, "2020-02-29", "2020-03-01"), null);
  assert.equal(calls, 2);
});

test("commercial app and scheduler use only the shared MET source; all city time zones exist", () => {
  const files = ["src/lib/providers/weather.ts", "src/lib/automation/weather-sync-engine.ts", "scripts/weather-sync.mjs"];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /api\.open-meteo\.com|archive-api\.open-meteo\.com/);
    assert.match(source, /met-client\.cjs/);
  }
  for (const city of require("../data/cities_coords.json")) assert.ok(met.ZONES[city.id], city.id);
  const map = fs.readFileSync("src/components/MapView.tsx", "utf8");
  assert.doesNotMatch(map, /server\.arcgisonline\.com/);
  assert.match(map, /attributionControl: true/);
});

test("commercial currency fallback supplies all seven real quotes instead of invented RUB or pegs", async () => {
  const quotes = { EUR: 0.02, USD: 0.025, GBP: 0.016, RUB: 1.7, CNY: 0.14, SAR: 0.09, AED: 0.088 };
  let written;
  const load = createLoader({
    "node:fs": { existsSync: () => true, writeFileSync: (_, value) => { written = JSON.parse(value); } },
    "../server-utils": {
      cached: async (_, ttl, callback) => { assert.equal(ttl, 24 * 3600_000); return callback(); },
      fetchJson: async (url) => url.includes("open.er-api")
        ? { result: "success", rates: { USD: 0.025 } } // incomplete success must trigger fallback
        : Object.entries(quotes).map(([quote, rate]) => ({ base: "TRY", quote, rate, date: "2026-10-22" })),
    },
  });
  const rates = await load("src/lib/providers/currency.ts").getRates();
  for (const [code, quote] of Object.entries(quotes)) assert.equal(rates[code], 1 / quote);
  assert.equal(rates.live, true);
  assert.equal(written.RUB, 1 / quotes.RUB);
  assert.equal(written.updatedAt, "2026-10-22");
});

test("incomplete currency feeds preserve previous valid data and never label estimates as live", async () => {
  const previous = { TRY: 1, EUR: 50, USD: 40, GBP: 60, RUB: 0.6, CNY: 6, SAR: 11, AED: 11.1, updatedAt: "2026-10-21", live: true };
  const load = createLoader({
    "node:fs": { existsSync: () => true, readFileSync: () => JSON.stringify(previous), writeFileSync: () => { throw new Error("Must not store invalid live feed"); } },
    "../server-utils": { cached: (_, __, callback) => callback(), fetchJson: async (url) => url.includes("open.er-api")
      ? { result: "success", rates: { USD: Infinity } }
      : [{ base: "TRY", quote: "USD", rate: 0.025, date: "2026-10-22" }] },
  });
  const rates = await load("src/lib/providers/currency.ts").getRates();
  assert.equal(rates.live, false);
  assert.equal(rates.RUB, previous.RUB);
  assert.equal(rates.updatedAt, previous.updatedAt);
});

test("legacy weather cache cannot be relabelled as MET data", () => {
  const legacy = { lastSync: new Date().toISOString(), cities: { roma: { current: { temp: 25 } } } };
  const load = createLoader({
    "node:fs": { readFileSync: (filename) => { assert.match(filename, /daily_met_weather_v1\.json$/); return JSON.stringify(legacy); } },
    "../db": { db: {} },
  });
  assert.equal(load("src/lib/automation/weather-sync-engine.ts").getLatestSyncedWeather(), null);
});
