const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { NextRequest } = require("next/server");
const { createLoader } = require("./test-helpers.cjs");
const load = createLoader();
const request = (path, body, headers = {}) => new NextRequest("http://localhost:3000" + path, {
  method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body),
});

test("public form limits cannot be bypassed with forged IPs or fresh identities", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rotazur-public-test-"));
  const isolated = createLoader({}, { ...process, cwd: () => root, env: { TRUST_PROXY_HOPS: "0" } });
  const { db } = isolated("src/lib/db.ts");
  t.after(() => { db.close(); assert.equal(path.dirname(root), os.tmpdir()); fs.rmSync(root, { recursive: true, force: true }); });
  const { limitPublicRequest } = isolated("src/lib/public-request.ts");
  for (let i = 0; i < 50; i++) assert.equal(limitPublicRequest(request("/api/contact", { email: `test-${i}@example.invalid` }, { "X-Forwarded-For": `203.0.113.${i}` }), "contact", 5, 50), null);
  const blocked = limitPublicRequest(request("/api/contact", {}, { "X-Forwarded-For": "198.51.100.1" }), "contact", 5, 50);
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("Retry-After")) > 0);
  assert.equal(db.prepare("SELECT count(*) AS count FROM rate_limits").get().count, 1);
});

test("contact and subscriber forms reject other origins, invalid/oversized JSON before writing", async () => {
  let writes = 0;
  const isolated = createLoader({
    "@/lib/db": { db: { prepare: () => ({ run: () => { writes++; } }) } },
    "src/lib/rate-limit.ts": { checkRateLimit: () => ({ allowed: true }) },
  });
  for (const name of ["contact", "newsletter"]) {
    const route = isolated(`src/app/api/${name}/route.ts`);
    assert.equal((await route.POST(request(`/api/${name}`, {}, { Origin: "https://other.invalid" }))).status, 403);
    assert.equal((await route.POST(request(`/api/${name}`, "{"))).status, 400);
    assert.equal((await route.POST(request(`/api/${name}`, { padding: "x".repeat(40000) }))).status, 413);
  }
  assert.equal(writes, 0);
});

test("contact addresses are validated without silently truncating to another address", async () => {
  let saved;
  const isolated = createLoader({
    "@/lib/db": { db: { prepare: () => ({ run: (...values) => { saved = values; } }) } },
    "src/lib/rate-limit.ts": { checkRateLimit: () => ({ allowed: true }) },
  });
  const email = "a".repeat(64) + "@" + "b".repeat(60) + "." + "c".repeat(45) + ".example";
  const route = isolated("src/app/api/contact/route.ts");
  assert.equal((await route.POST(request("/api/contact", { email, name: "Test User", subject: "Test", message: "Sadece izole veritabanına yazılan test mesajı." }))).status, 200);
  assert.equal(saved[2], email);
  assert.equal((await route.POST(request("/api/contact", { email: "a".repeat(260) + "@example.invalid", name: "Test", subject: "Test", message: "Geçersiz adres testi" }))).status, 400);
});

test("login flood protection runs before password verification or user lookup", async () => {
  const isolated = createLoader({
    "@/lib/db": { db: { prepare: () => { throw new Error("Must not query users"); } } },
    "@/lib/auth": { verifyPassword: () => { throw new Error("Must not hash passwords"); } },
    "@/lib/public-request": { limitPublicRequest: () => Response.json({ error: "limited" }, { status: 429 }) },
  });
  assert.equal((await isolated("src/app/api/auth/login/route.ts").POST(request("/api/auth/login", { email: "test@example.invalid", password: "test-only" }))).status, 429);
});

test("packing item deletion keeps other checked identities, including imported legacy checklists", () => {
  const checklists = load("src/lib/travel-checklists.ts");
  const legacy = { "doc-pass": true, "custom-0": false, "custom-1": true, "custom-2": false };
  const record = checklists.migratePackingRecord(legacy, ["Şemsiye", "Lens suyu", "Tripod"]);
  assert.equal(checklists.isPackingRecord(record), true);
  const lens = record.customItems[1].id;
  const withoutFirst = checklists.removePackingItem(record, record.customItems[0].id);
  assert.equal(withoutFirst.checked[lens], true);
  assert.equal(withoutFirst.customItems[0].text, "Lens suyu");
  assert.equal(withoutFirst.checked[withoutFirst.customItems[1].id], false);
  const removedLens = checklists.removePackingItem(withoutFirst, lens);
  assert.equal(Object.hasOwn(removedLens.checked, lens), false);
  assert.equal(legacy["custom-1"], true); // source retained
  assert.equal(checklists.isPackingRecord({ checked: [], customItems: [] }), false);
  assert.equal(checklists.isPackingRecord({ checked: {}, customItems: [{ id: "custom-a", text: "A" }, { id: "custom-a", text: "B" }] }), false);
});

test("packing and preparation lists are scoped to the real trip rather than only its city", () => {
  const { tripScope } = load("src/lib/trip-expenses.ts");
  const trip = { destination: "roma", origin: "IST", startDate: "2026-11-01", endDate: "2026-11-04", travelers: 2 };
  for (const difference of [{ startDate: "2026-11-02" }, { endDate: "2026-11-05" }, { travelers: 3 }, { origin: "ESB" }]) assert.notEqual(tripScope(trip), tripScope({ ...trip, ...difference }));
  for (const file of ["PackingListModal", "SmartTravelTools"]) {
    const source = fs.readFileSync(`src/components/${file}.tsx`, "utf8");
    assert.match(source, /useLocalRecord/);
    assert.match(source, /tripScope\(/);
  }
});

test("local-currency calculations use plan cross rates consistently and preserve references explicitly", () => {
  const { getCityCurrencyInfo } = load("src/lib/providers/city-tools.ts");
  const { convertWalletAmount } = load("src/lib/trip-expenses.ts");
  const gbp = getCityCurrencyInfo({ id: "londra", currencyCode: "GBP" }, { EUR: 60, GBP: 75 });
  assert.equal(gbp.perEur, 0.8);
  assert.equal(convertWalletAmount(8, "LOCAL", 60, gbp).amountTry, 600);
  const jpy = getCityCurrencyInfo({ id: "tokyo", currencyCode: "JPY" }, { EUR: 60, localPerEur: { JPY: 180 } });
  assert.equal(jpy.rateSource, "plan");
  assert.equal(convertWalletAmount(1800, "LOCAL", 60, jpy).amountTry, 600);
  const reference = getCityCurrencyInfo({ id: "tokyo", currencyCode: "JPY" }, { EUR: 60 });
  assert.equal(reference.rateSource, "reference");
  assert.equal(getCityCurrencyInfo({ id: "tokyo", currencyCode: "JPY" }, { localPerEur: { JPY: Infinity } }).rateSource, "reference");
});

test("currency provider retains destination cross rates for offline wallets", async () => {
  const raw = { EUR: 0.02, USD: 0.025, GBP: 0.016, RUB: 1.7, CNY: 0.14, SAR: 0.09, AED: 0.088, JPY: 3.6, RSD: 2.34 };
  let saved;
  const isolated = createLoader({
    "node:fs": { existsSync: () => true, writeFileSync: (_, value) => { saved = JSON.parse(value); } },
    "../server-utils": { cached: (_, __, callback) => callback(), fetchJson: async () => ({ result: "success", rates: raw }) },
  });
  const rates = await isolated("src/lib/providers/currency.ts").getRates();
  assert.equal(rates.localPerEur.JPY, 180);
  assert.ok(Math.abs(saved.localPerEur.RSD - 117) < 1e-10);
});

test("guide exports honor section choices and never invent unknown times or charge rooms twice", () => {
  const { buildTravelGuideText, guideActivityTime } = load("src/lib/travel-guide.ts");
  const data = {
    city: { name: "Test", country: "Test", iata: "TST", visa: "Test vize", emergencyPhone: "TEST-PHONE" },
    input: { origin: "IST", startDate: "2026-11-01", endDate: "2026-11-04", travelers: 3 },
    nights: 3, rooms: 2, flights: [{ airline: "TEST-AIRLINE", priceTry: 100 }],
    hotels: [{ name: "TEST-HOTEL", stars: 3, pricePerNightTry: 1000 }],
    restaurants: [{ name: "TEST-RESTAURANT", neighborhood: "Merkez", avgPricePerPersonTry: 50 }],
    days: [{ day: 1, date: "2026-11-01", activities: [{ time: "", title: "TEST-ACTIVITY", description: "Test", costTry: 0 }] }],
    budget: { flight: 300, hotel: 3000, food: 100, transport: 20, activities: 10 },
  };
  const options = { data, input: data.input, budgetTier: "dengeli", totalTry: 3430, cur: "TRY", rates: {}, includeFlightHotel: false, includeFood: false, includeTips: false, includeBudget: false };
  const hidden = buildTravelGuideText(options);
  assert.doesNotMatch(hidden, /TEST-HOTEL|TEST-AIRLINE|TEST-RESTAURANT|TEST-PHONE|BÜTÇE DAĞILIMI|09:30/);
  assert.match(hidden, /Saat doğrulanmalı - TEST-ACTIVITY/);
  const visible = buildTravelGuideText({ ...options, includeFlightHotel: true, includeFood: true, includeTips: true, includeBudget: true });
  for (const section of ["TEST-HOTEL", "TEST-AIRLINE", "TEST-RESTAURANT", "TEST-PHONE", "BÜTÇE DAĞILIMI"]) assert.ok(visible.includes(section));
  assert.match(visible, /Toplam: ₺3\.000/);
  assert.doesNotMatch(visible, /₺6\.000/);
  assert.equal(guideActivityTime("25:00"), "Saat doğrulanmalı");
  assert.equal(guideActivityTime("13:45"), "13:45");
});
