const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { createLoader } = require("./test-helpers.cjs");
const load = createLoader();
const plans = load("src/lib/saved-plans.ts");
const { getCity, publicCity } = load("src/lib/cities.ts");
const { computePlanBudget } = load("src/lib/planner/budget.ts");

function fixture() {
  const input = { origin: "IST", destination: "roma", startDate: "2020-03-01", endDate: "2020-03-04", travelers: 2, budget: 50000, comfort: "dengeli", interests: ["tarih"] };
  return { version: 2, budgetTier: "konforlu", activeDay: 2, checkedActs: { "2-0-Kişisel durak": true },
    cheapPlaces: [], customActs: { 2: [{ time: "16:00", title: "Kişisel durak", description: "Kaybolmamalı", costTry: 123, kind: "gezi" }] },
    data: { city: publicCity(getCity("roma")), input, nights: 3, rooms: 1, rates: { EUR: 40, USD: 36, live: false },
      flights: [{ id: "chosen-flight", airline: "Test", priceTry: 5000, outbound: { departure: "2020-03-01 10:00", arrival: "2020-03-01 13:00" } }],
      hotels: [{ id: "chosen-hotel", name: "Seçilen otel", pricePerNightTry: 1500 }],
      selectedFlightId: "chosen-flight", selectedHotelId: "chosen-hotel", dailyFoodTry: 500, dailyTransportTry: 50, airportTransferTry: 200,
      restaurants: [], attractions: [], flexDates: [], tips: [], sources: {}, weather: null, aiGenerated: false,
      budgetGuide: { mealCosts: {} }, budget: { total: 19423 },
      days: [1, 2, 3, 4].map((day) => ({ day, date: `2020-03-0${day}`, title: `${day}. Gün`, activities: [] })),
    } };
}

function storage(t) {
  const previous = { window: global.window, localStorage: global.localStorage };
  const data = new Map();
  let fail = false;
  global.window = new EventTarget();
  global.localStorage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { if (fail) throw new Error("QuotaExceededError"); data.set(key, value); } };
  t.after(() => { global.window = previous.window; global.localStorage = previous.localStorage; });
  return { data, fail: () => { fail = true; } };
}

test("corrupt stored exchange rates are rejected before rendering and never overwrite the saved plan", (t) => {
  storage(t);
  const saved = plans.savePlanToStorage(fixture());
  for (const value of ['40', 0, -1, null, Number.MIN_VALUE]) {
    const record = structuredClone(saved);
    record.snapshot.data.rates.EUR = value;
    const raw = JSON.stringify([record]);
    localStorage.setItem(plans.SAVED_PLANS_KEY, raw);
    assert.throws(() => plans.getSavedPlans(), /korunuyor/);
    assert.equal(localStorage.getItem(plans.SAVED_PLANS_KEY), raw);
  }
});

test("save/reopen preserves past dates, selections, custom itinerary, checks and exact budget without providers", (t) => {
  storage(t);
  const snapshot = fixture();
  assert.equal(plans.isSavedSnapshot(snapshot), true);
  const saved = plans.savePlanToStorage(snapshot);
  const reopened = plans.getSavedPlans()[0];
  assert.deepEqual(reopened.snapshot, snapshot);
  assert.equal(reopened.url, `/offline?saved=${saved.id}`);
  assert.equal(reopened.snapshot.data.input.startDate, "2020-03-01");
  const restored = reopened.snapshot;
  const budget = computePlanBudget({ flightPerPerson: restored.data.flights[0].priceTry,
    hotelPerNight: restored.data.hotels[0].pricePerNightTry, nights: 3, rooms: 1, travelers: 2,
    dailyFood: restored.data.dailyFoodTry, dailyTransport: restored.data.dailyTransportTry, airportTransferPerPerson: 200,
    days: restored.data.days, extraActivities: restored.customActs, budget: 50000 });
  assert.equal(budget.total, snapshot.data.budget.total);
  snapshot.customActs[2][0].title = "Mutation after saving";
  assert.equal(plans.getSavedPlans()[0].snapshot.customActs[2][0].title, "Kişisel durak");
});

test("saving again updates the snapshot; different end dates, origins and passenger counts stay separate", (t) => {
  storage(t);
  const snapshot = fixture(), first = plans.savePlanToStorage(snapshot);
  snapshot.customActs[2][0].title = "Güncel durak";
  const updated = plans.savePlanToStorage(snapshot);
  assert.equal(updated.id, first.id);
  assert.equal(plans.getSavedPlans().length, 1);
  for (const [key, value] of [["endDate", "2020-03-05"], ["origin", "ESB"], ["travelers", 3]]) {
    const another = fixture(); another.data.input[key] = value;
    assert.notEqual(plans.savePlanToStorage(another).id, first.id);
  }
  assert.equal(plans.getSavedPlans().length, 4);
  plans.savePlanToStorage(snapshot, first.id);
  assert.equal(plans.getSavedPlans().length, 4);
});

test("all same-tab subscribers see saves, preparation and deletion; preparation cannot resurrect a deleted plan", (t) => {
  storage(t);
  const seen = [];
  window.addEventListener(plans.SAVED_PLANS_EVENT, () => seen.push(plans.getSavedPlans().map((p) => p.id)));
  const saved = plans.savePlanToStorage(fixture());
  assert.ok(plans.markPlanOfflineReady(saved.id).offlineReadyAt);
  plans.removeSavedPlan(saved.id);
  assert.equal(plans.markPlanOfflineReady(saved.id), undefined);
  assert.deepEqual(seen, [[saved.id], [saved.id], []]);
});

test("quota, denied storage and corrupt data never report success or replace previous records", (t) => {
  const mock = storage(t);
  plans.savePlanToStorage(fixture());
  const original = localStorage.getItem(plans.SAVED_PLANS_KEY);
  mock.fail();
  assert.throws(() => plans.savePlanToStorage(fixture()), /kaydedilemedi/);
  assert.equal(localStorage.getItem(plans.SAVED_PLANS_KEY), original);
  mock.data.set(plans.SAVED_PLANS_KEY, "{broken");
  assert.throws(() => plans.savePlanToStorage(fixture()));
  assert.equal(localStorage.getItem(plans.SAVED_PLANS_KEY), "{broken");
  mock.data.set(plans.SAVED_PLANS_KEY, JSON.stringify([{ ...JSON.parse(original)[0], snapshot: { version: 99 } }]));
  assert.throws(() => plans.savePlanToStorage(fixture()), /korunuyor/);
});

test("legacy summaries are retained, labelled separately, and cannot inject external navigation", (t) => {
  storage(t);
  const legacy = { id: "old", cityId: "roma", cityName: "Roma", startDate: "2020-03-01", endDate: "2020-03-04", url: "/plan?dest=roma&start=2020-03-01" };
  localStorage.setItem(plans.SAVED_PLANS_KEY, JSON.stringify([legacy]));
  plans.savePlanToStorage(fixture());
  assert.equal(plans.getSavedPlans().length, 2);
  assert.equal(plans.savedPlanUrl(legacy), legacy.url);
  for (const url of ["javascript:alert(1)", "//evil.invalid", "https://evil.invalid"]) assert.equal(plans.savedPlanUrl({ ...legacy, url }), "/");
});

function worker({ rejectTimedRequests = false } = {}) {
  const origin = "https://example.invalid";
  const handlers = {}, stores = new Map();
  let online = true, missing = "";
  const requested = [];
  const absolute = (value) => new URL(typeof value === "string" ? value : value.url, origin).href;
  const caches = {
    keys: async () => [...stores.keys()], delete: async (name) => stores.delete(name),
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return { match: async (key) => store.get(absolute(key))?.clone(), put: async (key, response) => { store.set(absolute(key), response.clone()); } };
    },
  };
  const context = { caches, URL, Response, AbortController, setTimeout, clearTimeout, console,
    self: { location: { origin }, skipWaiting() {}, clients: { claim: async () => {} }, addEventListener: (name, handler) => { handlers[name] = handler; } },
    fetch: async (request, options) => {
      const url = absolute(request); requested.push(url);
      if (rejectTimedRequests && options?.signal) throw new Error("Simulated slow network timeout");
      if (!online || url.endsWith(missing || "never-match")) throw new Error("Offline");
      if (url === origin + "/offline") return new Response('<script src="/_next/static/offline.js"></script><link href="/_next/static/site.css" rel="stylesheet">', { headers: { "content-type": "text/html" } });
      if (url.endsWith("site.css")) return new Response('@font-face{src:url(./font.woff2)}');
      return new Response("public asset");
    },
  };
  vm.runInNewContext(fs.readFileSync("public/sw.js", "utf8"), context);
  return { stores, requested, offline: () => { online = false; }, missing: (file) => { missing = file; },
    async prepare(assets = []) {
      let result, done;
      handlers.message({ data: { type: "PREPARE_OFFLINE", assets }, ports: [{ postMessage: (value) => { result = value; } }], waitUntil: (promise) => { done = promise; } });
      await done; return result;
    },
    async request(path, mode = "navigate", method = "GET") {
      let response;
      handlers.fetch({ request: { url: absolute(path), mode, method }, respondWith: (promise) => { response = promise; } });
      return response ? await response : undefined;
    },
  };
}

test("offline worker prepares shell, JS, CSS and fonts, then serves a cold navigation without a server", async () => {
  const sw = worker();
  assert.equal((await sw.prepare(["/_next/static/map.js", "/api/auth/me", "https://external.invalid/private"])).ready, true);
  assert.equal(sw.requested.some((url) => url.includes("/api/") || url.includes("external.invalid")), false);
  assert.ok(sw.requested.some((url) => url.endsWith("font.woff2")));
  assert.ok(sw.requested.some((url) => url.endsWith("/logo.png")));
  for (const language of ["en", "de", "ru", "zh", "es", "fr", "ar"]) {
    assert.ok(sw.requested.some((url) => url.includes(`/i18n/${language}.json?v=20261024-1`)));
  }
  sw.offline();
  assert.match(await (await sw.request("/offline?saved=plan-test")).text(), /offline.js/);
  assert.match(await (await sw.request("/")).text(), /offline.js/);
  assert.equal(await (await sw.request("/_next/static/map.js", "cors")).text(), "public asset");
  assert.equal((await sw.request("/logo.png", "cors")).status, 200);
  for (const language of ["en", "de", "ru", "zh", "es", "fr", "ar"]) {
    assert.equal((await sw.request(`/i18n/${language}.json?v=20261024-1`, "cors")).status, 200);
  }
  assert.equal(await sw.request("/api/auth/me", "cors"), undefined);
  assert.equal(await sw.request("/api/plan", "cors"), undefined);
  assert.equal(await sw.request("/api/trips", "cors", "POST"), undefined);
  assert.equal(await sw.request("/plan?_rsc=abc", "cors"), undefined);
});

test("a partial offline package is never marked ready or published as a working shell", async () => {
  const sw = worker();
  sw.missing("font.woff2");
  assert.equal((await sw.prepare()).ready, false);
  sw.offline();
  assert.equal((await sw.request("/offline?saved=plan-test")).status, 503);
});

test("a failed refresh preserves the previously working offline package", async () => {
  const sw = worker();
  assert.equal((await sw.prepare()).ready, true);
  sw.missing("new-map.js");
  assert.equal((await sw.prepare(["/_next/static/new-map.js"])).ready, false);
  sw.offline();
  assert.match(await (await sw.request("/offline?saved=existing-plan")).text(), /offline.js/);
  assert.equal((await sw.request("/_next/static/offline.js", "cors")).status, 200);
});

test("a slow first visit without an offline package is allowed to load the page and new assets", async () => {
  const sw = worker({ rejectTimedRequests: true });
  const page = await sw.request("/plan?dest=roma");
  assert.equal(page.status, 200);
  assert.equal(await page.text(), "public asset");
  assert.equal(await (await sw.request("/_next/static/new-route.js", "cors")).text(), "public asset");
  sw.offline();
  assert.equal((await sw.request("/plan?dest=roma")).status, 503);
});

test("a prepared package still provides a fast fallback when the online request times out", async () => {
  const sw = worker({ rejectTimedRequests: true });
  assert.equal((await sw.prepare()).ready, true);
  assert.match(await (await sw.request("/plan?dest=roma")).text(), /offline.js/);
  assert.equal(await (await sw.request("/_next/static/offline.js", "cors")).text(), "public asset");
});
