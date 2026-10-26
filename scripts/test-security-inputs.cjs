const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), crypto = require("node:crypto");
const { createLoader } = require("./test-helpers.cjs");
const next = require("next/server");
const req = (body, extra = {}) => new Request("https://example.invalid/api/test", { method: "POST", headers: { "content-type": "application/json", ...extra }, body: JSON.stringify(body) });
const credential = (password, salt = "a".repeat(32)) => ({ salt, hash: crypto.scryptSync(password, salt, 64).toString("hex") });
function sandbox(t, extra = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rotazur-inputs-"));
  const jobs = [], deliveries = [];
  const load = createLoader({
    "next/server": { ...next, after: (job) => jobs.push(job) },
    "next/headers": { cookies: async () => ({ get: () => undefined }) },
    "@/lib/email": {
      generateOtpCode: () => "123456",
      sendVerificationEmail: async (...args) => { deliveries.push(["register", ...args]); return { success: true, realEmailSent: true, devCode: "must-not-leak" }; },
      sendPasswordResetEmail: async (...args) => { deliveries.push(["reset", ...args]); return { success: true, realEmailSent: true, devCode: "must-not-leak" }; },
    }, ...extra,
  }, { ...process, cwd: () => root, env: { NODE_ENV: "production" } });
  const { db } = load("src/lib/db.ts");
  t.after(() => { db.close(); assert.equal(path.dirname(root), os.tmpdir()); fs.rmSync(root, { recursive: true, force: true }); });
  const seedUser = (email, password = "Mor!Ada42?", provider = "credentials") => {
    const old = credential(password);
    db.prepare("INSERT INTO users(id,name,email,provider,password_hash,password_salt) VALUES (?,?,?,?,?,?)").run(email, "Fixture", email, provider, old.hash, old.salt);
    return old;
  };
  const seedCode = (email, id = "code-" + email, expiry = new Date(Date.now() + 600000).toISOString()) => db.prepare("INSERT INTO password_reset_codes(id,email,code,expires_at) VALUES (?,?,'123456',?)").run(id, email, expiry);
  return { load, db, jobs, deliveries, seedUser, seedCode };
}

test("the user-selected 10-character policy counts Unicode characters and blocks common passwords locally", () => {
  const { passwordPolicyError: error, MIN_PASSWORD_LENGTH } = createLoader()("src/lib/password-policy.ts");
  assert.equal(MIN_PASSWORD_LENGTH, 10);
  for (const value of ["kisa123", "Mor!Ada42", "password123", "PASSWORD-123", "1234567890", "aaaaaaaaaa", "rotazur2026", " ".repeat(10), "😀".repeat(5)]) assert.ok(error(value), value);
  for (const value of ["Mor!Ada42?", "Kış günü mor bir uçurtma!", "🌲🌸🌊🦋🌞🐢🎈🍀🪁🌙"]) assert.equal(error(value), null);
  assert.ok(error("x".repeat(1025)));
});

test("legacy, modern and missing-account logins perform the same crypto work", async () => {
  const profiles = [];
  const p = createLoader({ "node:crypto": { ...crypto, scrypt: (password, salt, length, options, callback) => {
    profiles.push(options.p || 1); return crypto.scrypt(password, salt, length, options, callback);
  } } })("src/lib/passwords.ts");
  const old = credential("old-password"), modern = await p.hashPasswordAsync("new-password");
  profiles.length = 0;
  assert.equal(await p.verifyLoginPasswordAsync("old-password", old.salt, old.hash), true);
  const legacyWork = profiles.splice(0);
  assert.equal(await p.verifyLoginPasswordAsync("new-password", modern.salt, modern.hash), true);
  const modernWork = profiles.splice(0);
  assert.equal(await p.checkUnknownPassword("wrong-password"), false);
  assert.deepEqual(profiles, legacyWork); assert.deepEqual(modernWork, legacyWork);
  assert.deepEqual(legacyWork, [5, 1]);
});

test("production registration/recovery responses never reveal account state or delivery result", async (t) => {
  const a = sandbox(t);
  a.seedUser("known@example.invalid"); a.seedUser("google@example.invalid", "Mor!Ada42?", "google");
  for (const endpoint of ["send-code", "forgot-password"]) {
    let expected;
    const route = a.load(`src/app/api/auth/${endpoint}/route.ts`);
    for (const email of ["known@example.invalid", "google@example.invalid", "new@example.invalid"]) {
      const response = await route.POST(req({ email, name: "Fixture", password: "Yeni!Rota42?" }));
      assert.equal(response.status, 200);
      assert.match(response.headers.get("cache-control"), /no-store/);
      assert.equal(response.headers.has("set-cookie"), false);
      const body = await response.json();
      assert.deepEqual(Object.keys(body).sort(), ["message", "success"]);
      if (expected) assert.deepEqual(body, expected);
      expected = body;
    }
  }
  assert.equal(a.deliveries.length, 0);
  assert.equal(a.db.prepare("SELECT count(*) AS n FROM verification_codes").get().n, 0);
  assert.equal(a.jobs.length, 6);
  for (const job of a.jobs) await job();
  assert.deepEqual(a.deliveries.map(d => [d[0], d[1]]), [["register", "new@example.invalid"], ["reset", "known@example.invalid"]]);
  assert.equal(a.db.prepare("SELECT count(*) AS n FROM password_reset_codes").get().n, 1);
  assert.equal(a.db.prepare("SELECT count(*) AS n FROM sessions").get().n, 0);
  // The generic response did not create login access: only a valid saved OTP can.
  const deliveredCode = a.deliveries.find(d => d[0] === "register")[2];
  const response = await a.load("src/app/api/auth/verify-code/route.ts").POST(req({ email: "new@example.invalid", code: deliveredCode }));
  assert.equal(response.status, 200);
  assert.equal(a.db.prepare("SELECT count(*) AS n FROM sessions").get().n, 1);
});

test("invalid registration passwords never queue work or write verification records", async (t) => {
  const a = sandbox(t);
  const route = a.load("src/app/api/auth/send-code/route.ts");
  for (const password of ["short123", "password123", "rotazur2026"]) {
    assert.equal((await route.POST(req({ name: "Fixture", email: "new@example.invalid", password }))).status, 400);
  }
  assert.equal(a.jobs.length, 0); assert.equal(a.deliveries.length, 0);
  assert.equal(a.db.prepare("SELECT count(*) AS n FROM verification_codes").get().n, 0);
});

test("wrong, missing and expired OTPs have the same response without exposing account type", async (t) => {
  const a = sandbox(t);
  a.seedUser("known@example.invalid"); a.seedUser("google@example.invalid", "Mor!Ada42?", "google");
  a.seedCode("known@example.invalid"); a.seedCode("expired@example.invalid", "expired", "2000-01-01T00:00:00Z");
  const reset = a.load("src/app/api/auth/reset-password/route.ts");
  let expected;
  for (const email of ["known@example.invalid", "missing@example.invalid", "google@example.invalid", "expired@example.invalid"]) {
    const response = await reset.POST(req({ email, code: "999999", newPassword: "Yeni!Rota42?" }));
    assert.equal(response.status, 400);
    const body = await response.json(); if (expected) assert.deepEqual(body, expected); expected = body;
  }
  const verify = a.load("src/app/api/auth/verify-code/route.ts");
  const old = credential("Mor!Ada42?");
  a.db.prepare("INSERT INTO verification_codes(id,email,code,name,password_hash,password_salt,expires_at) VALUES ('pending','pending@example.invalid','123456','Fixture',?,?,'2999-01-01')").run(old.hash, old.salt);
  for (const email of ["known@example.invalid", "missing@example.invalid", "pending@example.invalid"]) {
    const response = await verify.POST(req({ email, code: "999999" })); assert.equal(response.status, 400); assert.deepEqual(await response.json(), expected);
  }
});

test("reset rejects weak/current/previous passwords and preserves the code until a valid replacement commits", async (t) => {
  const a = sandbox(t), email = "test@example.invalid";
  const current = a.seedUser(email); a.seedCode(email);
  const previous = credential("Kum!Gol57?", "b".repeat(32));
  a.db.prepare("INSERT INTO password_history(id,user_id,password_hash,password_salt) VALUES ('previous',?,?,?)").run(email, previous.hash, previous.salt);
  a.load("src/lib/auth.ts").createSession(email);
  const route = a.load("src/app/api/auth/reset-password/route.ts");
  for (const password of ["short123", "password123", "Mor!Ada42?", "Kum!Gol57?"]) {
    const response = await route.POST(req({ email, code: "123456", newPassword: password })); assert.equal(response.status, 400);
    assert.equal(a.db.prepare("SELECT password_hash FROM users WHERE id = ?").get(email).password_hash, current.hash);
    assert.equal(a.db.prepare("SELECT count(*) AS n FROM password_reset_codes").get().n, 1);
    assert.equal(a.db.prepare("SELECT count(*) AS n FROM sessions").get().n, 1);
  }
  assert.equal((await route.POST(req({ email, code: "123456", newPassword: "Dag!Kus86?" }))).status, 200);
  assert.equal(a.db.prepare("SELECT count(*) AS n FROM password_reset_codes").get().n, 0);
  assert.equal(a.db.prepare("SELECT count(*) AS n FROM sessions").get().n, 0);
  const history = a.db.prepare("SELECT password_hash,password_salt FROM password_history WHERE user_id = ?").all(email);
  assert.equal(history.length, 2); assert.ok(history.some(h => h.password_hash === current.hash));
  const fresh = a.db.prepare("SELECT password_hash,password_salt FROM users WHERE id = ?").get(email);
  assert.equal(await a.load("src/lib/passwords.ts").verifyPasswordAsync("Dag!Kus86?", fresh.password_salt, fresh.password_hash), true);
});

test("history retention keeps only five previous hashes and rolls back with a failed reset", async (t) => {
  const a = sandbox(t), email = "test@example.invalid";
  const current = a.seedUser(email); a.seedCode(email);
  for (let i = 0; i < 7; i++) {
    const old = credential("Old-unique-" + i);
    a.db.prepare("INSERT INTO password_history(id,user_id,password_hash,password_salt) VALUES (?,?,?,?)").run("old-" + i, email, old.hash, old.salt);
  }
  a.load("src/lib/auth.ts").createSession(email);
  a.db.exec("CREATE TRIGGER fail_session_delete BEFORE DELETE ON sessions BEGIN SELECT RAISE(ABORT,'test-only'); END");
  const route = a.load("src/app/api/auth/reset-password/route.ts");
  const body = { email, code: "123456", newPassword: "Dag!Kus86?" };
  assert.equal((await route.POST(req(body))).status, 500);
  assert.equal(a.db.prepare("SELECT count(*) AS n FROM password_history").get().n, 7);
  assert.equal(a.db.prepare("SELECT password_hash FROM users").get().password_hash, current.hash);
  a.db.exec("DROP TRIGGER fail_session_delete");
  assert.equal((await route.POST(req(body))).status, 200);
  const rows = a.db.prepare("SELECT id,password_hash FROM password_history").all();
  assert.equal(rows.length, 5); assert.ok(!rows.some(row => ["old-0", "old-1", "old-2"].includes(row.id)));
  assert.ok(rows.some(row => row.password_hash === current.hash));
});

test("a code consumed during asynchronous password work cannot be resurrected", async (t) => {
  let a;
  a = sandbox(t, { "@/lib/passwords": {
    verifyPasswordAsync: async () => { a.db.prepare("DELETE FROM password_reset_codes").run(); return false; },
    hashPasswordAsync: async () => ({ salt: "c".repeat(32), hash: "never-committed" }),
    PasswordBusyError: class extends Error {},
  } });
  const old = a.seedUser("test@example.invalid"); a.seedCode("test@example.invalid");
  const response = await a.load("src/app/api/auth/reset-password/route.ts").POST(req({ email: "test@example.invalid", code: "123456", newPassword: "Dag!Kus86?" }));
  assert.equal(response.status, 400);
  assert.equal(a.db.prepare("SELECT password_hash FROM users").get().password_hash, old.hash);
  assert.equal(a.db.prepare("SELECT count(*) AS n FROM password_history").get().n, 0);
});

test("streamed size limits cancel oversized bodies even with lying headers and never await a stuck cancel", async () => {
  const reader = createLoader()("src/lib/request-security.ts");
  let cancelled = false;
  const body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(1000)); }, cancel() { cancelled = true; return new Promise(() => {}); } });
  const request = new Request("http://localhost", { method: "POST", body, duplex: "half", headers: { "content-length": "1" } });
  await assert.rejects(reader.readJsonObject(request, 100), e => e.status === 413);
  assert.equal(cancelled, true);
});

test("one total body deadline rejects a slow trickle and cancels the stream", async () => {
  const reader = createLoader()("src/lib/request-security.ts");
  let cancelled = false, timer;
  const body = new ReadableStream({ pull(c) { return new Promise(resolve => { timer = setTimeout(() => { c.enqueue(new TextEncoder().encode(" ")); resolve(); }, 80); }); }, cancel() { cancelled = true; clearTimeout(timer); } });
  const request = new Request("http://localhost", { method: "POST", body, duplex: "half" });
  const started = Date.now();
  await assert.rejects(reader.readJsonObject(request, 10000, 300), e => e.status === 408);
  assert.equal(cancelled, true); assert.ok(Date.now() - started < 3000);
});

test("body cancellation and broken/invalid-UTF8 streams return bounded client errors", async () => {
  const reader = createLoader()("src/lib/request-security.ts");
  let cancelled = false;
  const controller = new AbortController();
  const request = new Request("http://localhost", { method: "POST", body: new ReadableStream({ cancel() { cancelled = true; } }), duplex: "half", signal: controller.signal });
  const pending = reader.readJsonObject(request); controller.abort();
  await assert.rejects(pending, e => e.status === 400); assert.equal(cancelled, true);
  const broken = new Request("http://localhost", { method: "POST", duplex: "half", body: new ReadableStream({ start(c) { c.error(new Error("fixture error")); } }) });
  await assert.rejects(reader.readJsonObject(broken), e => e.status === 400);
  const invalid = new Request("http://localhost", { method: "POST", body: new Uint8Array([123,34,120,34,58,34,255,34,125]) });
  await assert.rejects(reader.readJsonObject(invalid), e => e.status === 400);
});

test("itinerary mail rejects oversized, malformed and timed-out bodies before its delivery boundary", async () => {
  let calls = 0, maxBytes;
  const security = createLoader()("src/lib/request-security.ts");
  const load = createLoader({
    "@/lib/auth": { getCurrentUser: async () => ({ id: "fixture" }) },
    "@/lib/rate-limit": { checkRateLimit: () => ({ allowed: true }) },
    "@/lib/email": { sendItineraryEmail: async () => { calls++; return { ok: true }; } },
    "@/lib/request-security": { ...security, readJsonObject: (r, max) => { maxBytes = max; return security.readJsonObject(r, max, 100); } },
  });
  const route = load("src/app/api/plan/send-email/route.ts");
  for (const text of ["{broken", "null", "[]"]) {
    assert.equal((await route.POST(new Request("https://example.invalid/api/test", { method: "POST", body: text }))).status, 400);
  }
  assert.equal((await route.POST(req({ huge: "x".repeat(70 * 1024) }))).status, 413);
  const slow = new Request("https://example.invalid/api/test", { method: "POST", body: new ReadableStream(), duplex: "half" });
  assert.equal((await route.POST(slow)).status, 408);
  assert.equal(maxBytes, 64 * 1024); assert.equal(calls, 0);
  assert.equal((await route.POST(req({ toEmail: "fixture@example.invalid" }))).status, 200);
  assert.equal(calls, 1);
});
