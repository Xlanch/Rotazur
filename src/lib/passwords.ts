import "server-only";
import crypto from "node:crypto";

// OWASP's 16 MiB scrypt profile. The parallelization cost is five times the
// old Node default, without requiring 128 MiB per concurrent login.
const OPTIONS = { N: 16384, r: 8, p: 5, maxmem: 32 * 1024 * 1024 };
const PREFIX = "scrypt$v1$16384$8$5$";
const HEX_HASH = /^[a-f0-9]{128}$/;
const HEX_SALT = /^[a-f0-9]{32}$/;
let running = 0;
export class PasswordBusyError extends Error {}

function storedHash(hash: string): { digest: string; legacy: boolean } | null {
  if (HEX_HASH.test(hash)) return { digest: hash, legacy: true };
  const digest = hash.startsWith(PREFIX) ? hash.slice(PREFIX.length) : "";
  // Never execute arbitrary cost parameters read from the database.
  return HEX_HASH.test(digest) ? { digest, legacy: false } : null;
}

function matches(actual: Buffer, digest: string): boolean {
  const expected = Buffer.from(digest, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function passwordNeedsUpgrade(hash: string): boolean {
  return storedHash(hash)?.legacy === true;
}

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  return { salt, hash: PREFIX + crypto.scryptSync(password, salt, 64, OPTIONS).toString("hex") };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const stored = storedHash(hash);
  if (!stored || !HEX_SALT.test(salt)) return false;
  try {
    return matches(crypto.scryptSync(password, salt, 64, stored.legacy ? undefined : OPTIONS), stored.digest);
  } catch { return false; }
}

function derive(password: string, salt: string, legacy = false): Promise<Buffer> {
  if (running >= 4) return Promise.reject(new PasswordBusyError("Parola işlemleri meşgul."));
  running++;
  return new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, legacy ? {} : OPTIONS, (error, key) => error ? reject(error) : resolve(key));
  }).finally(() => {
    running--;
  });
}

export async function hashPasswordAsync(password: string): Promise<{ salt: string; hash: string }> {
  const salt = crypto.randomBytes(16).toString("hex");
  return { salt, hash: PREFIX + (await derive(password, salt)).toString("hex") };
}

export async function verifyPasswordAsync(password: string, salt: string, hash: string): Promise<boolean> {
  const stored = storedHash(hash);
  if (!stored || !HEX_SALT.test(salt)) return false;
  try { return matches(await derive(password, salt, stored.legacy), stored.digest); }
  catch (error) {
    if (error instanceof PasswordBusyError) throw error;
    return false;
  }
}

/** Equalize legacy/current/missing-account login work. Otherwise the old p=1
 * format would reveal an existing legacy account through faster wrong logins. */
export async function verifyLoginPasswordAsync(password: string, salt: string, hash: string): Promise<boolean> {
  const stored = storedHash(hash);
  const validSalt = HEX_SALT.test(salt);
  const workingSalt = validSalt ? salt : "0".repeat(32);
  const modern = await derive(password, workingSalt);
  const legacy = await derive(password, workingSalt, true);
  return !!stored && validSalt && matches(stored.legacy ? legacy : modern, stored.digest);
}

// Unknown accounts perform the same two bounded crypto operations as real ones.
export function checkUnknownPassword(password: string): Promise<boolean> {
  return verifyLoginPasswordAsync(password, "0".repeat(32), PREFIX + "0".repeat(128));
}
