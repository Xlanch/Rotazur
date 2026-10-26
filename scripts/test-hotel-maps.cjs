const test = require("node:test");
const assert = require("node:assert/strict");
const { createLoader } = require("./test-helpers.cjs");
const load = createLoader();
const { CITIES } = load("src/lib/cities.ts");
const { normalizeBookingResults } = load("src/lib/providers/booking-serp.ts");
const { bookingCountryCode } = load("src/lib/hotel-location.ts");
const { hotelCoordinates, hotelNavigationActivities, applyHotelCoordinates } = load("src/lib/hotel-data.ts");
const { hotelMapMarkers, hotelMarkerId } = load("src/lib/hotel-map.ts");
const { coordinateMapUrl, mapLinkPoint, satelliteTile, satelliteCovers, hasMapCoordinates, MAP_LAYERS } = load("src/lib/map-data.ts");
const start = "2026-11-22", end = "2026-11-26";
function raw(city, id = 1234) {
  return { search_parameters: { engine: "booking", check_in_date: start, check_out_date: end, adults: 2, rooms: 1, currency: "TRY", children: 0 },
    search_metadata: { status: "Success", processed_at: new Date().toISOString() }, properties: [{ property_id: id,
      name: `Property ${id}`, address: `Source street address ${id}`, currency: "TRY", extracted_price: 1234.56,
      gps_coordinates: { latitude: city.lat + 0.0001234567, longitude: city.lon + 0.0007654321 },
      link: `https://www.booking.com/hotel/${bookingCountryCode(city.id)}/property-${id}.html?checkin=${start}&checkout=${end}&group_adults=2&no_rooms=1&group_children=0` }] };
}
const hotelFor = (city, id) => normalizeBookingResults(raw(city, id), city, start, end, 2, 1)[0];

test("all supported destinations join exact source GPS, property identity, address and country without rounding or invented city positions", () => {
  for (const city of CITIES) {
    const response = raw(city), hotel = normalizeBookingResults(response, city, start, end, 2, 1)[0];
    const point = hotelCoordinates(hotel);
    assert.ok(point, city.id);
    assert.equal(point.lat, response.properties[0].gps_coordinates.latitude);
    assert.equal(point.lon, response.properties[0].gps_coordinates.longitude);
    assert.equal(hotel.hotelLocation.propertyId, hotel.bookingQuote.hotelId);
    assert.equal(hotel.hotelLocation.cityId, city.id);
    assert.equal(hotel.hotelLocation.address, response.properties[0].address);
    assert.notDeepEqual(point, { lat: city.lat, lon: city.lon });
  }
});

test("plausible coordinates cannot be mapped when hotel identity, source, address or property URL no longer matches", () => {
  const hotel = hotelFor(CITIES[0]);
  for (const patch of [{ id: "booking-9999" }, { source: "ornek" }, { source: "serpapi" }, { locationSource: undefined },
    { hotelLocation: undefined }, { lat: hotel.lat + 0.01 }, { lon: hotel.lon + 0.01 },
    { bookingUrl: hotel.bookingUrl.replace("property-1234", "other-property") }, { bookingQuote: { ...hotel.bookingQuote, hotelId: 9999 } }]) {
    assert.equal(hotelCoordinates({ ...hotel, ...patch }), null);
  }
  for (const patch of [{ address: "" }, { source: "unverified" }, { propertyId: 999 }, { checkedAt: "not-a-date" }, { cityId: "__proto__" }]) {
    assert.equal(hotelCoordinates({ ...hotel, hotelLocation: { ...hotel.hotelLocation, ...patch } }), null);
  }
});

test("wrong country, swapped latitude/longitude, invalid map latitudes and absent source addresses never create hotel pins", () => {
  for (const city of CITIES) {
    const response = raw(city); response.properties[0].link = response.properties[0].link.replace(`/hotel/${bookingCountryCode(city.id)}/`, "/hotel/zz/");
    assert.deepEqual(normalizeBookingResults(response, city, start, end, 2, 1), []);
  }
  const city = CITIES.find((c) => c.id === "bangkok"), response = raw(city);
  response.properties[0].gps_coordinates = { latitude: city.lon, longitude: city.lat };
  assert.deepEqual(normalizeBookingResults(response, city, start, end, 2, 1), []);
  const missingAddress = raw(city); delete missingAddress.properties[0].address;
  const [hotel] = normalizeBookingResults(missingAddress, city, start, end, 2, 1);
  assert.ok(hotel.bookingQuote); assert.equal(hotelCoordinates(hotel), null);
  assert.equal(hasMapCoordinates({ lat: 90, lon: 0 }), false);
  assert.equal(hasMapCoordinates({ lat: 0, lon: 0 }), true);
});

test("every returned verified hotel is mapped with a unique property identity; buildings shared by two hotels stay distinct", () => {
  const first = hotelFor(CITIES[0], 11), second = hotelFor(CITIES[0], 22);
  const hotels = [first, second, first, { ...first, id: "estimate", source: "ornek" }];
  const markers = hotelMapMarkers(hotels, second.id);
  assert.equal(markers.length, 2); assert.equal(markers[0].small, true); assert.equal(markers[1].small, false);
  assert.equal(markers[1].id, hotelMarkerId(second));
  assert.equal(markers[0].lat, markers[1].lat); assert.equal(markers[0].lon, markers[1].lon);
  assert.match(markers[1].subtitle, /Source street address 22/);
});

test("old check-in points and saved itinerary positions cannot route users to a previous hotel", () => {
  const hotel = hotelFor(CITIES.find((c) => c.id === "bangkok"));
  const activities = [{ id: "check-in", kind: "otel", title: "Check-in", lat: 41, lon: 12 }, { kind: "gezi", lat: 0, lon: 1, title: "Visit" }];
  const fixed = hotelNavigationActivities(activities, hotel);
  assert.deepEqual([fixed[0].lat, fixed[0].lon], [hotel.lat, hotel.lon]); assert.equal(fixed[0].id, "check-in");
  assert.equal(activities[0].lat, 41);
  assert.deepEqual(hotelNavigationActivities(activities, { ...hotel, source: "ornek" }), [activities[1]]);
  const restored = applyHotelCoordinates([{ activities }], hotel);
  assert.equal(restored[0].activities[0].lon, hotel.lon);
});

test("Google Maps opens the exact focused/selected hotel point, rather than the city center or a fuzzy name search", () => {
  for (const city of CITIES) {
    const hotel = hotelFor(city), selected = hotelCoordinates(hotel);
    const point = mapLinkPoint(null, selected, city);
    const url = new URL(coordinateMapUrl(point));
    assert.equal(url.searchParams.get("query"), `${hotel.lat},${hotel.lon}`);
    assert.notEqual(url.searchParams.get("query"), `${city.lat},${city.lon}`);
    assert.deepEqual(mapLinkPoint([0, 0], selected, city), { lat: 0, lon: 0 });
  }
  assert.equal(coordinateMapUrl({ lat: NaN, lon: 1 }), null);
  assert.equal(mapLinkPoint(null, undefined, { lat: 100, lon: 1 }), null);
});

test("the satellite WMTS uses correct XYZ row/column and Web Mercator projection for all cities, including negative longitudes and Bali", () => {
  for (const city of CITIES) {
    assert.equal(satelliteCovers(city), true);
    const tile = satelliteTile(city), n = 2 ** 14, url = new URL(tile.url);
    const west = tile.x / n * 360 - 180, east = (tile.x + 1) / n * 360 - 180;
    const north = Math.atan(Math.sinh(Math.PI * (1 - 2 * tile.y / n))) * 180 / Math.PI;
    const south = Math.atan(Math.sinh(Math.PI * (1 - 2 * (tile.y + 1) / n))) * 180 / Math.PI;
    assert.ok(city.lon >= west && city.lon <= east, city.id);
    assert.ok(city.lat >= south && city.lat <= north, city.id);
    assert.equal(url.searchParams.get("TILECOL"), String(tile.x)); assert.equal(url.searchParams.get("TILEROW"), String(tile.y));
    assert.equal(url.searchParams.get("TILEMATRIXSET"), "EPSG:3857");
    assert.equal(url.searchParams.get("TIME"), "2021-01-01");
    assert.equal(url.searchParams.has("api_key"), false);
  }
  assert.equal(satelliteTile({ lat: 84, lon: 0 }), null);
  assert.equal(satelliteTile({ lat: 10, lon: 0 }, 16), null); // Never request unsupported native detail.
  assert.equal(MAP_LAYERS.satellite.maxNativeZoom, 14);
  assert.match(MAP_LAYERS.satellite.attribution, /CC BY 4.0/);
});

function mapRuntime(t, style) {
  const originalObserver = global.ResizeObserver;
  global.ResizeObserver = class { observe() {} disconnect() {} };
  t.after(() => { global.ResizeObserver = originalObserver; });
  const effects = [], cleanups = [], states = [], drawn = [], handlers = {}, configs = [], panes = [];
  let refIndex = 0, stateIndex = 0;
  const fakeMap = { invalidateSize() {}, remove() {}, on() {}, setView() {}, getZoom: () => 13,
    attributionControl: { setPosition() {}, setPrefix() {} }, setMinZoom() {}, setMaxZoom() {},
    getPane: () => ({ classList: { toggle: (...args) => panes.push(args) } }), flyTo() {}, flyToBounds() {} };
  const fakeLeaflet = { map: () => fakeMap, control: { zoom: () => ({ addTo() {} }) },
    layerGroup: () => ({ addTo() { return this; }, clearLayers() {} }),
    tileLayer: (url, options) => { configs.push({ url, options }); return { on: (event, fn) => { handlers[event] = fn; }, addTo() { return this; }, off() {}, remove() {} }; },
    divIcon: (config) => config, latLngBounds: (points) => points,
    marker: (point) => { drawn.push(point); return { bindPopup() { return this; }, addTo() { return this; }, on() {}, openPopup() {} }; },
    polyline: () => ({ addTo() {} }),
  };
  const fakeReact = { useRef: (initial) => ({ current: refIndex++ === 0 ? {} : initial }),
    useEffect: (effect) => effects.push(effect),
    useState: (initial) => { const index = stateIndex++; return [index === 1 ? style : typeof initial === "function" ? initial() : initial, (value) => states.push({ index, value })]; },
  };
  const component = createLoader({ react: fakeReact, leaflet: fakeLeaflet, "leaflet/dist/leaflet.css": {}, "lucide-react": {},
    "@/components/Localize": { Localize: "fragment" }, "./LanguageContext": { useLanguage: () => ({ translate: value => value }) },
  })("src/components/MapView.tsx").default;
  const hotel = hotelFor(CITIES.find((c) => c.id === "bangkok"));
  const markers = hotelMapMarkers([hotel], hotel.id);
  const tree = component({ center: [13.7563, 100.5018], markers, primaryMarkerId: markers[0].id, focus: [hotel.lat, hotel.lon] });
  for (const effect of effects) { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }
  t.after(() => cleanups.reverse().forEach((cleanup) => cleanup()));
  return { drawn, configs, states, handlers, panes, hotel, tree };
}

test("real map component retains identical hotel coordinates and satellite colors when switching street/satellite layers", (t) => {
  const street = mapRuntime(t, "street"), satellite = mapRuntime(t, "satellite");
  assert.deepEqual(street.drawn, satellite.drawn);
  assert.deepEqual(satellite.drawn, [[satellite.hotel.lat, satellite.hotel.lon]]);
  assert.match(street.configs[0].url, /tile.openstreetmap.org/);
  assert.match(satellite.configs[0].url, /wmts.terrascope.be/);
  assert.equal(satellite.configs[0].options.maxNativeZoom, 14);
  assert.deepEqual(satellite.panes, [["satellite-mode", true]]);
});

test("a failed satellite layer returns to street without changing or replacing hotel coordinates", (t) => {
  const runtime = mapRuntime(t, "satellite"), original = JSON.stringify(runtime.drawn);
  runtime.handlers.loading(); runtime.handlers.tileerror(); runtime.handlers.load();
  assert.ok(runtime.states.some((entry) => entry.index === 1 && entry.value === "street"));
  assert.ok(runtime.states.some((entry) => entry.index === 2 && /aynı koordinatlarla/.test(entry.value)));
  assert.equal(JSON.stringify(runtime.drawn), original);
});
