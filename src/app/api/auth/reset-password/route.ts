import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { hashPasswordAsync, verifyPasswordAsync, PasswordBusyError } from "@/lib/passwords";
import { passwordPolicyError } from "@/lib/password-policy";
import { INVALID_AUTH_CODE } from "@/lib/auth-messages";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest, readJsonObject, RequestError } from "@/lib/request-security";
import { normalizedEmail, limitPublicRequest } from "@/lib/public-request";
import { immediateTransaction } from "@/lib/db-transaction";

const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
type Credential = { password_hash: string; password_salt: string };
type ResetCode = { id: string; code: string; expires_at: string };
const sameCode = (expected: string, actual: string) => {
  const a = Buffer.from(expected), b = Buffer.from(actual);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

export async function POST(req: Request) {
  try {
    if (!isSameOriginRequest(req)) return json({ error: "Geçersiz istek kaynağı." }, 403);
    const limited = limitPublicRequest(req, "reset-password", 30, 200, 15 * 60_000);
    if (limited) return limited;
    const body = await readJsonObject(req);
    const email = normalizedEmail(body.email);
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const password = body.newPassword;
    if (!email || !/^\d{6}$/.test(code)) return json({ error: "Geçerli e-posta ve 6 haneli doğrulama kodu gereklidir." }, 400);
    const passwordError = passwordPolicyError(password);
    if (passwordError) return json({ error: passwordError }, 400);
    const rate = checkRateLimit("reset:" + email, 5, 15 * 60_000);

    // Validate OTP before expensive comparisons; release the SQLite write lock
    // before asynchronous password/history work so other users can proceed.
    const candidate = immediateTransaction(() => {
      if (!rate.allowed) {
        db.prepare("DELETE FROM password_reset_codes WHERE email = ?").run(email);
        return json({ error: "Deneme sınırı aşıldı. Lütfen daha sonra yeni bir sıfırlama kodu isteyin." }, 429);
      }
      const record = db.prepare("SELECT id,code,expires_at FROM password_reset_codes WHERE email = ? ORDER BY created_at DESC,rowid DESC LIMIT 1").get(email) as ResetCode | undefined;
      if (!record) return json({ error: INVALID_AUTH_CODE }, 400);
      const expiry = Date.parse(record.expires_at);
      if (!Number.isFinite(expiry) || expiry <= Date.now()) {
        db.prepare("DELETE FROM password_reset_codes WHERE id = ?").run(record.id);
        return json({ error: INVALID_AUTH_CODE }, 400);
      }
      if (!sameCode(record.code, code)) return json({ error: INVALID_AUTH_CODE }, 400);
      const user = db.prepare("SELECT id,provider,password_hash,password_salt FROM users WHERE email = ?").get(email) as (Credential & { id: string; provider: string }) | undefined;
      if (!user || user.provider !== "credentials" || !user.password_hash || !user.password_salt) return json({ error: INVALID_AUTH_CODE }, 400);
      const history = db.prepare("SELECT password_hash,password_salt FROM password_history WHERE user_id = ? ORDER BY created_at DESC,rowid DESC LIMIT 5").all(user.id) as Credential[];
      return { record, user, history };
    });
    if (candidate instanceof Response) return candidate;
    for (const previous of [candidate.user, ...candidate.history]) {
      if (await verifyPasswordAsync(password as string, previous.password_salt, previous.password_hash)) {
        return json({ error: "Yeni şifreniz mevcut şifrenizden ve önceki 5 şifrenizden farklı olmalıdır." }, 400);
      }
    }
    const fresh = await hashPasswordAsync(password as string);

    return immediateTransaction(() => {
      // A reset, newer code or expiry during crypto must win. Never resurrect
      // a consumed code or overwrite another successful password.
      const latest = db.prepare("SELECT id,code,expires_at FROM password_reset_codes WHERE email = ? ORDER BY created_at DESC,rowid DESC LIMIT 1").get(email) as ResetCode | undefined;
      const current = db.prepare("SELECT password_hash,password_salt FROM users WHERE id = ? AND provider = 'credentials'").get(candidate.user.id) as Credential | undefined;
      if (!latest || latest.id !== candidate.record.id || latest.expires_at !== candidate.record.expires_at
        || !(Date.parse(latest.expires_at) > Date.now()) || !sameCode(latest.code, code)
        || !current || current.password_hash !== candidate.user.password_hash || current.password_salt !== candidate.user.password_salt) {
        return json({ error: INVALID_AUTH_CODE }, 400);
      }
      db.prepare("INSERT INTO password_history(id,user_id,password_hash,password_salt) VALUES (?,?,?,?)")
        .run(crypto.randomUUID(), candidate.user.id, current.password_hash, current.password_salt);
      db.prepare("DELETE FROM password_history WHERE user_id = ? AND id NOT IN (SELECT id FROM password_history WHERE user_id = ? ORDER BY created_at DESC,rowid DESC LIMIT 5)")
        .run(candidate.user.id, candidate.user.id);
      db.prepare("UPDATE users SET password_hash = ?,password_salt = ? WHERE id = ?").run(fresh.hash, fresh.salt, candidate.user.id);
      db.prepare("DELETE FROM password_reset_codes WHERE email = ?").run(email);
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(candidate.user.id);
      resetRateLimit("reset:" + email);
      return json({ success: true, message: "Şifreniz başarıyla güncellendi! Yeni şifrenizle giriş yapabilirsiniz." });
    });
  } catch (error) {
    if (error instanceof RequestError) return json({ error: error.message }, error.status);
    if (error instanceof PasswordBusyError) return NextResponse.json({ error: "Sunucu meşgul. Lütfen birkaç saniye sonra tekrar deneyin." }, { status: 503, headers: { "Retry-After": "3", "Cache-Control": "private, no-store" } });
    console.error("[auth] Şifre sıfırlama işlemi tamamlanamadı.");
    return json({ error: "Şifre sıfırlanırken bir hata oluştu." }, 500);
  }
}
