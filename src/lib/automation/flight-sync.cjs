// Shared by the server and the local scheduler. Only the free Aviasales Data API.
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const crypto = require('node:crypto');
const cities = require('../data/destinations.json');
const { aviasalesUrl } = require('../flight-links.cjs');
const ORIGINS = ['IST', 'SAW', 'ESB', 'ADB', 'AYT'];
const TTL = 12 * 3600_000;
const PROVIDER = 'travelpayouts-data-api';
const dateOnly = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(?:$|T| )/.test(v) && Number.isFinite(Date.parse(v.slice(0, 10))) && new Date(v.slice(0, 10)).toISOString().slice(0, 10) === v.slice(0, 10) ? v.slice(0, 10) : null;
const positive = v => typeof v === 'number' && Number.isFinite(v) && v > 0;
const count = v => Number.isInteger(v) && v >= 0 && v <= 10 ? v : undefined;
const duration = v => positive(v) && v < 10000 ? v : undefined;
function searchLink(origin, destination, start, end) {
  return aviasalesUrl(origin, destination, start, end);
}
function safeLink(value, fallback) {
  try {
    if (typeof value !== 'string' || value.length > 3000) return fallback;
    const url = new URL(value, 'https://www.aviasales.com');
    return url.protocol === 'https:' && ['www.aviasales.com', 'aviasales.com'].includes(url.hostname) && !url.username && !url.password && !url.port ? url.href : fallback;
  } catch { return fallback; }
}
function normalizeFare(fare, origin, destination, now = Date.now()) {
  if (!fare || !/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) return null;
  // The source uses city codes (ANK/ROM) alongside actual airports (ESB/FCO).
  // Match the airport when supplied; never silently substitute another airport.
  if ((fare.origin_airport ? fare.origin_airport !== origin : fare.origin && fare.origin !== origin)
    || (fare.destination_airport ? fare.destination_airport !== destination : fare.destination && fare.destination !== destination)) return null;
  const start = dateOnly(fare.departure_at), end = dateOnly(fare.return_at);
  if (!start || !end || start < new Intl.DateTimeFormat('en-CA', { timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date(now)) || end <= start || (Date.parse(end) - Date.parse(start)) / 86400000 > 14 || !positive(fare.price) || fare.price > 100_000_000 || fare.one_way === true
    || (fare.currency !== undefined && (typeof fare.currency !== 'string' || fare.currency.toLowerCase() !== 'try'))) return null;
  const timestamp = value => typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) ? Date.parse(value) : NaN;
  const foundAt = fare.found_at === undefined ? undefined : timestamp(fare.found_at);
  const expiresAt = fare.expires_at === undefined ? undefined : timestamp(fare.expires_at);
  if ((foundAt !== undefined && (!Number.isFinite(foundAt) || foundAt > now + 60_000 || now - foundAt > 48 * 3600_000))
    || (expiresAt !== undefined && (!Number.isFinite(expiresAt) || expiresAt <= now))) return null;
  // Explicit offsets allow chronological validation without guessing airport time zones.
  for (const value of [fare.departure_at, fare.return_at]) if (value.length > 10 && !/^\d{4}-\d{2}-\d{2}[T ](?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):?[0-5]\d)?$/.test(value)) return null;
  if (/[Zz]|[+-]\d{2}:?\d{2}$/.test(fare.departure_at) && timestamp(fare.departure_at) < now) return null;
  const carrier = typeof fare.airline === 'string' && /^[A-Z0-9]{2,3}$/.test(fare.airline) ? fare.airline : '';
  return {
    origin, destIata: destination, originAirport: fare.origin_airport, destinationAirport: fare.destination_airport,
    priceRoundTripTry: fare.price, departDate: start, returnDate: end,
    departure: fare.departure_at, returnDeparture: fare.return_at,
    arrival: typeof fare.arrival_at === 'string' && dateOnly(fare.arrival_at) ? fare.arrival_at : '',
    returnArrival: typeof fare.return_arrival_at === 'string' && dateOnly(fare.return_arrival_at) ? fare.return_arrival_at : '',
    airline: carrier || 'Havayolu bilgisi doğrulanmadı', carrier,
    flightNumber: (Number.isInteger(fare.flight_number) && fare.flight_number >= 0 && fare.flight_number <= 99999) || typeof fare.flight_number === 'string' && /^[A-Z0-9 -]{1,20}$/i.test(fare.flight_number) ? String(fare.flight_number) : undefined,
    foundAt: foundAt === undefined ? undefined : new Date(foundAt).toISOString(), expiresAt: expiresAt === undefined ? undefined : new Date(expiresAt).toISOString(),
    durationMin: duration(fare.duration_to), returnDurationMin: duration(fare.duration_back),
    stops: count(fare.transfers), returnStops: count(fare.return_transfers),
    deepLink: safeLink(fare.link, searchLink(origin, destination, start, end)),
    updatedAt: new Date(now).toISOString(), priceKind: 'indicative', pricedAdults: 1,
    availabilityVerified: false, provider: PROVIDER,
  };
}
function requestJson(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { family: 4, headers: { Accept: 'application/json', 'User-Agent': 'Rotazur/3.0' } }, res => {
      if (res.statusCode !== 200) {
        res.resume(); const err = new Error('Uçuş kaynağına erişilemedi.'); err.status = res.statusCode; reject(err); return;
      }
      let raw = '', size = 0;
      res.on('data', chunk => { size += chunk.length; if (size > 4 * 1024 * 1024) req.destroy(new Error('Yanıt sınırı aşıldı.')); else raw += chunk; });
      res.on('error', () => reject(new Error('Uçuş kaynağı yanıtı tamamlanamadı.')));
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { reject(new Error('Geçersiz uçuş yanıtı.')); } });
    });
    const timer = setTimeout(() => req.destroy(new Error('Uçuş kaynağı zaman aşımı.')), timeoutMs);
    req.on('close', () => clearTimeout(timer));
    req.on('error', () => reject(new Error('Uçuş kaynağına erişilemedi.')));
  });
}
const cachePath = root => path.join(root, 'data', 'daily_live_prices.json');
function readCache(root = process.cwd()) {
  try {
    const file = cachePath(root);
    if (fs.statSync(file).size > 8 * 1024 * 1024) return null;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data.version !== 3 || data.provider !== PROVIDER || !data.routes || !Number.isFinite(Date.parse(data.lastSync))) return null;
    const routes = {};
    for (const [key, r] of Object.entries(data.routes)) {
      if (!r || key !== `${r.origin}-${r.destIata}` || r.provider !== PROVIDER || r.priceKind !== 'indicative' || r.pricedAdults !== 1 || r.availabilityVerified !== false || !Number.isFinite(Date.parse(r.updatedAt))) continue;
      const normalized = normalizeFare({ price: r.priceRoundTripTry, departure_at: r.departure, return_at: r.returnDeparture, airline: r.carrier, link: r.deepLink, origin_airport: r.originAirport, destination_airport: r.destinationAirport, duration_to: r.durationMin, duration_back: r.returnDurationMin, transfers: r.stops, return_transfers: r.returnStops, arrival_at: r.arrival, return_arrival_at: r.returnArrival, flight_number: r.flightNumber, found_at:r.foundAt, expires_at:r.expiresAt }, r.origin, r.destIata, Date.parse(r.updatedAt));
      if (normalized && normalized.departDate === r.departDate && normalized.returnDate === r.returnDate) routes[key] = { ...normalized, cityId: r.cityId, cityName: r.cityName, cityIds: r.cityIds };
    }
    return { ...data, routes, totalRoutes: Object.keys(routes).length };
  } catch { return null; }
}
function freshRoute(origin, destination, start, end, root = process.cwd(), now = Date.now()) {
  const r = readCache(root)?.routes[`${origin}-${destination}`];
  const age = r ? now - Date.parse(r.updatedAt) : Infinity;
  return r && age >= 0 && age < TTL && (!/(?:Z|[+-]\d{2}:?\d{2})$/.test(r.departure) || Date.parse(r.departure) >= now) && (!r.expiresAt || Date.parse(r.expiresAt) > now) && (!r.foundAt || now - Date.parse(r.foundAt) <= 48 * 3600_000) && r.departDate === start && r.returnDate === end ? r : null;
}
function isStale(data, now = Date.now()) {
  const age = data ? now - Date.parse(data.lastSync) : Infinity;
  return !data || data.stats?.errors > 0 || data.stats?.skipped > 0 || age < 0 || age >= TTL;
}
function nextScheduled(now = Date.now()) {
  const shifted = new Date(now + 3 * 3600_000);
  const boundary = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), shifted.getUTCHours() < 12 ? 12 : 24) - 3 * 3600_000;
  return new Date(boundary).toISOString();
}
function atomicWrite(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try { fs.writeFileSync(temp, JSON.stringify(data, null, 2)); fs.renameSync(temp, file); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
function lock(root) {
  const file = path.join(root, 'data', 'flight-sync.lock');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const nonce = crypto.randomUUID();
  for (let attempt = 0; attempt < 2; attempt++) {
    try { fs.writeFileSync(file, JSON.stringify({ pid: process.pid, nonce }), { flag: 'wx' }); return () => { try { if (JSON.parse(fs.readFileSync(file)).nonce === nonce) fs.unlinkSync(file); } catch {} }; }
    catch (e) {
      if (e.code !== 'EEXIST') throw new Error('Uçuş güncelleme kilidi oluşturulamadı.');
      try { const old = JSON.parse(fs.readFileSync(file)); if (!Number.isInteger(old.pid) || old.pid <= 0) break; try { process.kill(old.pid, 0); break; } catch (err) { if (err.code !== 'ESRCH') break; } fs.unlinkSync(file); } catch { break; }
    }
  }
  throw new Error('Uçuş güncellemesi zaten çalışıyor veya kilit kontrolü gerekiyor.');
}
function routeCatalog(destinations = cities, origins = ORIGINS) {
  return origins.flatMap(origin => [...new Set(destinations.map(c => c.iata))].map(destination => ({ origin, destination, cities: destinations.filter(c => c.iata === destination) })));
}
async function syncFlights(options = {}) {
  const root = options.root || process.cwd();
  const token = options.token || process.env.TRAVELPAYOUTS_TOKEN?.trim();
  if (!token) throw new Error('Ücretsiz uçuş kaynağının sunucu anahtarı eksik.');
  const release = lock(root);
  try {
    const previous = readCache(root), routes = { ...previous?.routes };
    const jobs = routeCatalog(options.cities, options.origins);
    const stats = { planned: jobs.length, checked: 0, updated: 0, empty: 0, errors: 0, skipped: 0 };
    const request = options.request || requestJson, wait = options.wait || (ms => new Promise(r => setTimeout(r, ms)));
    const startedAt = new Date().toISOString();
    const deadline = Date.now() + 25 * 60_000;
    let index = 0, stopped = false, nextStart = Date.now();
    async function worker() {
      while (index < jobs.length && !stopped && Date.now() < deadline) {
        const job = jobs[index++];
        const delay = Math.max(0, nextStart - Date.now()); nextStart = Math.max(nextStart, Date.now()) + (options.intervalMs ?? 300);
        await wait(delay);
        if (stopped) { stats.skipped++; break; }
        const params = new URLSearchParams({ origin: job.origin, destination: job.destination, currency: 'try', one_way: 'false', sorting: 'price', limit: '100', token });
        try {
          const response = await request(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${params}`);
          if (!response || response.success === false || !Array.isArray(response.data) || response.currency && response.currency.toLowerCase() !== 'try') throw new Error('Geçersiz kaynak yanıtı.');
          const fares = response.data.map(f => normalizeFare(f, job.origin, job.destination)).filter(Boolean).sort((a, b) => a.priceRoundTripTry - b.priceRoundTripTry);
          const key = `${job.origin}-${job.destination}`;
          if (fares[0]) { routes[key] = { ...fares[0], cityId: job.cities[0].id, cityName: job.cities[0].name, cityIds: job.cities.map(c => c.id) }; stats.updated++; }
          else { delete routes[key]; stats.empty++; }
        } catch (e) { stats.errors++; if ([401, 403, 429].includes(e.status)) stopped = true; }
        stats.checked++;
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    stats.skipped += jobs.length - stats.checked - stats.skipped;
    const result = { version: 3, provider: PROVIDER, startedAt, lastSync: new Date().toISOString(), nextScheduledSync: nextScheduled(), timeZone: 'Europe/Istanbul', priceKind: 'indicative', rates: previous?.rates || null, routes, totalRoutes: Object.keys(routes).length, stats };
    atomicWrite(cachePath(root), result);
    options.onProgress?.(stats);
    return result;
  } finally { release(); }
}
module.exports = { normalizeFare, safeLink, requestJson, readCache, freshRoute, isStale, nextScheduled, routeCatalog, syncFlights, TTL, PROVIDER };
