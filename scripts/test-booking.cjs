const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { EventEmitter } = require("node:events");
const { createLoader } = require("./test-helpers.cjs");
const load = createLoader();
const { CITIES, getCity } = load("src/lib/cities.ts");
const { normalizeBookingResults } = load("src/lib/providers/booking-serp.ts");
const { hotelCoordinates, hotelTotal, hotelNightlyTotal, hotelQuoteIsFresh, applyHotelCoordinates, isHotelQuote } = load("src/lib/hotel-data.ts");
const { bookingDevice, bookingPropertyUrl } = load("src/lib/booking-context.ts");
const { bookingCountryCode } = load("src/lib/hotel-location.ts");
const city = getCity("roma"), start = "2026-11-05", end = "2026-11-08";
function fixture(adults = 3, rooms = 2, destination = city) {
  return { search_metadata: { status: "Success", processed_at: new Date().toISOString() },
    search_parameters: { engine: "booking", check_in_date: start, check_out_date: end, adults, rooms, currency: "TRY" },
    properties: [{ property_id: 1234, name: "Test Property", address: "Test source address", link: `https://www.booking.com/hotel/${bookingCountryCode(destination.id)}/test.html?checkin=${start}&checkout=${end}&group_adults=${adults}&no_rooms=${rooms}`,
      currency: "TRY", extracted_price: 12345.67, extracted_price_per_night: 1, extracted_taxes_and_fees: 245.61,
      gps_coordinates: { latitude: destination.lat, longitude: destination.lon }, hotel_class: 4, rating: 8.7, reviews: 12, rooms: [{ name: "Test Room" }] }] };
}
function temp(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rotazur-booking-test-"));
  t.after(() => { assert.equal(path.dirname(root), os.tmpdir()); fs.rmSync(root, { recursive: true, force: true }); });
  return root;
}

test("Booking search quotes retain exact property coordinates, stay amount and excluded taxes without occupancy multipliers", () => {
  const raw = fixture();
  raw.properties[0].gps_coordinates = { latitude: 41.900123456789, longitude: 12.480123456789 };
  const [hotel] = normalizeBookingResults(raw, city, start, end, 3, 2);
  assert.equal(hotel.id, "booking-1234");
  assert.equal(hotel.lat, 41.900123456789); assert.equal(hotel.lon, 12.480123456789);
  assert.equal(hotel.bookingQuote.displayTotalTry, 12345.67);
  assert.equal(hotel.bookingQuote.displayNightlyTry, 1); // Source's advertised nightly rate can exclude charges.
  assert.equal(hotel.bookingQuote.knownTotalTry, 12591.28);
  assert.equal(hotelTotal(hotel, 3), 12591.28);
  assert.equal(hotel.pricePerNightTry, 12591.28 / 3);
  assert.equal(hotel.source, "booking-serpapi"); assert.equal(isHotelQuote(hotel.bookingQuote), true);
  assert.equal(hotel.roomCount, 2);
});

test("different dates, guests, rooms, currencies and stale search metadata cannot be labelled as current Booking prices", () => {
  for (const [field, value] of [["engine", "google_hotels"], ["check_in_date", "2026-11-06"], ["adults", 2], ["rooms", 1], ["currency", "EUR"]]) {
    const raw = fixture(); raw.search_parameters[field] = value;
    assert.throws(() => normalizeBookingResults(raw, city, start, end, 3, 2));
  }
  const stale = fixture(); stale.search_metadata.processed_at = new Date(Date.now() - 11 * 60000).toISOString();
  assert.throws(() => normalizeBookingResults(stale, city, start, end, 3, 2), /güncel/);
});

test("unavailable properties, missing or wrong-city coordinates and mismatching or external hotel links are excluded", () => {
  for (const patch of [{ sold_out: true }, { currency: "EUR" }, { extracted_price: -1 }, { property_id: "1234" },
    { check_in_date: "2026-11-06" }, { gps_coordinates: undefined }, { gps_coordinates: { latitude: 1000, longitude: 0 } },
    { gps_coordinates: { latitude: 35.69, longitude: 139.7 } }, { link: "https://booking.com.evil.invalid/hotel/test" },
    { link: "https://www.booking.com/searchresults.html" }, { link: "https://www.booking.com/hotel/it/test.html?no_rooms=1" }]) {
    const raw = fixture(); Object.assign(raw.properties[0], patch);
    assert.deepEqual(normalizeBookingResults(raw, city, start, end, 3, 2), []);
  }
  const raw = fixture(); raw.properties.push({ ...raw.properties[0] });
  assert.equal(normalizeBookingResults(raw, city, start, end, 3, 2).length, 1);
});

test("unknown taxes remain unknown; missing review data is not replaced with invented ratings", () => {
  const raw = fixture(); delete raw.properties[0].extracted_taxes_and_fees; delete raw.properties[0].rating; delete raw.properties[0].hotel_class;
  const [hotel] = normalizeBookingResults(raw, city, start, end, 3, 2);
  assert.equal(hotel.bookingQuote.excludedTaxesTry, null);
  assert.equal(hotel.bookingQuote.knownTotalTry, 12345.67);
  assert.match(hotel.bookingQuote.disclaimer, /doğrulanmalıdır/);
  assert.equal(hotel.rating, 0); assert.equal(hotel.stars, 0);
});

test("Booking provider uses exact dates, all adults and room count for all supported cities and forces a fresh source query", async () => {
  let called = 0;
  for (const destination of CITIES) {
    const isolated = createLoader({ "../server-utils": { haversineKm: load("src/lib/travel-utils.ts").haversineKm, fetchJson: async (url) => {
      called++; const params = new URL(url).searchParams;
      assert.equal(params.get("engine"), "booking"); assert.equal(params.get("adults"), "9"); assert.equal(params.get("rooms"), "5");
      assert.equal(params.get("check_in_date"), start); assert.equal(params.get("check_out_date"), end);
      assert.equal(params.get("currency"), "TRY"); assert.equal(params.get("no_cache"), "true");
      assert.equal(params.get("q"), destination.bookingQuery || destination.wiki.replaceAll("_", " "));
      return fixture(9, 5, destination);
    } } }, { ...process, env: { HOTEL_PRICE_PROVIDER: "booking-serpapi", SERPAPI_KEY: "test-only-key" } });
    const hotels = await isolated("src/lib/providers/booking-serp.ts").bookingHotels(destination, start, end, 9);
    assert.equal(hotels.length, 1); assert.equal(hotels[0].bookingQuote.adults, 9);
  }
  assert.equal(called, CITIES.length);
});

test("without credentials every city stays explicitly estimated and no catalogue hotel is plotted as verified", async () => {
  let calls = 0;
  const isolated = createLoader({ "../booking-snapshots": { bookingImportMode: () => false }, "../server-utils": { ...load("src/lib/server-utils.ts"), fetchJson: async () => { calls++; throw new Error("must not call a provider"); } } }, { ...process, env: { HOTEL_PRICE_PROVIDER: "booking-serpapi" } });
  const { searchHotels } = isolated("src/lib/providers/hotels.ts");
  for (const destination of CITIES) {
    const result = await searchHotels(destination, start, end, 3, 55);
    assert.equal(result.live, false); assert.ok(result.hotels.length > 0);
    result.hotels.forEach((hotel) => { assert.equal(hotel.source, "ornek"); assert.equal(hotelCoordinates(hotel), null); });
  }
  assert.equal(calls, 0);
  const days = [{ day: 1, activities: [{ kind: "otel", id: "old-id", lat: 41, lon: 12 }, { kind: "gezi", lat: 41.1, lon: 12.1 }] }];
  const cleaned = applyHotelCoordinates(days, { source: "ornek", lat: 41, lon: 12 });
  assert.equal(cleaned[0].activities[0].lat, undefined); assert.equal(cleaned[0].activities[0].id, "old-id");
  assert.equal(cleaned[0].activities[1].lat, 41.1);
  assert.equal(days[0].activities[0].lat, 41);
});

test("Booking links use Booking affiliate identifiers only and preserve exact search conditions", () => {
  const isolated = createLoader({}, { ...process, env: { TRAVELPAYOUTS_MARKER: "wrong-program-marker", BOOKING_AFFILIATE_ID: "123456" } });
  const links = isolated("src/lib/providers/hotels.ts").buildHotelBookingUrls("Test", "Roma", start, end, 9);
  const url = new URL(links.booking);
  assert.equal(url.searchParams.get("aid"), "123456"); assert.equal(url.searchParams.get("no_rooms"), "5");
  assert.equal(url.searchParams.get("group_adults"), "9"); assert.ok(!links.booking.includes("wrong-program-marker"));
  const noAffiliate = createLoader({}, { ...process, env: { TRAVELPAYOUTS_MARKER: "wrong-program-marker" } });
  assert.equal(new URL(noAffiliate("src/lib/providers/hotels.ts").buildHotelBookingUrls("Test", "Roma", start, end, 2).booking).searchParams.has("aid"), false);
});

test("quote kuruş amounts survive group budget calculation without multiplying rooms or rounding the hotel to whole lira", () => {
  const [hotel] = normalizeBookingResults(fixture(9, 5), city, start, end, 9, 5);
  const { computePlanBudget } = load("src/lib/planner/budget.ts");
  const budget = computePlanBudget({ flightPerPerson: 0, hotelPerNight: hotel.pricePerNightTry, hotelTotalTry: hotelTotal(hotel, 3),
    nights: 3, rooms: 5, travelers: 9, dailyFood: 0, dailyTransport: 0, budget: 20000, days: [] });
  assert.equal(budget.hotel, 12591.28); assert.equal(budget.total, 12591.28); assert.equal(budget.remaining, 7408.72);
});

test("SerpApi quota is hourly and rolling across restarts, rather than resetting at calendar boundaries", (t) => {
  const root = temp(t), now = Date.now(), hour = 3600000;
  const isolated = () => createLoader({}, { ...process, cwd: () => root });
  const first = isolated(), { db } = first("src/lib/db.ts");
  try {
    const quota = first("src/lib/provider-quota.ts");
    for (let i = 0; i < 45; i++) quota.reserveSerpApiSearch(now);
    assert.throws(() => quota.reserveSerpApiSearch(now), /kotası/);
    for (let i = 45; i < 200; i++) quota.reserveSerpApiSearch(now + Math.floor(i / 45) * hour + 1);
    assert.throws(() => quota.reserveSerpApiSearch(now + 6 * hour), /kotası/);
  } finally { db.close(); }
  const reopened = isolated(), reopenedDb = reopened("src/lib/db.ts").db;
  try {
    const quota = reopened("src/lib/provider-quota.ts");
    assert.throws(() => quota.reserveSerpApiSearch(now + 24 * hour), /kotası/);
    quota.reserveSerpApiSearch(now + 32 * 24 * hour);
    assert.equal(reopenedDb.prepare("SELECT count(*) AS n FROM provider_search_usage").get().n, 1);
  } finally { reopenedDb.close(); }
});

test("one SerpApi search reserves once and never retries another transport after a network error", async () => {
  let calls = 0, reserved = 0;
  const isolated = createLoader({ "./provider-quota": { reserveSerpApiSearch: () => { reserved++; } },
    "node:https": { get: () => { calls++; const req = new EventEmitter(); queueMicrotask(() => req.emit("error", new Error("test-only connection failure"))); return req; } } });
  await assert.rejects(isolated("src/lib/server-utils.ts").fetchJson("https://serpapi.com/search.json?engine=booking&api_key=test-only"), /test-only/);
  assert.equal(calls, 1); assert.equal(reserved, 1);
});

test("concurrent workers share the same SerpApi hourly limit", async (t) => {
  const root = temp(t);
  const worker = `const {createLoader}=require(${JSON.stringify(path.resolve("scripts/test-helpers.cjs"))});
    const load=createLoader({}, {...process,cwd:()=>${JSON.stringify(root)}});const {db}=load(${JSON.stringify(path.resolve("src/lib/db.ts"))});
    const {reserveSerpApiSearch}=load(${JSON.stringify(path.resolve("src/lib/provider-quota.ts"))});
    let allowed=0;try{for(let i=0;i<10;i++){try{reserveSerpApiSearch();allowed++;}catch{}}console.log(allowed);}finally{db.close();}`;
  const counts = await Promise.all(Array.from({ length: 6 }, () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", worker], { windowsHide: true });
    let output = "", error = ""; child.stdout.on("data", (part) => { output += part; }); child.stderr.on("data", (part) => { error += part; });
    child.on("error", reject); child.on("exit", (status) => status === 0 ? resolve(Number(output.trim())) : reject(new Error(error)));
  })));
  assert.equal(counts.reduce((sum, count) => sum + count, 0), 45);
});

test("zero-TTL prices bypass stored results while concurrent identical requests share one operation", async () => {
  const { cached } = load("src/lib/server-utils.ts");
  let calls = 0;
  await cached("booking-no-cache-test", 60000, async () => ++calls);
  assert.equal(await cached("booking-no-cache-test", 0, async () => ++calls), 2);
  assert.equal(await cached("booking-no-cache-test", 0, async () => ++calls), 3);
  let finish;
  const first = cached("booking-concurrent-test", 0, () => { calls++; return new Promise((resolve) => { finish = resolve; }); });
  const second = cached("booking-concurrent-test", 0, async () => { calls++; return "wrong"; });
  await Promise.resolve(); finish("fresh");
  assert.deepEqual(await Promise.all([first, second]), ["fresh", "fresh"]);
  assert.equal(calls, 4);
});

test("Bang lumphu four-night example compares the tax-inclusive stay total, rather than the advertised nightly rate", () => {
  const destination = getCity("bangkok"), raw = fixture(2, 1, destination);
  const checkin = "2026-11-22", checkout = "2026-11-26";
  Object.assign(raw.search_parameters, { check_in_date: checkin, check_out_date: checkout });
  Object.assign(raw.properties[0], { property_id: 11449473, name: "Bang lumphu home stay", extracted_price: 1551.46,
    extracted_price_per_night: 387.86, extracted_taxes_and_fees: 108.60,
    link: `https://www.booking.com/hotel/th/bang-lumphu-house-amp-bistro.html?checkin=${checkin}&checkout=${checkout}&group_adults=2&no_rooms=1&group_children=0` });
  const [hotel] = normalizeBookingResults(raw, destination, checkin, checkout, 2, 1);
  assert.equal(hotelTotal(hotel, 4), 1660.06);
  assert.equal(hotelNightlyTotal(hotel, 4), 415.015);
  assert.notEqual(hotelNightlyTotal(hotel, 4), hotel.bookingQuote.displayNightlyTry);
  assert.equal(Math.round(hotelTotal(hotel, 4)), 1660); // Booking's observed whole-lira display.
});

test("every city preserves stay totals across one/two/three/nine adults and short/long stays", () => {
  const { addDays } = load("src/lib/travel-utils.ts");
  const { computePlanBudget } = load("src/lib/planner/budget.ts");
  for (const destination of CITIES) for (const adults of [1, 2, 3, 9]) for (const nights of [1, 4, 14]) {
    const rooms = Math.ceil(adults / 2), checkout = addDays(start, nights), raw = fixture(adults, rooms, destination);
    raw.search_parameters.check_out_date = checkout;
    raw.properties[0].link = `https://www.booking.com/hotel/${bookingCountryCode(destination.id)}/property.html?checkin=${start}&checkout=${checkout}&group_adults=${adults}&no_rooms=${rooms}`;
    const [hotel] = normalizeBookingResults(raw, destination, start, checkout, adults, rooms);
    assert.equal(hotelTotal(hotel, nights), 12591.28, destination.id);
    assert.equal(hotelNightlyTotal(hotel, nights), 12591.28 / nights);
    const budget = computePlanBudget({ flightPerPerson: 0, hotelPerNight: hotel.pricePerNightTry, hotelTotalTry: hotelTotal(hotel, nights),
      nights, rooms, travelers: adults, dailyFood: 0, dailyTransport: 0, budget: 20000, days: [] });
    assert.equal(budget.hotel, 12591.28);
    const url = new URL(hotel.bookingUrl);
    assert.equal(url.searchParams.get("selected_currency"), "TRY");
    assert.equal(url.searchParams.get("group_children"), "0");
    assert.equal(url.searchParams.get("sb_price_type"), "total");
    assert.equal(url.searchParams.get("type"), "total");
  }
});

test("mobile/tablet searches stay distinct from desktop for all cities without querying the real provider", async () => {
  assert.equal(bookingDevice("Mozilla/5.0 (iPhone) Mobile Safari"), "mobile");
  assert.equal(bookingDevice("Mozilla/5.0 (Linux; Android 14) Mobile"), "mobile");
  assert.equal(bookingDevice("Mozilla/5.0 (iPad)"), "tablet");
  assert.equal(bookingDevice("Mozilla/5.0 (Linux; Android 14)"), "tablet");
  assert.equal(bookingDevice("Mozilla/5.0 (Windows NT 10.0)"), "desktop");
  assert.equal(bookingDevice(null), "desktop");
  for (const destination of CITIES) for (const device of ["desktop", "mobile", "tablet"]) {
    const isolated = createLoader({ "../server-utils": { haversineKm: load("src/lib/travel-utils.ts").haversineKm,
      fetchJson: async (url) => { assert.equal(new URL(url).searchParams.get("device"), device); const raw = fixture(2, 1, destination); raw.search_parameters.device = device; return raw; }
    } }, { ...process, env: { HOTEL_PRICE_PROVIDER: "booking-serpapi", SERPAPI_KEY: "test-only-key" } });
    const [hotel] = await isolated("src/lib/providers/booking-serp.ts").bookingHotels(destination, start, end, 2, { device });
    assert.equal(hotel.bookingQuote.device, device);
  }
});

test("children, flexible dates, conflicting duplicate URL conditions and missing dates cannot silently change a quote", () => {
  for (const patch of [{ children: 1 }, { children_ages: "5" }, { flex_window: 2 }, { device: "mobile" }]) {
    const raw = fixture(); Object.assign(raw.search_parameters, patch);
    assert.throws(() => normalizeBookingResults(raw, city, start, end, 3, 2));
  }
  for (const suffix of ["&group_adults=2", "&checkin=2026-11-06", "&no_rooms=1", "&group_children=1", "&age=5"]) {
    const raw = fixture(); raw.properties[0].link += suffix;
    assert.deepEqual(normalizeBookingResults(raw, city, start, end, 3, 2), []);
  }
  assert.equal(bookingPropertyUrl("https://www.booking.com/hotel/it/test.html", { checkin: start, checkout: end, adults: 3, rooms: 2 }), null);
});

test("quote links preserve real room identifiers and normalize currency/total display without sharing source sessions", () => {
  const raw = fixture(); raw.properties[0].link += "&selected_block_id=real-room-rate&sid=source-session&selected_currency=EUR&selected_currency=USD";
  const [hotel] = normalizeBookingResults(raw, city, start, end, 3, 2), url = new URL(hotel.bookingUrl);
  assert.equal(url.searchParams.get("selected_block_id"), "real-room-rate");
  assert.equal(url.searchParams.has("sid"), false);
  assert.deepEqual(url.searchParams.getAll("selected_currency"), ["TRY"]);
  assert.equal(url.searchParams.get("lang"), "tr");
  assert.equal(url.searchParams.get("type"), "total");
});

test("room quantities, dormitory units and cancellation/payment conditions are preserved without claiming private rooms", () => {
  const raw = fixture(2, 1);
  Object.assign(raw.properties[0], { type: "Hostel", rooms: [{ name: "Yatakhane yatağı", type: "Yatakhanelerde 2 yatak", quantity: 2 }],
    free_cancellation: true, free_cancellation_until: "2026-11-01T17:00:00Z", no_prepayment: true, meal_plan: "Kahvaltı dahil", deals: ["Mobile-only price"] });
  const [hotel] = normalizeBookingResults(raw, city, start, end, 2, 1);
  assert.equal(hotel.roomTypeTag, "hostel"); assert.equal(hotel.roomType, "2 × Yatakhane yatağı");
  assert.equal(hotel.bookingQuote.roomOffers[0].unitType, "Yatakhanelerde 2 yatak");
  assert.equal(hotel.capacityLabel, "2 yetişkin · 1 oda araması");
  assert.equal(hotel.bookingQuote.freeCancellation, true); assert.equal(hotel.bookingQuote.noPrepayment, true);
  assert.equal(hotel.bookingQuote.mealPlan, "Kahvaltı dahil"); assert.equal(isHotelQuote(hotel.bookingQuote), true);
  assert.equal(isHotelQuote({ ...hotel.bookingQuote, roomOffers: [{ name: "Bad", quantity: -1 }] }), false);
});

test("saved/aging quotes retain their price for budgets but cannot be presented as fresh searches", () => {
  const [hotel] = normalizeBookingResults(fixture(), city, start, end, 3, 2), checked = Date.parse(hotel.bookingQuote.checkedAt);
  assert.equal(hotelQuoteIsFresh(hotel, checked + 600000), true);
  assert.equal(hotelQuoteIsFresh(hotel, checked + 600001), false);
  assert.equal(hotelQuoteIsFresh(hotel, checked - 60001), false);
  assert.equal(hotelTotal(hotel, 3), 12591.28);
});
