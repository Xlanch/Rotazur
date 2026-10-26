import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { acceptAuthChallenge } from "@/lib/auth-challenge";
import { immediateTransaction } from "@/lib/db-transaction";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest, readJsonObject, RequestError } from "@/lib/request-security";
import { limitPublicRequest, normalizedEmail } from "@/lib/public-request";

export async function POST(req: Request) {
  try {
    if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
    const limited = limitPublicRequest(req, "forgot-password", 5, 30, 15 * 60_000);
    if (limited) return limited;
    const body = await readJsonObject(req);
    const { email } = body;

    const cleanEmail = normalizedEmail(email);
    if (!cleanEmail) {
      return NextResponse.json({ error: "Lütfen geçerli bir e-posta adresi girin." }, { status: 400 });
    }


    // İstek sıklığı kontrolü (60 saniyede en fazla 2 kod talebi)
    const sendRate = checkRateLimit(`forgot_pw:${cleanEmail}`, 2, 60 * 1000);
    if (!sendRate.allowed) {
      return NextResponse.json(
        { error: "Çok sık şifre sıfırlama talebinde bulundunuz. Lütfen 1 dakika bekleyip tekrar deneyin." },
        { status: 429 }
      );
    }

    return await acceptAuthChallenge("reset", async (code) => {
      const user = immediateTransaction(() => {
        const account = db.prepare("SELECT id,name,provider FROM users WHERE email = ?").get(cleanEmail) as { id: string; name: string; provider: string } | undefined;
        if (!account || account.provider !== "credentials") return null;
        db.prepare("DELETE FROM password_reset_codes WHERE email = ?").run(cleanEmail);
        db.prepare("INSERT INTO password_reset_codes (id,email,code,expires_at) VALUES (?,?,?,?)")
          .run(crypto.randomUUID(), cleanEmail, code, new Date(Date.now() + 10 * 60_000).toISOString());
        return account;
      });
      if (user) return sendPasswordResetEmail(cleanEmail, code, user.name || "Gezgin");
    });
  } catch (err: unknown) {
    if (err instanceof RequestError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[auth] Şifre kurtarma isteği tamamlanamadı.");
    return NextResponse.json({ error: "Şifre sıfırlama kodu gönderilirken bir hata oluştu." }, { status: 500 });
  }
}
