const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { NextRequest } = require("next/server");
const { createLoader } = require("./test-helpers.cjs");

function sandbox(t, overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rotazur-hardening-"));
  const load = createLoader({ "next/headers": { cookies: async () => ({ get: () => undefined }) }, ...overrides }, { ...process, cwd: () => root, env: { NODE_ENV: "production" } });
  const { db } = load("src/lib/db.ts");
  t.after(() => { db.close(); assert.equal(path.dirname(root), os.tmpdir()); fs.rmSync(root, { recursive: true, force: true }); });
  return { root, load, db };
}
const legacy = (password, salt = "a".repeat(32)) => ({ salt, hash: crypto.scryptSync(password, salt, 64).toString("hex") });
const loginRequest = (password) => new Request("http://localhost:3000/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "test@example.invalid", password }) });

test("versioned passwords reject tampering and still verify legacy hashes", async () => {
  const p = createLoader()("src/lib/passwords.ts");
  const old = legacy("eski-şifre-123");
  assert.equal(p.verifyPassword("eski-şifre-123", old.salt, old.hash), true);
  assert.equal(p.passwordNeedsUpgrade(old.hash), true);
  const fresh = await p.hashPasswordAsync("yeni-şifre-456");
  assert.match(fresh.hash, /^scrypt\$v1\$16384\$8\$5\$[a-f0-9]{128}$/);
  assert.equal(p.passwordNeedsUpgrade(fresh.hash), false);
  assert.equal(await p.verifyPasswordAsync("yeni-şifre-456", fresh.salt, fresh.hash), true);
  assert.equal(await p.verifyPasswordAsync("yanlış", fresh.salt, fresh.hash), false);
  assert.equal(p.verifyPassword("yeni-şifre-456", fresh.salt, fresh.hash.replace("16384", "1073741824")), false);
  assert.equal(p.verifyPassword("x", "bad-salt", old.hash), false);
  assert.equal(p.verifyPassword("x", old.salt, "not-a-hash"), false);
});

test("password work yields the event loop and rejects an unbounded concurrent queue", async () => {
  const p = createLoader()("src/lib/passwords.ts");
  let ticked = false;
  const tick = new Promise((resolve) => setImmediate(() => { ticked = true; resolve(); }));
  const pending = Array.from({ length: 4 }, () => p.hashPasswordAsync("test-only-password"));
  await assert.rejects(p.hashPasswordAsync("fifth-password"), p.PasswordBusyError);
  await tick;
  assert.equal(ticked, true);
  await Promise.all(pending);
  assert.ok((await p.hashPasswordAsync("after-draining")).hash);
});

test("successful login upgrades legacy credentials and never stores the browser's session token", async (t) => {
  const a = sandbox(t);
  const old = legacy("test-password");
  a.db.prepare("INSERT INTO users (id,name,email,password_hash,password_salt) VALUES ('u','Test','test@example.invalid',?,?)").run(old.hash, old.salt);
  const route = a.load("src/app/api/auth/login/route.ts");
  assert.equal((await route.POST(loginRequest("wrong-password"))).status, 401);
  assert.equal(a.db.prepare("SELECT password_hash FROM users").get().password_hash, old.hash);
  const response = await route.POST(loginRequest("test-password"));
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie");
  const token = cookie.match(/rota_session=([a-f0-9]{64})/)[1];
  assert.match(cookie, /HttpOnly/i); assert.match(cookie, /Secure/i); assert.match(cookie, /SameSite=lax/i);
  const row = a.db.prepare("SELECT password_hash,password_salt FROM users").get();
  assert.notEqual(row.password_hash, old.hash);
  assert.equal(a.load("src/lib/passwords.ts").verifyPassword("test-password", row.password_salt, row.password_hash), true);
  const stored = a.db.prepare("SELECT id FROM sessions").get().id;
  assert.notEqual(stored, token);
  const auth = a.load("src/lib/auth.ts");
  assert.equal(auth.getSessionUser(token).id, "u");
  assert.equal(auth.getSessionUser(stored), null);
  assert.equal(auth.getSessionUser(stored.slice(7)), null);
  auth.deleteSession(token);
  assert.equal(auth.getSessionUser(token), null);
});

test("a password reset during asynchronous login prevents both rehash and session creation", async (t) => {
  let a;
  a = sandbox(t, { "@/lib/passwords": {
    verifyLoginPasswordAsync: async () => { a.db.prepare("UPDATE users SET password_hash = 'reset-won'").run(); return true; },
    passwordNeedsUpgrade: () => false,
    PasswordBusyError: class extends Error {},
  } });
  const old = legacy("test-password");
  a.db.prepare("INSERT INTO users (id,name,email,password_hash,password_salt) VALUES ('u','Test','test@example.invalid',?,?)").run(old.hash, old.salt);
  assert.equal((await a.load("src/app/api/auth/login/route.ts").POST(loginRequest("test-password"))).status, 401);
  assert.equal(a.db.prepare("SELECT count(*) AS n FROM sessions").get().n, 0);
  assert.equal(a.db.prepare("SELECT password_hash FROM users").get().password_hash, "reset-won");
});

test("verified old session cookies survive atomic hashing migration; unverified sessions stay rejected", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rotazur-hardening-migration-"));
  fs.mkdirSync(path.join(root, "data"));
  const raw = "a".repeat(64), unverified = "b".repeat(64);
  const old = new DatabaseSync(path.join(root, "data", "rota.db"));
  old.exec("CREATE TABLE users (id TEXT PRIMARY KEY,name TEXT,email TEXT,password_hash TEXT,password_salt TEXT,avatar_url TEXT,provider TEXT,created_at TEXT); CREATE TABLE sessions (id TEXT PRIMARY KEY,user_id TEXT,expires_at TEXT,auth_version INTEGER DEFAULT 0); INSERT INTO users VALUES ('u','Test','test@example.invalid',NULL,NULL,NULL,'credentials','2026-01-01')");
  const insert = old.prepare("INSERT INTO sessions VALUES (?,'u','2999-01-01T00:00:00Z',?)");
  insert.run(raw, 1); insert.run(unverified, 0); old.close();
  const load = createLoader({ "next/headers": {} }, { ...process, cwd: () => root });
  const { db } = load("src/lib/db.ts");
  try {
    const auth = load("src/lib/auth.ts");
    assert.equal(auth.getSessionUser(raw).id, "u");
    assert.equal(auth.getSessionUser(unverified), null);
    assert.equal(db.prepare("SELECT count(*) AS n FROM sessions WHERE id = ?").get(raw).n, 0);
    assert.match(db.prepare("SELECT id FROM sessions WHERE auth_version = 1").get().id, /^sha256:[a-f0-9]{64}$/);
  } finally { db.close(); assert.equal(path.dirname(root), os.tmpdir()); fs.rmSync(root, { recursive: true, force: true }); }
});

test("document policies overwrite forged nonces, differ per request and prohibit inline event handlers", () => {
  const { middleware } = createLoader()("src/middleware.ts");
  const request = () => new NextRequest("https://example.invalid/offline", { headers: { "x-nonce": "attacker", "content-security-policy": "script-src * 'unsafe-inline'" } });
  const a = middleware(request()), b = middleware(request());
  const policy = a.headers.get("content-security-policy");
  assert.notEqual(policy, b.headers.get("content-security-policy"));
  assert.ok(!policy.includes("attacker"));
  assert.match(policy, /script-src-attr 'none'/);
  assert.match(policy, /worker-src 'self'/);
  assert.match(policy, /style-src 'self' 'unsafe-inline'/);
  assert.equal(a.headers.get("x-middleware-request-content-security-policy"), policy);
  const prod = createLoader()("src/lib/content-security.ts").contentSecurityPolicy("safe-nonce", false);
  assert.ok(!prod.includes("unsafe-eval"));
  assert.ok(!prod.split(";").map((item) => item.trim()).find((item) => item.startsWith("script-src ")).includes("unsafe-inline"));
});

test("encrypted WAL backups restore consistently and reject tampering", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rotazur-backup-test-"));
  const source = path.join(root, "source.db"), directory = path.join(root, "backups");
  const db = new DatabaseSync(source);
  try {
    db.exec("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; CREATE TABLE secrets (value TEXT); INSERT INTO secrets VALUES ('synthetic-private-value')");
    const { createEncryptedBackup, verifyEncryptedBackup } = await import("./backup-database.mjs");
    const file = await createEncryptedBackup({ source, directory });
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.includes(Buffer.from("synthetic-private-value")), false);
    assert.equal(verifyEncryptedBackup(file, directory), true);
    // Decrypt this synthetic fixture to check WAL rows, beyond integrity alone.
    const decipher = crypto.createDecipheriv("aes-256-gcm", fs.readFileSync(path.join(directory, "backup-key.bin")), bytes.subarray(8, 20));
    decipher.setAAD(bytes.subarray(0, 8)); decipher.setAuthTag(bytes.subarray(20, 36));
    const restored = path.join(root, "restored.db");
    fs.writeFileSync(restored, Buffer.concat([decipher.update(bytes.subarray(36)), decipher.final()]));
    const reopened = new DatabaseSync(restored, { readOnly: true });
    try { assert.equal(reopened.prepare("SELECT value FROM secrets").get().value, "synthetic-private-value"); }
    finally { reopened.close(); }
    bytes[bytes.length - 1] ^= 1;
    const corrupt = path.join(directory, "corrupt.rotabak"); fs.writeFileSync(corrupt, bytes);
    assert.throws(() => verifyEncryptedBackup(corrupt, directory));
    assert.equal(fs.readdirSync(directory).some((name) => /^(verify|snapshot)-/.test(name)), false);
  } finally { db.close(); assert.equal(path.dirname(root), os.tmpdir()); fs.rmSync(root, { recursive: true, force: true }); }
});

test("production checks reject insecure site URLs and malformed proxy settings without exposing values", async () => {
  const { productionProblems } = await import("./check-production.mjs");
  assert.equal(productionProblems({ NEXT_PUBLIC_SITE_URL: "https://example.invalid", TRUST_PROXY_HOPS: "1" }).length, 0);
  assert.ok(productionProblems({ NEXT_PUBLIC_SITE_URL: "http://example.invalid" }).length);
  assert.ok(productionProblems({ NEXT_PUBLIC_SITE_URL: "https://user:private@example.invalid" }).length);
  assert.ok(productionProblems({ NEXT_PUBLIC_SITE_URL: "https://example.invalid", TRUST_PROXY_HOPS: "99" }).length);
  const problems = productionProblems({ NEXT_PUBLIC_SITE_URL: "https://example.invalid", SYNC_SECRET: "private-value" });
  assert.ok(problems.length); assert.ok(!problems.join().includes("private-value"));
});
