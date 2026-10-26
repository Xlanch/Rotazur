const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");
const { NextRequest } = require("next/server");
const { createLoader } = require("./test-helpers.cjs");
const load = createLoader({}, { ...process, env: {} });
const finance = load("src/lib/trip-expenses.ts");
const requests = load("src/lib/request-security.ts");
const req = (url, method = "POST", body = {}, headers = {}) => new NextRequest("http://localhost:3001" + url, {
  method, headers: { "Content-Type": "application/json", ...headers }, ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
});
function temporary(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rotazur-finance-test-"));
  t.after(() => { assert.equal(path.dirname(root), os.tmpdir()); fs.rmSync(root, { recursive: true, force: true }); });
  return root;
}
const expense = (amountTry, paidBy = "A", id = "manual") => ({ id, amountTry, paidBy, title: "Manuel harcama", category: "diger" });

test("kuruş settlement conserves every payment, including tiny debts, uneven divisions and unusual names", () => {
  for (let count = 1; count <= 9; count++) {
    const members = Array.from({ length: count }, (_, i) => i === 0 ? "__proto__" : `Yolcu ${i}`);
    for (const amount of [0.01, 0.02, 0.1, 1, 10.01, 100, 1000.99]) {
      const ledger = { members, expenses: [expense(amount, members.at(-1))] };
      const result = finance.settleGroup(ledger);
      const paid = new Map(members.map((m) => [m, 0]));
      paid.set(members.at(-1), finance.moneyCents(amount));
      for (const transfer of result.settlements) {
        assert.ok(transfer.amountTry >= 0.01);
        paid.set(transfer.from, paid.get(transfer.from) + finance.moneyCents(transfer.amountTry));
        paid.set(transfer.to, paid.get(transfer.to) - finance.moneyCents(transfer.amountTry));
      }
      const shares = [...paid.values()];
      assert.equal(shares.reduce((a, b) => a + b, 0), finance.moneyCents(amount));
      assert.ok(Math.max(...shares) - Math.min(...shares) <= 1);
      assert.equal(Object.values(result.netByMember).reduce((a, b) => a + Math.round(b * 100), 0), 0);
    }
  }
  for (const amount of [NaN, Infinity, -1, 100_000_001]) assert.throws(() => finance.roundMoney(amount));
  assert.equal(finance.roundMoney(1.005), 1.01);
  assert.equal(finance.roundMoney(10.075), 10.08);
  assert.equal(finance.roundMoney(1e-7), 0);
  assert.equal(finance.isGroupLedger({ members: ["A", "A"], expenses: [] }), false);
  assert.equal(finance.isGroupLedger({ members: ["A"], expenses: [expense(10, "deleted")] }), false);
});

test("plan import preserves manual payments, refreshes existing imported amounts and includes every budget category", () => {
  const original = { members: ["A", "B"], expenses: [expense(12.34), { ...expense(1, "B", "imp-flight-123"), category: "ucus" }] };
  const totals = { flight: 100, hotel: 200, food: 300, transport: 40, activities: 50 };
  const once = finance.importPlanExpenses(original, totals), twice = finance.importPlanExpenses(once, { ...totals, flight: 150 });
  assert.equal(twice.expenses.length, 6);
  assert.equal(twice.expenses.find((e) => e.id === "manual").amountTry, 12.34);
  assert.equal(twice.expenses.find((e) => e.imported === "flight").paidBy, "B");
  assert.equal(twice.expenses.find((e) => e.imported === "flight").amountTry, 150);
  assert.equal(finance.settleGroup(twice).totalTry, 752.34);
  assert.equal(original.expenses.length, 2);
});

test("separate trips cannot share a ledger, while changing the price package keeps the same real trip", () => {
  const input = { destination: "roma", origin: "IST", startDate: "2026-11-21", endDate: "2026-11-24", travelers: 2, budget: 50000, comfort: "dengeli" };
  const key = finance.tripScope(input);
  for (const [field, value] of [["origin", "ESB"], ["startDate", "2026-11-22"], ["endDate", "2026-11-25"], ["travelers", 3]]) {
    assert.notEqual(finance.tripScope({ ...input, [field]: value }), key);
  }
  assert.equal(finance.tripScope({ ...input, budget: 100000, comfort: "konforlu" }), key);
});

test("local finance storage rejects corrupt records and keeps persisted data when a write is denied", (t) => {
  const before = { window: global.window, localStorage: global.localStorage };
  const memory = new Map(); let fail = false, changes = 0;
  global.window = new EventTarget();
  global.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => { if (fail) throw new Error("Quota"); memory.set(key, value); } };
  t.after(() => { global.window = before.window; global.localStorage = before.localStorage; });
  const records = load("src/lib/local-record.ts");
  window.addEventListener(records.LOCAL_RECORD_EVENT, () => changes++);
  const ledger = { members: ["A"], expenses: [expense(10.25)] };
  records.writeLocalRecord("trip-A", ledger);
  assert.equal(changes, 1);
  assert.deepEqual(records.readLocalRecord("trip-A", () => [], finance.isGroupLedger), ledger);
  assert.deepEqual(records.readLocalRecord("trip-B", () => [], finance.isWalletEntries), []);
  fail = true;
  assert.throws(() => records.writeLocalRecord("trip-A", { members: ["A"], expenses: [] }), /kaydedilemedi/);
  assert.deepEqual(JSON.parse(memory.get("trip-A")), ledger);
  memory.set("trip-C", "{broken");
  assert.throws(() => records.readLocalRecord("trip-C", () => [], finance.isWalletEntries), /korunuyor/);
  assert.equal(memory.get("trip-C"), "{broken");
  assert.equal(finance.isWalletEntries([{ category: "unknown", amountTry: Infinity }]), false);
});

test("actual payments display kuruş and supplied rates; the calendar countdown has no timezone day offset", () => {
  const { fmtMoney } = load("src/lib/format.ts");
  const { daysUntilTrip } = load("src/lib/travel-utils.ts");
  assert.match(fmtMoney(0.5), /0,50/);
  assert.match(fmtMoney(100, "USD", { USD: 50 }), /2,00/);
  assert.equal(daysUntilTrip("2026-10-23", "2026-10-22"), 1);
  assert.equal(daysUntilTrip("2026-10-22", "2026-10-22"), 0);
  assert.equal(daysUntilTrip("2026-10-21", "2026-10-22"), 0);
});

test("wallet conversions use supplied rates and retain tiny foreign-currency amounts until summing", () => {
  const local = { code: "RSD", perEur: 117 };
  assert.deepEqual(finance.convertWalletAmount(117, "LOCAL", 55.68, local), { amountTry: 55.68, amountEur: 1, code: "RSD" });
  assert.deepEqual(finance.convertWalletAmount(2, "EUR", 55.68, local), { amountTry: 111.36, amountEur: 2, code: "EUR" });
  const entries = Array.from({ length: 100 }, () => finance.convertWalletAmount(0.01, "TRY", 50, local));
  assert.equal(finance.roundMoney(entries.reduce((sum, e) => sum + e.amountTry, 0)), 1);
  assert.equal(finance.roundMoney(entries.reduce((sum, e) => sum + e.amountEur, 0)), 0.02);
  for (const bad of [0, -1, Infinity, NaN]) assert.throws(() => finance.convertWalletAmount(10, "EUR", bad, local));
});

test("JSON request limits apply to real bytes without Content-Length and malformed payloads return client errors", async () => {
  for (const body of ["null", "[]", "{broken"]) {
    await assert.rejects(requests.readJsonObject(new Request("http://localhost", { method: "POST", body })), (e) => e.status === 400);
  }
  await assert.rejects(requests.readJsonObject(req("/api/trips", "POST", { message: "x".repeat(1000) }), 100), (e) => e.status === 413);
  assert.deepEqual(await requests.readJsonObject(req("/api/trips", "POST", { cityId: "roma" })), { cityId: "roma" });
  assert.equal(requests.trustedClientAddress(req("/", "GET", {}, { "x-forwarded-for": "1.1.1.1" })), null);
  const proxy = createLoader({}, { ...process, env: { TRUST_PROXY_HOPS: "1" } })("src/lib/request-security.ts");
  assert.equal(proxy.trustedClientAddress(req("/", "GET", {}, { "x-forwarded-for": "forged, 8.8.8.8" })), "8.8.8.8");
  assert.equal(proxy.trustedClientAddress(req("/", "GET", {}, { "x-forwarded-for": "invalid" })), null);
});

test("concurrent cached requests share one provider operation; a rejection is retryable", async () => {
  const { cached } = createLoader()("src/lib/server-utils.ts");
  let calls = 0, release;
  const operation = () => { calls++; return new Promise((resolve) => { release = resolve; }); };
  const group = Array.from({ length: 30 }, () => cached("same-key", 10000, operation));
  await Promise.resolve();
  assert.equal(calls, 1); release("done");
  assert.deepEqual(await Promise.all(group), Array(30).fill("done"));
  await assert.rejects(cached("retry", 10000, async () => { throw new Error("upstream unavailable"); }));
  assert.equal(await cached("retry", 10000, async () => "recovered"), "recovered");
});

test("rate limits survive worker restarts and an atomic counter cannot be bypassed with parallel processes", async (t) => {
  const root = temporary(t);
  const isolated = createLoader({}, { ...process, cwd: () => root, env: {} });
  const rate = isolated("src/lib/rate-limit.ts"), { db } = isolated("src/lib/db.ts");
  assert.equal(rate.checkRateLimit("restart", 1).allowed, true);
  db.close();
  const code = `const {createLoader}=require(${JSON.stringify(path.resolve("scripts/test-helpers.cjs"))});
    const load=createLoader({}, {...process,cwd:()=>${JSON.stringify(root)},env:{}});
    const rate=load(${JSON.stringify(path.resolve("src/lib/rate-limit.ts"))});
    if(rate.checkRateLimit('restart',1).allowed) throw new Error('Counter reset after restart');
    let allowed=0; for(let i=0;i<10;i++) if(rate.checkRateLimit('parallel',12).allowed) allowed++;
    process.stdout.write(String(allowed)); load(${JSON.stringify(path.resolve("src/lib/db.ts"))}).db.close();`;
  const counts = await Promise.all(Array.from({ length: 6 }, () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", code], { windowsHide: true });
    let output = "", errors = "";
    child.stdout.on("data", (data) => { output += data; }); child.stderr.on("data", (data) => { errors += data; });
    child.on("error", reject); child.on("exit", (status) => status === 0 ? resolve(Number(output)) : reject(new Error(errors)));
  })));
  assert.equal(counts.reduce((a, b) => a + b, 0), 12);
});

test("trip API validates input, binds ownership, prevents metadata overrides and protects mutations from other origins", async (t) => {
  const root = temporary(t); let user = { id: "A" };
  const isolated = createLoader({ "@/lib/auth": { getCurrentUser: async () => user } }, { ...process, cwd: () => root, env: {} });
  const { db } = isolated("src/lib/db.ts"), route = isolated("src/app/api/trips/route.ts");
  try {
    for (const id of ["A", "B"]) db.prepare("INSERT INTO users(id,name,email) VALUES(?,?,?)").run(id, id, id + "@example.invalid");
    const body = { id: "trip-A", cityId: "roma", cityName: "forged name", startDate: "2026-11-21", endDate: "2026-11-24", totalCostTry: 1234.56, travelers: 2, budgetTry: 50000 };
    assert.equal((await route.POST(req("/api/trips", "POST", body))).status, 200);
    assert.equal((await route.POST(req("/api/trips", "POST", { ...body, totalCostTry: 4321 }))).status, 200);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM saved_trips").get().n, 1);
    const original = db.prepare("SELECT * FROM saved_trips WHERE id = 'trip-A'").get();
    assert.equal(original.city_name, "Roma");
    db.prepare("UPDATE saved_trips SET data_json = ? WHERE id = 'trip-A'").run(JSON.stringify({ id: "forged", cityName: "forged", userId: "B", budgetTry: 50000 }));
    const response = await route.GET(), listed = (await response.json()).trips;
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal(listed[0].id, "trip-A"); assert.equal(listed[0].cityName, "Roma"); assert.equal(listed[0].userId, undefined);
    user = { id: "B" };
    assert.deepEqual((await (await route.GET()).json()).trips, []);
    assert.equal((await route.POST(req("/api/trips", "POST", body))).status, 404);
    assert.equal((await route.DELETE(req("/api/trips?id=trip-A", "DELETE"))).status, 404);
    user = { id: "A" };
    assert.equal((await route.POST(req("/api/trips", "POST", body, { Origin: "https://attacker.invalid" }))).status, 403);
    assert.equal((await route.DELETE(req("/api/trips?id=trip-A", "DELETE", {}, { Origin: "https://attacker.invalid" }))).status, 403);
    for (const changes of [{ cityId: "unknown" }, { travelers: 1.5 }, { totalCostTry: -1 }, { endDate: "2026-11-20" }, { snapshot: {} }]) {
      assert.equal((await route.POST(req("/api/trips", "POST", { ...body, ...changes }))).status, 400);
    }
    assert.equal((await route.POST(req("/api/trips", "POST", { ...body, padding: "x".repeat(513 * 1024) }))).status, 413);
    user = null;
    assert.equal((await route.GET()).status, 401);
    assert.equal((await route.POST(req("/api/trips", "POST", body))).status, 401);
  } finally { db.close(); }
});

test("search limits run before paid providers and rejected searches include retry timing", async () => {
  let calls = 0;
  const isolated = createLoader({
    "@/lib/planner": { buildPlan: async () => { calls++; } },
    "@/lib/search-security": { limitSearchRequest: () => Response.json({ error: "limited" }, { status: 429, headers: { "Retry-After": "60" } }) },
  });
  const route = isolated("src/app/api/plan/route.ts");
  const response = await route.GET(req("/api/plan?dest=roma", "GET"));
  assert.equal(response.status, 429); assert.equal(response.headers.get("retry-after"), "60"); assert.equal(calls, 0);
  assert.equal((await route.GET(req("/api/plan?dest=not-a-city", "GET"))).status, 404);
});
