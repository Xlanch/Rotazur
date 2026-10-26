const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { createLoader } = require("./test-helpers.cjs");
const load = createLoader();
const { fetchJson, readResponseBytes } = load("src/lib/server-utils.ts");
const { buildGoogleMapsRouteUrl, buildGoogleMapsRouteSegments, distinctNavigationStops } = load("src/lib/route-optimizer.ts");
const { hasCoordinates } = load("src/lib/travel-utils.ts");

async function server(t, handler) {
  const instance = http.createServer(handler);
  await new Promise((resolve) => instance.listen(0, "127.0.0.1", resolve));
  t.after(async () => { instance.closeAllConnections(); await new Promise((resolve) => instance.close(resolve)); });
  return `http://127.0.0.1:${instance.address().port}`;
}

test("HTTP errors and invalid provider JSON are not retried with another transport", async (t) => {
  let calls = 0;
  const base = await server(t, (req, res) => {
    calls++;
    if (req.url === "/rate-limit") { res.writeHead(429); res.end("{}"); }
    else { res.writeHead(200); res.end("{broken"); }
  });
  await assert.rejects(fetchJson(base + "/rate-limit"), /HTTP 429/);
  assert.equal(calls, 1);
  await assert.rejects(fetchJson(base + "/invalid"), /JSON/);
  assert.equal(calls, 2);
});

test("provider deadline covers slowly streamed bodies and never starts a second timeout window", async (t) => {
  let calls = 0, chunks = 0;
  const base = await server(t, (_req, res) => {
    calls++;
    res.writeHead(200, { "content-type": "application/json" }); res.write("[");
    const ticker = setInterval(() => { chunks++; res.write(" "); }, 15);
    res.on("close", () => clearInterval(ticker));
  });
  const started = Date.now();
  // Leave time for an actual HTTP connection on a busy machine; the unfinished
  // stream must still be aborted within one total deadline, after body data arrives.
  await assert.rejects(fetchJson(base, undefined, 1500));
  assert.equal(calls, 1);
  assert.ok(chunks > 0);
  assert.ok(Date.now() - started < 5000);
});

test("caller cancellation is honored and native fallback retains supplied authorization headers", async (t) => {
  let calls = 0, authorization;
  const base = await server(t, (req, res) => { calls++; authorization = req.headers.authorization; res.end('{"ok":true}'); });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(fetchJson(base, { signal: controller.signal }));
  assert.equal(calls, 0);
  const originalFetch = global.fetch;
  global.fetch = async () => { throw new TypeError("test-only network failure"); };
  try {
    assert.deepEqual(await fetchJson(base, { headers: { authorization: "Bearer test-only-token" } }), { ok: true });
    assert.equal(calls, 1); assert.equal(authorization, "Bearer test-only-token");
  } finally { global.fetch = originalFetch; }
});

test("body limits check actual streamed bytes and advertised sizes, including native fallback", async (t) => {
  const bytes = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(9)); controller.close(); } });
  await assert.rejects(readResponseBytes(new Response(bytes), 8), /boyut/);
  await assert.rejects(readResponseBytes(new Response("a", { headers: { "content-length": "9" } }), 8), /boyut/);
  assert.equal((await readResponseBytes(new Response("12345678"), 8)).byteLength, 8);
  const base = await server(t, (_req, res) => { res.writeHead(200, { "content-length": 9 * 1024 * 1024 }); res.end("{}"); });
  const originalFetch = global.fetch;
  global.fetch = async () => { throw new TypeError("test-only network failure"); };
  try { await assert.rejects(fetchJson(base), /boyut/); }
  finally { global.fetch = originalFetch; }
});

test("a provider name in the URL query does not select the privileged native transport", async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  const isolated = createLoader({ "node:http": { get: () => { throw new Error("unexpected native request"); } } });
  global.fetch = async () => { calls++; return Response.json({ ok: true }); };
  try {
    assert.deepEqual(await isolated("src/lib/server-utils.ts").fetchJson("http://127.0.0.1/?q=travelpayouts.com"), { ok: true });
    assert.equal(calls, 1);
  } finally { global.fetch = originalFetch; }
});

test("image proxy rejects inherited map keys, non-image responses and oversized images", async () => {
  const isolated = createLoader();
  const images = isolated("src/lib/providers/images.ts");
  const { GET } = isolated("src/app/api/images/proxy/route.ts");
  assert.equal(images.cityImageUrl("__proto__"), images.DEFAULT_CITY_IMAGE);
  assert.equal(images.cityImageUrl("constructor"), images.DEFAULT_CITY_IMAGE);
  const originalFetch = global.fetch;
  let url, calls = 0;
  const request = { nextUrl: new URL("http://localhost/api/images/proxy?city=constructor") };
  try {
    global.fetch = async (value) => { calls++; url = value; return new Response("PNG", { headers: { "content-type": "image/png" } }); };
    const good = await GET(request);
    assert.equal(url, images.DEFAULT_CITY_IMAGE); assert.equal(good.status, 200);
    assert.equal(good.headers.get("x-content-type-options"), "nosniff");
    assert.equal((await GET({ nextUrl: new URL("http://localhost/api/images/proxy?city=__proto__") })).status, 200);
    assert.equal(calls, 1); // All unrecognized keys share one bounded cache entry.
    request.nextUrl.searchParams.set("city", "roma");
    global.fetch = async () => new Response("<script>invalid</script>", { headers: { "content-type": "text/html" } });
    assert.equal((await GET(request)).status, 502);
    request.nextUrl.searchParams.set("city", "paris");
    global.fetch = async () => new Response("x", { headers: { "content-type": "image/png", "content-length": String(5 * 1024 * 1024) } });
    assert.equal((await GET(request)).status, 502);
  } finally { global.fetch = originalFetch; }
});

const point = (i) => ({ lat: i / 10, lon: i / 20, title: "Stop " + i });
const coordinate = (p) => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
function linkedPoints(url) {
  const params = new URL(url).searchParams;
  return [params.get("origin"), ...(params.get("waypoints")?.split("|") || []), params.get("destination")];
}

test("navigation accepts equator/prime-meridian coordinates and omits invalid locations", () => {
  assert.equal(hasCoordinates({ lat: 0, lon: 0 }), true);
  assert.equal(hasCoordinates({ lat: 0, lon: 181 }), false);
  assert.equal(hasCoordinates({ lat: NaN, lon: 3 }), false);
  assert.deepEqual(distinctNavigationStops([point(0), point(1), point(1), point(0)], point(0)), [point(1), point(0)]);
  const input = { origin: point(0), destination: point(3), waypoints: [point(1), point(2), point(3), { title: "invalid", lat: 1000, lon: 0 }], cityName: "Test" };
  assert.deepEqual(linkedPoints(buildGoogleMapsRouteUrl(input)), [0, 1, 2, 3].map((i) => coordinate(point(i))));
  const withoutHotel = { waypoints: [point(0), point(1), point(2)], destination: point(2), cityName: "Test" };
  assert.deepEqual(linkedPoints(buildGoogleMapsRouteUrl(withoutHotel)), [0, 1, 2].map((i) => coordinate(point(i))));
});

test("long mobile routes cover every stop in order, with continuous segments and at most 3 intermediate stops", () => {
  const stops = Array.from({ length: 19 }, (_, i) => point(i));
  const input = { origin: stops[0], destination: stops.at(-1), waypoints: stops.slice(1), cityName: "Test" };
  const segments = buildGoogleMapsRouteSegments(input);
  const visited = [];
  for (const [index, segment] of segments.entries()) {
    const positions = linkedPoints(segment.url);
    assert.ok(positions.length <= 5);
    assert.ok(segment.url.length < 2048);
    if (index) { assert.equal(positions[0], visited.at(-1)); visited.push(...positions.slice(1)); }
    else visited.push(...positions);
  }
  assert.deepEqual(visited, stops.map(coordinate));
  assert.throws(() => buildGoogleMapsRouteUrl(input), /bölümler/); // never silently truncate
});

test("transit routes cover each leg, repeated visits stay intentional and one point is a search", () => {
  const input = { waypoints: [point(0), point(1), point(0), point(2)], cityName: "Test", travelMode: "transit" };
  const parts = buildGoogleMapsRouteSegments(input);
  assert.equal(parts.length, 3);
  parts.forEach((part) => assert.equal(new URL(part.url).searchParams.has("waypoints"), false));
  assert.deepEqual(linkedPoints(parts[1].url), [coordinate(point(1)), coordinate(point(0))]);
  assert.match(buildGoogleMapsRouteSegments({ cityName: "Zero", waypoints: [point(0)] })[0].url, /maps\/search/);
});

test("date editing rejects missing/past/reversed/long dates and adjusts return dates at calendar boundaries", () => {
  const { searchDateError, returnDateAfterDepartureChange } = load("src/lib/search-dates.ts");
  const today = "2026-10-23";
  for (const [start, end] of [["", ""], ["2026-02-30", "2026-03-04"], ["2026-10-22", "2026-10-25"], [today, today], [today, "2026-11-07"]]) assert.ok(searchDateError(start, end, today));
  assert.equal(searchDateError(today, "2026-11-06", today), null);
  assert.equal(returnDateAfterDepartureChange("2026-12-31", "2026-12-30"), "2027-01-03");
  assert.equal(returnDateAfterDepartureChange("2028-02-28", "2028-02-27"), "2028-03-02");
  assert.equal(returnDateAfterDepartureChange(today, "2026-12-01"), "2026-11-06");
  assert.equal(returnDateAfterDepartureChange("", "2026-12-01"), "2026-12-01");
});

test("clipboard success waits for the browser; rejected or unavailable clipboard gives a useful error", async () => {
  const { copyText } = load("src/lib/clipboard.ts");
  const previous = Object.getOwnPropertyDescriptor(global, "navigator");
  let finish, done = false;
  try {
    Object.defineProperty(global, "navigator", { configurable: true, value: { clipboard: { writeText: () => new Promise((resolve) => { finish = resolve; }) } } });
    const copying = copyText("Test").then(() => { done = true; });
    await Promise.resolve(); assert.equal(done, false);
    finish(); await copying; assert.equal(done, true);
    Object.defineProperty(global, "navigator", { configurable: true, value: { clipboard: { writeText: async () => { throw new Error("denied"); } } } });
    await assert.rejects(copyText("Test"), /pano iznini/);
    Object.defineProperty(global, "navigator", { configurable: true, value: {} });
    await assert.rejects(copyText("Test"), /pano iznini/);
  } finally { if (previous) Object.defineProperty(global, "navigator", previous); else delete global.navigator; }
});

test("story image loading cannot restore a previous city's image and remains usable when both sources fail", () => {
  const previousImage = global.Image;
  const slots = [], images = []; let index = 0, effects = [];
  global.Image = class { constructor() { images.push(this); } };
  const react = {
    useState(initial) { const position = index++; if (!(position in slots)) slots[position] = initial; return [slots[position], (value) => { slots[position] = value; }]; },
    useRef(initial) { const position = index++; if (!(position in slots)) slots[position] = { current: initial }; return slots[position]; },
    useEffect(effect) { effects.push(effect); },
  };
  const isolated = createLoader({ react, "react/jsx-runtime": { jsx: () => null, jsxs: () => null }, "framer-motion": { motion: { div: "div" }, AnimatePresence: "fragment" },
    "@/components/Localize": { Localize: "fragment" }, "./LanguageContext": { useLanguage: () => ({ translate: value => value, lang: "tr", locale: "tr-TR" }) },
  });
  const { StoryCardModal } = isolated("src/components/StoryCardModal.tsx");
  const render = (id) => {
    index = 0; effects = [];
    StoryCardModal({ isOpen: true, onClose() {}, data: { city: { id, name: id, country: "Test", flag: "" } }, input: {}, budgetTier: "dengeli", totalTry: 100 });
    return effects[0](); // Only the image boundary runs; the canvas stays unmounted.
  };
  try {
    const cleanup = render("roma");
    const oldCallback = images[0].onload;
    images[0].onload();
    assert.equal(slots[9].current, images[0]);
    cleanup();
    const nextCleanup = render("paris");
    assert.equal(slots[9].current, null);
    oldCallback();
    assert.equal(slots[9].current, null);
    images[1].onerror(); // Default image also fails, e.g. offline.
    images[2].onerror();
    assert.equal(slots[7], true); // Neutral gradient card can be exported.
    assert.equal(slots[9].current, null);
    nextCleanup();
  } finally { global.Image = previousImage; }
});

test("canvas export awaits its callback and rejects missing PNGs and blocked canvases", async () => {
  const { canvasPng } = load("src/lib/story-export.ts");
  let callback, settled = false;
  const png = new Blob(["test-only PNG"], { type: "image/png" });
  const exporting = canvasPng({ toBlob: (cb) => { callback = cb; } }).then((blob) => { settled = true; return blob; });
  await Promise.resolve(); assert.equal(settled, false);
  callback(png); assert.equal(await exporting, png);
  await assert.rejects(canvasPng({ toBlob: (cb) => cb(null) }), /Görsel oluşturulamadı/);
  await assert.rejects(canvasPng({ toBlob: () => { throw new Error("test-only tainted canvas"); } }), /tainted/);
});
