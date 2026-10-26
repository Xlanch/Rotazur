const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");
const { createLoader } = require("./test-helpers.cjs");
const { createAlertStore } = require("../src/lib/alert-store.cjs");

function temporary(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rotazur-deep-"));
  t.after(() => { assert.equal(path.dirname(root), os.tmpdir()); fs.rmSync(root, { recursive: true, force: true }); });
  return root;
}
function accountTest(t) {
  const root = temporary(t);
  const load = createLoader({ "next/headers": { cookies: async () => ({ get: () => undefined }) } }, { ...process, cwd: () => root, env: { NODE_ENV: "production" } });
  const { db } = load("src/lib/db.ts");
  const auth = load("src/lib/auth.ts");
  const password = auth.hashPassword("old-test-password");
  const expires = new Date(Date.now() + 600000).toISOString();
  function seed(kind, email = "test@example.invalid", expiry = expires) {
    if (kind === "register") db.prepare("INSERT INTO verification_codes (id,email,code,name,password_hash,password_salt,expires_at) VALUES (?,?,?,?,?,?,?)").run(email, email, "123456", "Test", password.hash, password.salt, expiry);
    else db.prepare("INSERT INTO password_reset_codes (id,email,code,expires_at) VALUES (?,?,?,?)").run(email, email, "123456", expiry);
  }
  const user = (email = "test@example.invalid") => db.prepare("INSERT INTO users (id,name,email,password_hash,password_salt,provider) VALUES (?,?,?,?,?,'credentials')").run(email, "Test", email, password.hash, password.salt);
  return { root, load, db, auth, password, seed, user };
}
const req = (body, headers = {}) => new Request("http://localhost:3000/api/auth/test", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
function child(code) {
  return new Promise((resolve, reject) => {
    const process = spawn(global.process.execPath, ["-e", code], { windowsHide: true });
    let output = "", errors = "";
    process.stdout.on("data", (part) => { output += part; });
    process.stderr.on("data", (part) => { errors += part; });
    process.on("error", reject);
    process.on("exit", (status) => status === 0 ? resolve(output.trim()) : reject(new Error(errors)));
  });
}
function challengeChild(root, endpoint, password) {
  return `const {createLoader}=require(${JSON.stringify(path.resolve("scripts/test-helpers.cjs"))});
    const load=createLoader({'next/headers':{cookies:async()=>({get:()=>undefined})}}, {...process,cwd:()=>${JSON.stringify(root)},env:{NODE_ENV:'production'}});
    const {db}=load(${JSON.stringify(path.resolve("src/lib/db.ts"))});
    const route=load(${JSON.stringify(path.resolve("src/app/api/auth", endpoint, "route.ts"))});
    route.POST(new Request('http://localhost:3000/api/auth/test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'test@example.invalid',code:'123456',newPassword:${JSON.stringify(password)}})}))
      .then(r=>console.log(r.status)).finally(()=>db.close());`;
}

test("one registration code issues exactly one session across concurrent workers", async (t) => {
  const a = accountTest(t);
  try {
    a.seed("register");
    const statuses = await Promise.all(Array.from({ length: 6 }, () => child(challengeChild(a.root, "verify-code", "unused"))));
    assert.equal(statuses.filter((s) => s === "200").length, 1);
    assert.equal(a.db.prepare("SELECT count(*) AS n FROM users").get().n, 1);
    assert.equal(a.db.prepare("SELECT count(*) AS n FROM sessions").get().n, 1);
    assert.equal(a.db.prepare("SELECT count(*) AS n FROM verification_codes").get().n, 0);
  } finally { a.db.close(); }
});

test("concurrent password resets consume a code once and invalidate all previous sessions", async (t) => {
  const a = accountTest(t);
  try {
    a.user(); a.seed("reset"); a.auth.createSession("test@example.invalid");
    const statuses = await Promise.all(Array.from({ length: 4 }, (_, i) => child(challengeChild(a.root, "reset-password", "new-test-password-" + i))));
    assert.equal(statuses.filter((s) => s === "200").length, 1);
    const winner = statuses.indexOf("200");
    const row = a.db.prepare("SELECT password_hash,password_salt FROM users").get();
    assert.equal(a.auth.verifyPassword("new-test-password-" + winner, row.password_salt, row.password_hash), true);
    assert.equal(a.db.prepare("SELECT count(*) AS n FROM sessions").get().n, 0);
    assert.equal(a.db.prepare("SELECT count(*) AS n FROM password_reset_codes").get().n, 0);
  } finally { a.db.close(); }
});

test("a failed reset rolls back the password, code consumption and session deletion together", async (t) => {
  const a = accountTest(t);
  try {
    a.user(); a.seed("reset"); a.auth.createSession("test@example.invalid");
    a.db.exec("CREATE TRIGGER fail_session_delete BEFORE DELETE ON sessions BEGIN SELECT RAISE(ABORT, 'test-only failure'); END");
    const route = a.load("src/app/api/auth/reset-password/route.ts");
    const body = { email: "test@example.invalid", code: "123456", newPassword: "new-test-password" };
    assert.equal((await route.POST(req(body))).status, 500);
    assert.equal(a.db.prepare("SELECT password_hash FROM users").get().password_hash, a.password.hash);
    assert.equal(a.db.prepare("SELECT count(*) AS n FROM sessions").get().n, 1);
    assert.equal(a.db.prepare("SELECT count(*) AS n FROM password_reset_codes").get().n, 1);
    a.db.exec("DROP TRIGGER fail_session_delete");
    assert.equal((await route.POST(req(body))).status, 200);
  } finally { a.db.close(); }
});

test("verification cannot turn an existing account's stale registration code into a login", async (t) => {
  const a = accountTest(t);
  try {
    a.user(); a.seed("register");
    const response = await a.load("src/app/api/auth/verify-code/route.ts").POST(req({ email: "test@example.invalid", code: "123456" }));
    assert.equal(response.status, 400);
    assert.equal(response.headers.has("set-cookie"), false);
    assert.equal(a.db.prepare("SELECT count(*) AS n FROM sessions").get().n, 0);
  } finally { a.db.close(); }
});

test("challenge endpoints enforce attempt limits, reject bad expiry, cross-origin and oversized bodies", async (t) => {
  const a = accountTest(t);
  try {
    for (const [endpoint, kind] of [["verify-code", "register"], ["reset-password", "reset"]]) {
      const route = a.load("src/app/api/auth/" + endpoint + "/route.ts");
      const email = kind + "@example.invalid";
      a.seed(kind, email);
      const body = { email, code: "000000", newPassword: "valid-test-password" };
      for (let i = 0; i < 5; i++) assert.equal((await route.POST(req(body))).status, 400);
      assert.equal((await route.POST(req({ ...body, code: "123456" }))).status, 429);
      assert.equal((await route.POST(req({}, { origin: "https://attacker.invalid" }))).status, 403);
      assert.equal((await route.POST(req({ huge: "x".repeat(20000) }))).status, 413);
      const brokenEmail = "broken-" + email;
      a.seed(kind, brokenEmail, "not-a-date");
      assert.equal((await route.POST(req({ ...body, email: brokenEmail, code: "123456" }))).status, 400);
    }
  } finally { a.db.close(); }
});

test("alert migration preserves the source, enforces ownership and does not resurrect deleted records", (t) => {
  const root = temporary(t), filename = path.join(root, "alerts.sqlite"), legacyFile = path.join(root, "old.json");
  const legacy = [{ id: "A", userId: "owner-A", cityId: "roma", origin: "IST" }, { id: "orphan", cityId: "roma", email: "a@example.invalid" }];
  const source = JSON.stringify(legacy); fs.writeFileSync(legacyFile, source);
  let store = createAlertStore({ filename, legacyFile });
  try {
    assert.equal(store.list("owner-A").length, 1);
    assert.equal(store.remove("owner-B", "A"), false);
    assert.equal(store.remove("owner-A", "A"), true);
    assert.equal(store.triggerPrices({ "IST-roma": { priceRoundTripTry: 1 } }).length, 0);
    store.close(); store = createAlertStore({ filename, legacyFile });
    assert.equal(store.list("owner-A").length, 0);
    assert.equal(fs.readFileSync(legacyFile, "utf8"), source);
  } finally { store.close(); }
});

test("parallel alert writers retain every user's records and atomic replacements retain one active route", async (t) => {
  const root = temporary(t), filename = path.join(root, "alerts.sqlite"), legacyFile = path.join(root, "old.json");
  const modulePath = path.resolve("src/lib/alert-store.cjs");
  await Promise.all(Array.from({ length: 6 }, (_, worker) => child(`const {createAlertStore}=require(${JSON.stringify(modulePath)});
    const store=createAlertStore({filename:${JSON.stringify(filename)},legacyFile:${JSON.stringify(legacyFile)}});
    try {for(let i=0;i<20;i++)store.save({id:'worker-${worker}-'+i,userId:'owner-${worker}',cityId:'city-'+i,origin:'IST',targetPriceTry:100,currentPriceTry:200,createdAt:new Date().toISOString()});
      store.save({id:'replacement-${worker}',userId:'shared-owner',cityId:'roma',origin:'IST',targetPriceTry:100,currentPriceTry:200,createdAt:new Date().toISOString()});}
    finally{store.close();}`)));
  const store = createAlertStore({ filename, legacyFile });
  try {
    for (let i = 0; i < 6; i++) assert.equal(store.list("owner-" + i).length, 20);
    assert.equal(store.list("shared-owner").length, 1);
    assert.equal(store.triggerPrices({ "IST-roma": { priceRoundTripTry: 50 } }).length, 1);
    assert.equal(store.triggerPrices({ "IST-roma": { priceRoundTripTry: 50 } }).length, 0);
  } finally { store.close(); }
});

test("a failed legacy alert migration leaves the source intact and can be retried after repair", (t) => {
  const root = temporary(t), filename = path.join(root, "alerts.sqlite"), legacyFile = path.join(root, "old.json");
  fs.writeFileSync(legacyFile, "{broken");
  assert.throws(() => createAlertStore({ filename, legacyFile }));
  assert.equal(fs.readFileSync(legacyFile, "utf8"), "{broken");
  fs.writeFileSync(legacyFile, JSON.stringify([{ id: "A", userId: "owner", cityId: "roma" }]));
  const store = createAlertStore({ filename, legacyFile });
  try { assert.equal(store.list("owner").length, 1); } finally { store.close(); }
});

test("visited activity marks survive sorting and time changes; optimized custom stops stay separate", () => {
  const load = createLoader();
  const { restoreActivityState, activityCheckKey, partitionOptimizedActivities, identifyDays } = load("src/lib/activity-state.ts");
  const base = (title, time) => ({ title, time, description: "Test", kind: "gezi", costTry: 10 });
  const days = [{ day: 1, date: "2026-11-01", title: "Test", activities: [base("Museum", "10:00"), base("Park", "12:00")] }];
  const custom = { 1: [{ ...base("Custom", "11:00"), id: "custom-test" }, { ...base("Hidden meal", "13:00"), id: "hidden-test" }] };
  const state = restoreActivityState(days, custom, { "1-2-Park": true });
  const park = state.days[0].activities[1];
  const key = activityCheckKey(1, park);
  assert.equal(state.checked[key], true);
  const reordered = [{ ...park, time: "09:30" }, { ...state.custom[1][0], time: "10:00" }, state.days[0].activities[0]];
  assert.equal(activityCheckKey(1, reordered[0]), key);
  const partition = partitionOptimizedActivities(reordered, state.custom[1]);
  assert.equal(partition.base.length, 2);
  assert.equal(partition.custom.length, 2); // hidden additions also retained
  assert.equal(partition.custom[0].time, "10:00");
  assert.equal(identifyDays(days)[0].activities[1].id, park.id);
  assert.equal(Object.hasOwn(days[0].activities[1], "id"), false);
});

test("departure fee is sourced for 2026 and never projected into an unverified year", () => {
  const load = createLoader();
  const { departureFeeLabel, DEPARTURE_FEE_SOURCE } = load("src/lib/departure-fee.ts");
  assert.match(departureFeeLabel("2026-11-01"), /1\.250/);
  assert.doesNotMatch(departureFeeLabel("2027-01-01"), /1\.250/);
  assert.match(DEPARTURE_FEE_SOURCE, /^https:\/\/cdn\.gib\.gov\.tr\//);
  for (const file of ["src/components/VisaRequirementsCard.tsx", "src/lib/providers/visa-assistant.ts"]) assert.doesNotMatch(fs.readFileSync(file, "utf8"), /500 ₺/);
});

test("code delivery and guide preview reject unsafe input before expensive work or any delivery", async (t) => {
  const root = temporary(t);
  const forbidden = () => { throw new Error("An unsafe request reached a protected boundary"); };
  const load = createLoader({
    "@/lib/email": { generateOtpCode: forbidden, sendVerificationEmail: forbidden, sendPasswordResetEmail: forbidden, renderItineraryHtml: forbidden },
    "@/lib/auth": { hashPassword: forbidden },
  }, { ...process, cwd: () => root, env: { NODE_ENV: "production" } });
  const { db } = load("src/lib/db.ts");
  try {
    for (const endpoint of ["auth/send-code", "auth/forgot-password", "plan/preview-email"]) {
      const route = load("src/app/api/" + endpoint + "/route.ts");
      assert.equal((await route.POST(req({}, { origin: "https://untrusted.invalid" }))).status, 403);
      assert.equal((await route.POST(req("x".repeat(70 * 1024)))).status, 413);
      assert.equal((await route.POST(req("{"))).status, 400);
      assert.equal((await route.POST(req({ email: "a".repeat(255) + "@example.invalid" })) ).status, 400);
    }
    assert.equal(db.prepare("SELECT count(*) AS n FROM verification_codes").get().n, 0);
    assert.equal(db.prepare("SELECT count(*) AS n FROM password_reset_codes").get().n, 0);
  } finally { db.close(); }
});

test("a late session refresh cannot undo login, and rejected logout retains the account", async () => {
  const originalFetch = global.fetch, originalWindow = global.window;
  const slots = []; let index = 0, warning = "";
  const hooks = {
    createContext: () => ({ Provider: "provider" }), useEffect: () => {}, useContext: () => {},
    useState: (initial) => { const position = index++; if (!(position in slots)) slots[position] = initial; return [slots[position], (value) => { slots[position] = typeof value === "function" ? value(slots[position]) : value; }]; },
    useRef: (initial) => { const position = index++; if (!(position in slots)) slots[position] = { current: initial }; return slots[position]; },
  };
  const load = createLoader({ react: hooks, "react/jsx-runtime": { jsx: (_type, props) => props.value } });
  const { AuthProvider } = load("src/components/AuthContext.tsx");
  const render = () => { index = 0; return AuthProvider({ children: null }); };
  const account = { id: "test-user", name: "Test", email: "test@example.invalid" };
  let resolveRefresh;
  global.window = { alert: (message) => { warning = message; } };
  global.fetch = (url) => url === "/api/auth/me" ? new Promise((resolve) => { resolveRefresh = resolve; }) : Promise.resolve(Response.json({ user: account }));
  try {
    const context = render();
    const pendingRefresh = context.refreshUser();
    assert.equal((await context.login(account.email, "test-password")).success, true);
    resolveRefresh(Response.json({ user: null }));
    await pendingRefresh;
    assert.equal(render().user.id, account.id);
    global.fetch = async () => Response.json({ error: "failure" }, { status: 500 });
    await render().logout();
    assert.equal(render().user.id, account.id);
    assert.match(warning, /Çıkış yapılamadı/);
    global.fetch = async () => Response.json({ success: true });
    await render().logout();
    assert.equal(render().user, null);
  } finally { global.fetch = originalFetch; global.window = originalWindow; }
});
