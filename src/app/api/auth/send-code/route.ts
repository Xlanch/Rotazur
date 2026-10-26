import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { hashPasswordAsync } from "@/lib/passwords";
import { passwordPolicyError } from "@/lib/password-policy";
import { sendVerificationEmail } from "@/lib/email";
import { acceptAuthChallenge } from "@/lib/auth-challenge";
import { immediateTransaction } from "@/lib/db-transaction";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest, readJsonObject, RequestError } from "@/lib/request-security";
import { limitPublicRequest, normalizedEmail } from "@/lib/public-request";

export async function POST(req: Request) {
  try {
    if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
    const limited = limitPublicRequest(req, "send-code", 5, 30, 15 * 60_000);
    if (limited) return limited;
    const body = await readJsonObject(req);
    const { name, email, password } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json({ error: "Lütfen adınızı ve soyadınızı eksiksiz girin." }, { status: 400 });
    }

    const cleanEmail = normalizedEmail(email);
    if (!cleanEmail) {
      return NextResponse.json({ error: "Lütfen geçerli bir e-posta adresi girin." }, { status: 400 });
    }

    const passwordError = passwordPolicyError(password);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });


    // İstek sıklığı kontrolü (60 saniyede en fazla 2 kod talebi)
    const sendRate = checkRateLimit(`send_code:${cleanEmail}`, 2, 60 * 1000);
    if (!sendRate.allowed) {
      return NextResponse.json(
        { error: "Çok sık kod talebinde bulundunuz. Lütfen 1 dakika bekleyip tekrar deneyin." },
        { status: 429 }
      );
    }

    return await acceptAuthChallenge("register", async (code) => {
      if (db.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail)) return;
      const { salt, hash } = await hashPasswordAsync(password as string);
      const saved = immediateTransaction(() => {
        // Registration may have completed while password work was running.
        if (db.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail)) return false;
        db.prepare("DELETE FROM verification_codes WHERE email = ?").run(cleanEmail);
        db.prepare("INSERT INTO verification_codes (id,email,code,name,password_hash,password_salt,expires_at) VALUES (?,?,?,?,?,?,?)")
          .run(crypto.randomUUID(), cleanEmail, code, name.trim(), hash, salt, new Date(Date.now() + 10 * 60_000).toISOString());
        return true;
      });
      if (saved) return sendVerificationEmail(cleanEmail, code, name.trim());
    });
  } catch (err: unknown) {
    if (err instanceof RequestError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[auth] Kayıt kodu isteği tamamlanamadı.");
    return NextResponse.json({ error: "Doğrulama kodu gönderilirken bir hata oluştu." }, { status: 500 });
  }
}
