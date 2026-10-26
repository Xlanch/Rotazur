const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { NextRequest } = require("next/server");
const { createLoader } = require("./test-helpers.cjs");
const { spawn } = require("node:child_process");
const request = (url, method = "POST", body = {}, headers = {}) => new NextRequest(`http://localhost:3000${url}`, {
  method, headers: { "Content-Type": "application/json", ...headers }, ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
});
function temporary(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rotazur-security-test-"));
  t.after(() => {
    const relative = path.relative(os.tmpdir(), root);
    assert.ok(relative.startsWith("rotazur-security-test-") && !relative.includes(path.sep));
    fs.rmSync(root, { recursive: true, force: true });
  });
  return root;
}

test("unverified Google identity and direct registration never issue sessions", async () => {
  const load = createLoader();
  for (const [file, status] of [["google", 503], ["register", 403]]) {
    const route = load(`src/app/api/auth/${file}/route.ts`);
    const response = await route.POST(request(`/api/auth/${file}`, "POST", { email: "victim@example.invalid", name: "Attacker" }));
    assert.equal(response.status, status);
    assert.equal(response.headers.has("set-cookie"), false);
  }
});

test("session migration rejects legacy and expired sessions, accepts newly authenticated sessions", async (t) => {
  const root = temporary(t);
  fs.mkdirSync(path.join(root, "data"));
  const old = new DatabaseSync(path.join(root, "data", "rota.db"));
  old.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, email TEXT, password_hash TEXT, password_salt TEXT, avatar_url TEXT, provider TEXT, created_at TEXT);
    CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT, expires_at TEXT, created_at TEXT);
    INSERT INTO users VALUES ('test', 'Test', 'test@example.invalid', NULL, NULL, NULL, 'credentials', '2026-01-01');
    INSERT INTO sessions VALUES ('legacy', 'test', '2999-01-01T00:00:00.000Z', '2026-01-01');`);
  old.close();
  const load = createLoader({ "next/headers": { cookies: async () => ({ get: () => undefined }) } }, { ...process, cwd: () => root, env: { NODE_ENV: "production" } });
  const { db } = load("src/lib/db.ts");
  // Close the connection before the temporary directory cleanup registered above.
  const auth = load("src/lib/auth.ts");
  try {
    assert.equal(auth.getSessionUser("legacy"), null);
    const session = auth.createSession("test");
    assert.equal(auth.getSessionUser(session.token).id, "test");
    db.prepare("UPDATE sessions SET expires_at = ? WHERE user_id = ?").run(new Date(Date.now() - 60000).toISOString(), "test");
    assert.equal(auth.getSessionUser(session.token), null);
  } finally { db.close(); }
});

test("alarms: anonymous access denied, user A cannot list or delete user B's records", async (t) => {
  const root = temporary(t);
  fs.mkdirSync(path.join(root, "data"));
  const file = path.join(root, "data", "price_alerts.json");
  fs.writeFileSync(file, JSON.stringify([
    { id: "owned-A", userId: "A", cityId: "roma", origin: "IST", email: "a@example.invalid" },
    { id: "owned-B", userId: "B", cityId: "roma", origin: "IST", email: "b@example.invalid" },
    { id: "legacy", cityId: "roma", email: "a@example.invalid" },
  ]));
  let user = null;
  const store = require("../src/lib/alert-store.cjs").getAlertStore(root);
  try {
  const load = createLoader({ "@/lib/auth": { getCurrentUser: async () => user }, "@/lib/rate-limit": { checkRateLimit: () => ({ allowed: true }) } }, { ...process, cwd: () => root });
  const route = load("src/app/api/price-alerts/route.ts");
  assert.equal((await route.GET()).status, 401);
  assert.equal((await route.POST(request("/api/price-alerts"))).status, 401);
  assert.equal((await route.DELETE(request("/api/price-alerts?id=owned-B", "DELETE"))).status, 401);
  user = { id: "A", email: "a@example.invalid" };
  const listed = await (await route.GET()).json();
  assert.deepEqual(listed.alerts.map((alert) => alert.id), ["owned-A"]);
  assert.equal((await route.DELETE(request("/api/price-alerts?id=owned-B", "DELETE"))).status, 404);
  assert.equal(JSON.parse(fs.readFileSync(file)).length, 3);
  const created = await route.POST(request("/api/price-alerts", "POST", { cityId: "belgrad", origin: "SAW", targetPriceTry: 1000, currentPriceTry: 2000, email: "victim@example.invalid" }));
  assert.equal(created.status, 200);
  const alert = (await created.json()).alert;
  assert.equal(alert.userId, "A"); assert.equal(alert.email, user.email); assert.equal(alert.origin, "SAW");
  assert.equal((await route.POST(request("/api/price-alerts", "POST", { cityId: "roma", targetPriceTry: -1, currentPriceTry: 10 }))).status, 400);
  assert.equal((await route.POST(request("/api/price-alerts", "POST", {}, { Origin: "https://attacker.invalid" }))).status, 403);
  assert.equal((await route.DELETE(request("/api/price-alerts?id=owned-A", "DELETE"))).status, 200);
  assert.equal(store.list("A").some((item) => item.id === "owned-A"), false);
  assert.equal(store.list("B").some((item) => item.id === "owned-B"), true);
  assert.equal(JSON.parse(fs.readFileSync(file)).length, 3); // Legacy source retained, never re-imported after deletion.
  } finally { store.close(); }
});

test("database initialization is safe across simultaneous production workers", async (t) => {
  const root = temporary(t);
  const code = `const {createLoader}=require(${JSON.stringify(path.resolve("scripts/test-helpers.cjs"))});
    const load=createLoader({}, {...process,cwd:()=>${JSON.stringify(root)},env:{NODE_ENV:'production'}});
    const {db}=load(${JSON.stringify(path.resolve("src/lib/db.ts"))});
    if(!db.prepare('PRAGMA table_info(sessions)').all().some(c=>c.name==='auth_version')) process.exitCode=1;
    db.close();`;
  await Promise.all(Array.from({ length: 6 }, () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", code], { windowsHide: true });
    let error = "";
    child.stderr.on("data", (chunk) => { error += chunk; });
    child.on("error", reject);
    child.on("exit", (status) => status === 0 ? resolve() : reject(new Error(error)));
  })));
});

test("forced global sync requires the server bearer secret, independent of signed-in users", async () => {
  const syncState = { getLatestSyncedPrices: () => ({ lastSync: "test", totalRoutes: 0 }), isSyncStale: () => false,
    getLatestSyncedWeather: () => ({ lastSync: "test", totalCities: 0 }), isWeatherSyncStale: () => false, getNext0400AmIso: () => "test" };
  let calls = 0;
  const sync = async () => { calls++; return { lastSync: "test", totalRoutes: 0, totalCities: 0 }; };
  const secret = "test-only-secret-with-more-than-32-characters";
  const load = createLoader({
    "@/lib/automation/sync-engine": { ...syncState, syncAllDailyPrices: sync },
    "@/lib/automation/weather-sync-engine": { ...syncState, syncAllDailyWeather: sync },
  }, { ...process, env: { SYNC_SECRET: secret } });
  for (const kind of ["prices", "weather"]) {
    const route = load(`src/app/api/sync-${kind}/route.ts`);
    assert.equal((await route.POST(request(`/api/sync-${kind}`))).status, 401);
    assert.equal((await route.GET(request(`/api/sync-${kind}?force=true`, "GET"))).status, 401);
    assert.equal((await route.POST(request(`/api/sync-${kind}`, "POST", {}, { Authorization: `Bearer ${secret}` }))).status, 200);
  }
  assert.equal(calls, 2);
});

test("email rendering escapes injected HTML and executable/external plan URLs", () => {
  const load = createLoader();
  const { renderItineraryHtml } = load("src/lib/email.ts");
  const html = renderItineraryHtml({ cityName: '<img src=x onerror="alert(1)">', budgetTier: "<script>evil</script>",
    restaurantsSummary: ["<iframe>"], daysSummary: [{ dayTitle: "<script>evil</script>", items: ["<img>"] }], planUrl: "javascript:alert(1)" });
  assert.ok(!html.includes("<script>") && !html.includes("<iframe>") && !html.includes("javascript:"));
  assert.ok(html.includes("&lt;img"));
});

test("anonymous itinerary email requests cannot reach SMTP", async () => {
  let sends = 0;
  const load = createLoader({ "@/lib/auth": { getCurrentUser: async () => null }, "@/lib/email": { sendItineraryEmail: async () => { sends++; } }, "@/lib/rate-limit": { checkRateLimit: () => ({ allowed: true }) } });
  const route = load("src/app/api/plan/send-email/route.ts");
  assert.equal((await route.POST(request("/api/plan/send-email", "POST", { toEmail: "victim@example.invalid" }))).status, 401);
  assert.equal(sends, 0);
});
