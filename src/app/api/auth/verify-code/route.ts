import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest, readJsonObject, RequestError } from "@/lib/request-security";
import { normalizedEmail, limitPublicRequest } from "@/lib/public-request";
import { immediateTransaction } from "@/lib/db-transaction";
import { INVALID_AUTH_CODE } from "@/lib/auth-messages";

const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(req: Request) {
  try {
    if (!isSameOriginRequest(req)) return json({ error: "Geçersiz istek kaynağı." }, 403);
    const limited = limitPublicRequest(req, "verify-code", 30, 200, 15 * 60_000);
    if (limited) return limited;
    const body = await readJsonObject(req);
    const email = normalizedEmail(body.email);
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!email || !/^\d{6}$/.test(code)) return json({ error: "Geçerli e-posta ve 6 haneli doğrulama kodu gereklidir." }, 400);
    const rate = checkRateLimit("verify:" + email, 5, 15 * 60_000);
    return immediateTransaction(() => {
      if (!rate.allowed) {
        db.prepare("DELETE FROM verification_codes WHERE email = ?").run(email);
        return json({ error: "Deneme sınırı aşıldı. Lütfen daha sonra yeni bir doğrulama kodu isteyin." }, 429);
      }
      const record = db.prepare("SELECT id, code, name, password_hash, password_salt, expires_at FROM verification_codes WHERE email = ? ORDER BY created_at DESC, rowid DESC LIMIT 1")
        .get(email) as { id: string; code: string; name: string; password_hash: string; password_salt: string; expires_at: string } | undefined;
      if (!record) return json({ error: INVALID_AUTH_CODE }, 400);
      const expiry = Date.parse(record.expires_at);
      if (!Number.isFinite(expiry) || expiry <= Date.now()) {
        db.prepare("DELETE FROM verification_codes WHERE id = ?").run(record.id);
        return json({ error: INVALID_AUTH_CODE }, 400);
      }
      const expected = Buffer.from(record.code), actual = Buffer.from(code);
      if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return json({ error: INVALID_AUTH_CODE }, 400);
      if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) {
        db.prepare("DELETE FROM verification_codes WHERE email = ?").run(email);
        return json({ error: INVALID_AUTH_CODE }, 400);
      }
      const userId = crypto.randomUUID();
      db.prepare("INSERT INTO users (id, name, email, password_hash, password_salt, provider) VALUES (?, ?, ?, ?, ?, 'credentials')")
        .run(userId, record.name, email, record.password_hash, record.password_salt);
      db.prepare("DELETE FROM verification_codes WHERE email = ?").run(email);
      const { token, expiresAt } = createSession(userId);
      resetRateLimit("verify:" + email);
      const response = json({ success: true, user: { id: userId, name: record.name, email, avatarUrl: null, provider: "credentials" } });
      response.cookies.set(SESSION_COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
      return response;
    });
  } catch (error) {
    if (error instanceof RequestError) return json({ error: error.message }, error.status);
    console.error("[auth] Kod doğrulama işlemi tamamlanamadı.");
    return json({ error: "Kod doğrulanırken bir hata oluştu." }, 500);
  }
}
