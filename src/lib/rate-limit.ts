import "server-only";
import { createHash } from "node:crypto";
import { db } from "./db";

let nextCleanup = 0;
const digest = (key: string) => createHash("sha256").update(key).digest("hex");

/** Atomic counters shared by every worker and retained across restarts. */
export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): {
  allowed: boolean; remaining: number; resetInMs: number;
} {
  const now = Date.now();
  if (now >= nextCleanup) {
    db.prepare("DELETE FROM rate_limits WHERE reset_at <= ?").run(now);
    nextCleanup = now + 60_000;
  }
  const hash = digest(key);
  const row = db.prepare(`
    INSERT INTO rate_limits (key_hash, count, reset_at) VALUES (?, 1, ?)
    ON CONFLICT(key_hash) DO UPDATE SET
      count = CASE WHEN reset_at <= ? THEN 1 ELSE count + 1 END,
      reset_at = CASE WHEN reset_at <= ? THEN ? ELSE reset_at END
    WHERE reset_at <= ? OR count < ?
    RETURNING count, reset_at
  `).get(hash, now + windowMs, now, now, now + windowMs, now, maxAttempts) as { count: number; reset_at: number } | undefined;
  if (row) return { allowed: true, remaining: Math.max(0, maxAttempts - row.count), resetInMs: Math.max(0, row.reset_at - now) };
  const blocked = db.prepare("SELECT reset_at FROM rate_limits WHERE key_hash = ?").get(hash) as { reset_at: number } | undefined;
  return { allowed: false, remaining: 0, resetInMs: Math.max(0, (blocked?.reset_at ?? now + windowMs) - now) };
}

export function resetRateLimit(key: string): void {
  db.prepare("DELETE FROM rate_limits WHERE key_hash = ?").run(digest(key));
}
