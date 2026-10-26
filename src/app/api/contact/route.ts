import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isSameOriginRequest, readJsonObject, RequestError } from "@/lib/request-security";
import { limitPublicRequest, normalizedEmail } from "@/lib/public-request";
import crypto from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
    const limited = limitPublicRequest(req, "contact", 5, 50);
    if (limited) return limited;

    const body = await readJsonObject(req, 32_768);
    const { name, email, subject, message } = body;

    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json({ error: "Lütfen geçerli bir isim giriniz." }, { status: 400 });
    }

    const cleanEmail = normalizedEmail(email);
    if (!cleanEmail) {
      return NextResponse.json({ error: "Lütfen geçerli bir e-posta adresi giriniz." }, { status: 400 });
    }

    if (typeof subject !== "string" || subject.trim().length < 2 || subject.trim().length > 200) {
      return NextResponse.json({ error: "Lütfen bir konu seçiniz veya yazınız." }, { status: 400 });
    }

    if (!message || typeof message !== "string" || message.trim().length < 10) {
      return NextResponse.json({ error: "Mesajınız en az 10 karakter olmalıdır." }, { status: 400 });
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: "Mesajınız 5000 karakterden uzun olamaz." }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const cleanName = name.trim();
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    const stmt = db.prepare(`
      INSERT INTO contact_messages (id, name, email, subject, message, status)
      VALUES (?, ?, ?, ?, ?, 'unread')
    `);
    stmt.run(id, cleanName, cleanEmail, cleanSubject, cleanMessage);

    return NextResponse.json({
      status: "ok",
      message: "Mesajınız bize başarıyla ulaştı. En geç 24 saat içinde yanıtlayacağız.",
    });
  } catch (error) {
    if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Contact API error:", error);
    return NextResponse.json(
      { error: "Mesajınız gönderilirken bir hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
