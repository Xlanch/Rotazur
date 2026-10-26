const test = require("node:test");
const assert = require("node:assert/strict");
const { createLoader } = require("./test-helpers.cjs");
const load = createLoader();
const { CITIES, getCity } = load("src/lib/cities.ts");
const { parseSearch } = load("src/lib/search.ts");
const dates = load("src/lib/travel-utils.ts");
const { buildItinerary, buildSelectedItinerary } = load("src/lib/planner/itinerary.ts");
const { computeBudget, computePlanBudget, mergeDayActivities } = load("src/lib/planner/budget.ts");
const { normalizeRoundTripFlights } = load("src/lib/flight-utils.ts");
const { optimizeDayActivities } = load("src/lib/route-optimizer.ts");
const start = dates.addDays(dates.todayIso(), 30), end = dates.addDays(start, 4);
const leg = (date, time = "10:00") => ({ departure: `${date} ${time}`, arrival: `${date} 13:00`, durationMin: 180, stops: 0 });
const flight = { id: "valid", airline: "Test", priceTry: 2000, source: "ornek", outbound: leg(start), inbound: leg(end, "17:00") };
const itineraryArgs = { city: getCity("roma"), start, nights: 4, travelers: 2, interests: ["tarih", "yemek"], flight, hotel: null, dailyFood: 2500, eur: 55, tight: false };
const budgetArgs = { flightPerPerson: 2000, hotelPerNight: 1234.5, nights: 4, rooms: 3, travelers: 6, dailyFood: 350, dailyTransport: 123, airportTransferPerPerson: 446.08, budget: 100000, activitiesTotal: 280.3 };

test("dates: calendar validation, past dates, trip limits and non-finite numbers", () => {
  for (const p of [{ start: "2020-01-01", end: "2020-01-03" }, { start: "2026-99-99", end: "2026-02-30" }, { start, end: dates.addDays(start, 100), travelers: "Infinity", budget: "Infinity" }]) {
    const input = parseSearch(p);
    assert.ok(dates.isIsoDate(input.startDate) && dates.isIsoDate(input.endDate));
    assert.ok(input.startDate >= dates.todayIso());
    assert.ok(input.endDate > input.startDate);
    assert.ok(dates.nightsBetween(input.startDate, input.endDate) <= 14);
    assert.ok(Number.isInteger(input.travelers) && Number.isFinite(input.budget));
  }
  assert.equal(dates.timeMinutes("2026-11-21"), null);
  assert.equal(dates.timeMinutes("2026-11-21T23:59:00+03:00"), 1439);
  assert.equal(dates.timeMinutes("25:00"), null);
});

test("flights: alternate dates, one-way fares and invalid prices cannot enter round-trip results", () => {
  const result = normalizeRoundTripFlights([
    flight,
    { ...flight, id: "wrong-date", outbound: leg(dates.addDays(start, -11)), priceTry: 1 },
    { ...flight, id: "one-way", inbound: undefined, priceTry: 1 },
    { ...flight, id: "invalid", priceTry: NaN },
    { ...flight, id: "unknown-arrival", outbound: { ...leg(start), arrival: "" } },
  ], start, end);
  assert.deepEqual(result.map((item) => item.id), ["valid", "unknown-arrival"]);
  assert.equal(result[1].outbound.arrival, "");
});

test("Travelpayouts: exact dates only, no fictional arrival/reverse flight, unique offer ids and passenger links", async () => {
  const requested = [];
  const isolated = createLoader({
    "../automation/flight-sync.cjs": { ...require("../src/lib/automation/flight-sync.cjs"), freshRoute: () => null },
    "src/lib/server-utils.ts": {
      cached: (_key, _ttl, operation) => operation(), seeded: () => () => 0.5,
      fetchJson: async (url) => { requested.push(url); return { data: [
        { price: 1000, airline: "TK", flight_number: 123, departure_at: `${start}T10:00:00`, return_at: `${end}T17:00:00` },
        { price: 1100, airline: "TK", flight_number: 123, departure_at: `${start}T11:00:00`, return_at: `${end}T18:00:00` },
        { price: 1, departure_at: dates.addDays(start, -11), return_at: end },
        { price: 1, departure_at: start },
      ] }; },
    },
  }, { ...process, env: { TRAVELPAYOUTS_TOKEN: "test-only-provider-token" } });
  const { searchFlights } = isolated("src/lib/providers/flights.ts");
  const result = await searchFlights(getCity("roma"), { code: "IST", factor: 1 }, start, end, 55, 6);
  assert.equal(requested.length, 1);
  assert.equal(new URL(requested[0]).searchParams.get("one_way"), "false");
  assert.equal(result.flights.length, 2);
  assert.notEqual(result.flights[0].id, result.flights[1].id);
  assert.equal(result.flights[0].outbound.arrival, "");
  assert.equal(result.flights[0].inbound.flightNumber, undefined);
  assert.match(result.flights[0].skyscannerUrl, /adultsv2=6/);
});

test("itinerary: all supported cities have valid times and at most one meal per slot", () => {
  for (const city of CITIES) {
    const days = buildItinerary({ ...itineraryArgs, city, nights: 14 });
    assert.equal(days.length, 15);
    for (const day of days) {
      for (const activity of day.activities) assert.ok(activity.time === "Saat bekleniyor" || dates.timeMinutes(activity.time) !== null, `${city.id}: ${activity.title}: ${activity.time}`);
      for (const slot of ["kahvalti", "ogle", "aksam"]) assert.ok(day.activities.filter((activity) => activity.mealSlot === slot).length <= 1, `${city.id}: duplicate ${slot}`);
    }
  }
});

test("SerpApi: round-trip price search includes the return date and leaves unknown return times unset", async () => {
  let requested;
  const isolated = createLoader({ "src/lib/server-utils.ts": {
    cached: (_key, _ttl, operation) => operation(), seeded: () => () => 0.5,
    fetchJson: async (url) => {
      requested = new URL(url);
      return { best_flights: [{ price: 1500, total_duration: 180, flights: [{ airline: "Test", departure_airport: { id: "IST", time: `${start} 10:00` }, arrival_airport: { id: "FCO", time: `${start} 13:00` } }] }] };
    },
  } }, { ...process, env: { SERPAPI_KEY: "test-only-provider-key", FLIGHT_PRICE_PROVIDER: "legacy-multi-provider" } });
  const result = await isolated("src/lib/providers/flights.ts").searchFlights(getCity("roma"), { code: "IST", factor: 1 }, start, end, 55);
  assert.equal(requested.searchParams.get("type"), "1");
  assert.equal(requested.searchParams.get("return_date"), end);
  assert.equal(result.flights[0].inbound.departure, end);
  assert.equal(result.flights[0].inbound.arrival, "");
});

test("itinerary: unknown times do not invent first/last-day schedules", () => {
  const days = buildItinerary({ ...itineraryArgs, flight: { ...flight, outbound: { ...leg(start), arrival: start }, inbound: { ...leg(end), departure: end } } });
  assert.ok(days[0].activities.every((activity) => activity.time === "Saat bekleniyor"));
  assert.ok(days.at(-1).activities.every((activity) => activity.time === "Saat bekleniyor"));
});

test("itinerary: overnight arrivals and early return transfers stay on the correct dates", () => {
  const overnight = { ...flight, outbound: { ...leg(start, "23:00"), arrival: `${dates.addDays(start, 1)} 07:00` }, inbound: leg(end, "01:00") };
  const days = buildItinerary({ ...itineraryArgs, flight: overnight });
  assert.equal(days[0].activities.length, 1);
  assert.ok(days[1].activities.some((activity) => activity.kind === "otel" && activity.time === "08:15"));
  assert.ok(days.at(-2).activities.some((activity) => activity.title === "Havalimanına transfer" && activity.time === "22:00"));
  assert.equal(days.at(-1).activities[0].time, "01:00");
  const late = buildItinerary({ ...itineraryArgs, flight: { ...flight, outbound: { ...leg(start), arrival: `${start} 23:30` } } });
  assert.ok(late[1].activities.some((activity) => activity.kind === "otel" && activity.time === "00:45"));
});

test("budget: group hotel charged once, transfer once, rounded components sum exactly", () => {
  const result = computeBudget(budgetArgs);
  assert.equal(result.hotel, 4938);
  assert.equal(result.transport, Math.round((123 * 5 + 446.08) * 6));
  assert.equal(result.total, result.flight + result.hotel + result.food + result.transport + result.activities);
  assert.equal(result.remaining, 100000 - result.total);
});

test("budget: replacing lunch is merged once, food stays in food before/after optimization", () => {
  const base = { time: "13:00", title: "Generic lunch", costTry: 100, kind: "yemek", mealSlot: "ogle" };
  const restaurant = { ...base, title: "Chosen restaurant", costTry: 900, lat: 41, lon: 12 };
  const days = [{ day: 1, date: start, title: "Day", activities: [base] }];
  const args = { ...budgetArgs, travelers: 1, dailyFood: 500, days, extraActivities: { 1: [restaurant] } };
  assert.equal(mergeDayActivities([base], [restaurant]).length, 1);
  const before = computePlanBudget(args);
  const after = computePlanBudget({ ...args, days: [{ ...days[0], activities: [restaurant] }], extraActivities: {} });
  assert.deepEqual(before, after);
  assert.equal(before.activities, 0);
  assert.equal(before.food, 500 * 5 + 400);
});

test("route optimization preserves fixed transport, check-in and meal times", () => {
  const activities = [
    { time: "08:00", title: "Arrival", kind: "ulasim", costTry: 0 },
    { time: "09:00", title: "Hotel", kind: "otel", lat: 41, lon: 12, costTry: 0 },
    { time: "10:00", title: "Museum B", kind: "gezi", lat: 41.1, lon: 12.1, costTry: 100, durationMin: 30 },
    { time: "11:00", title: "Museum A", kind: "gezi", lat: 41.01, lon: 12.01, costTry: 100, durationMin: 30 },
    { time: "13:00", title: "Lunch", kind: "yemek", lat: 41.02, lon: 12.02, costTry: 100 },
    { time: "15:00", title: "Transfer", kind: "ulasim", costTry: 0 },
  ];
  const result = optimizeDayActivities(activities);
  for (const activity of activities.filter((item) => item.kind !== "gezi")) assert.deepEqual(result.optimized.find((item) => item.title === activity.title), activity);
  assert.ok(result.optimizedKm <= result.originalKm);
});

test("meal guide: multiple-room packages use the same group-cost formula", () => {
  const { buildCityBudgetGuide } = load("src/lib/providers/restaurants.ts");
  const hotel = { id: "group", pricePerNightTry: 2000, rating: 8, stars: 3 };
  const guide = buildCityBudgetGuide({ city: getCity("roma"), nights: 4, rooms: 3, travelers: 6, eurRate: 55, flights: [flight], hotels: [hotel], activitiesTotalTry: 100 });
  const tier = guide.tierTotalEstimates.dengeli;
  const expected = computeBudget({ ...budgetArgs, hotelPerNight: 2000, dailyFood: guide.mealCosts.dengeli.dailyTotalTry, dailyTransport: Math.round(getCity("roma").transportEur * 55), airportTransferPerPerson: 440, activitiesTotal: 100 });
  assert.equal(tier.totalTripTry, expected.total);
});

test("hostel: per-bed prices account for every traveler", () => {
  const { adaptHotelForTravelers } = load("src/lib/providers/hotels.ts");
  assert.equal(adaptHotelForTravelers({ roomTypeTag: "hostel", priceEur: 20 }, 6, 100).priceEurForGroup, 120);
});

test("AI enrichment cannot alter prices, transport times, coordinates or add paid activities", async () => {
  const draft = buildItinerary(itineraryArgs);
  const tampered = draft.map((day) => ({ ...day, activities: day.activities.map((activity) => ({ ...activity, time: "00:00", costTry: 999999, lat: 1, description: "Improved prose" })) }));
  const isolated = createLoader({ "src/lib/server-utils.ts": { fetchJson: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ days: tampered, tips: [] }) }] } }] }) } }, { ...process, env: { GEMINI_API_KEY: "test-key" } });
  const { enhanceWithGemini } = isolated("src/lib/planner/gemini.ts");
  const result = await enhanceWithGemini({ ...itineraryArgs, draft, activityBudgetTry: 1000 });
  for (let day = 0; day < draft.length; day++) for (let activity = 0; activity < draft[day].activities.length; activity++) {
    const original = draft[day].activities[activity], actual = result.days[day].activities[activity];
    assert.equal(actual.costTry, original.costTry); assert.equal(actual.time, original.time); assert.equal(actual.lat, original.lat);
  }
});

test("full plan: server/browser totals agree and flexible dates retain the trip length", async () => {
  const hotel = { id: "hotel", name: "Test Hotel", pricePerNightTry: 2000, rating: 8, stars: 3, lat: 41.9, lon: 12.5, roomCount: 1, amenities: [], source: "ornek" };
  const isolated = createLoader({
    "src/lib/providers/currency.ts": { getRates: async () => ({ EUR: 55.763, USD: 50, live: true }) },
    "src/lib/providers/flights.ts": { searchFlights: async () => ({ flights: [flight], live: false }), estimateFlightTry: () => 2000 },
    "src/lib/providers/hotels.ts": { searchHotels: async () => ({ hotels: [hotel], live: false }) },
    "src/lib/providers/weather.ts": { getWeather: async () => null },
    "src/lib/planner/gemini.ts": { enhanceWithGemini: async () => null },
  });
  const { buildPlan } = isolated("src/lib/planner/index.ts");
  const input = { origin: "IST", destination: "roma", startDate: start, endDate: end, travelers: 2, budget: 100000, comfort: "dengeli", interests: ["tarih", "yemek"] };
  const plan = await buildPlan(input);
  assert.equal(plan.dailyFoodTry, plan.budgetGuide.mealCosts.dengeli.dailyTotalTry);
  const browserBudget = computePlanBudget({
    flightPerPerson: flight.priceTry, hotelPerNight: hotel.pricePerNightTry, nights: plan.nights, rooms: plan.rooms,
    travelers: input.travelers, dailyFood: plan.dailyFoodTry, dailyTransport: plan.dailyTransportTry,
    airportTransferPerPerson: plan.airportTransferTry, days: plan.days, budget: input.budget,
  });
  assert.deepEqual(browserBudget, plan.budget);
  for (const date of plan.flexDates) assert.equal(dates.nightsBetween(date.date, date.endDate), plan.nights);
  const changed = { ...flight, outbound: { ...flight.outbound, arrival: `${start} 18:00` } };
  const rebuilt = buildSelectedItinerary(plan, input, changed, { ...hotel, name: "Changed Hotel" }, plan.dailyFoodTry);
  assert.ok(rebuilt[0].activities.some((activity) => activity.kind === "otel" && activity.time === "19:15" && activity.title.includes("Changed Hotel")));
});

test("hotel provider: three travelers are not priced as a two-person room", async () => {
  const isolated = createLoader({ "src/lib/server-utils.ts": {
    cached: (_key, _ttl, operation) => operation(), haversineKm: () => 0,
    fetchJson: async () => ({ properties: [{ name: "Double Room Hotel", rate_per_night: { extracted_lowest: 1000 }, gps_coordinates: { latitude: 41.9, longitude: 12.5 } }] }),
  } }, { ...process, env: { SERPAPI_KEY: "test-only-provider-key" } });
  const { searchHotels } = isolated("src/lib/providers/hotels.ts");
  const result = await searchHotels(getCity("roma"), start, end, 3, 55);
  assert.equal(result.hotels[0].roomCount, 2);
  assert.equal(result.hotels[0].pricePerNightTry, 2000);
});
