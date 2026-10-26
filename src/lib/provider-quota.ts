import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { db } from "./db";
import { immediateTransaction } from "./db-transaction";

const HOUR = 3600_000;
const WINDOW = 31 * 24 * HOUR;
function verifiedFreeHourlyLimit(now: number): number {
  try {
    const file = path.join(process.cwd(), "data", "booking-snapshots", "account-allowance.json");
    if (fs.statSync(file).size > 2000) return 45;
    const a = JSON.parse(fs.readFileSync(file, "utf8"));
    const age = now - Date.parse(a.checkedAt);
    if (a.version !== 1 || a.monthlyPrice !== 0 || a.monthlyLimit !== 250 || a.extraCredits !== 0 || !Number.isInteger(a.hourlyLimit) || age < -60_000 || age > HOUR || !Number.isFinite(age)) return 45;
    return Math.max(1, Math.min(200, a.hourlyLimit - 5));
  } catch { return 45; }
}
export class ProviderQuotaError extends Error {}

/** Conservative limits for this installation, shared by flights/hotels and all workers.
 * This cannot account for the same API key being used in other applications. */
export function reserveSerpApiSearch(now = Date.now(), hourlyLimit = 45): void {
  // Only the local one-time importer supplies a different limit, after checking
  // the actual zero-cost account allowance. Web requests retain 45/hour.
  if (!Number.isInteger(hourlyLimit) || hourlyLimit < 1 || hourlyLimit > 200) throw new ProviderQuotaError("Geçersiz arama sınırı.");
  const effectiveHourlyLimit = hourlyLimit === 45 ? verifiedFreeHourlyLimit(now) : hourlyLimit;
  const allowed = immediateTransaction(() => {
    db.exec("CREATE TABLE IF NOT EXISTS provider_search_usage (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS provider_search_usage_time ON provider_search_usage(created_at);");
    db.prepare("DELETE FROM provider_search_usage WHERE created_at <= ?").run(now - WINDOW);
    const count = db.prepare("SELECT count(*) AS total, COALESCE(sum(CASE WHEN created_at > ? THEN 1 ELSE 0 END), 0) AS hourly FROM provider_search_usage").get(now - HOUR) as { total: number; hourly: number };
    if (count.total >= 200 || count.hourly >= effectiveHourlyLimit) return false;
    db.prepare("INSERT INTO provider_search_usage (id, created_at) VALUES (?, ?)").run(crypto.randomUUID(), now);
    return true;
  });
  if (!allowed) throw new ProviderQuotaError("Canlı arama kotası doldu. Yeni dış servis isteği gönderilmedi.");
}
