import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isSameOriginRequest, readJsonObject, RequestError } from "@/lib/request-security";
import { limitPublicRequest, normalizedEmail } from "@/lib/public-request";
import crypto from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
    const limited = limitPublicRequest(req, "newsletter", 5, 50);
    if (limited) return limited;

    const body = await readJsonObject(req);
    const { email, locale } = body;

    const cleanEmail = normalizedEmail(email);
    if (!cleanEmail) {
      return NextResponse.json({ error: "Lütfen geçerli bir e-posta adresi giriniz." }, { status: 400 });
    }

    const cleanLocale = locale === undefined ? "tr" : typeof locale === "string" && /^[a-z]{2}(?:-[A-Z]{2})?$/.test(locale) ? locale : null;
    if (!cleanLocale) return NextResponse.json({ error: "Geçersiz dil seçimi." }, { status: 400 });
    const id = crypto.randomUUID();

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO newsletter_subscribers (id, email, locale)
      VALUES (?, ?, ?)
    `);
    stmt.run(id, cleanEmail, cleanLocale);

    return NextResponse.json({
      status: "ok",
      message: "Haftalık gezi & rota bültenimize başarıyla kaydoldunuz!",
    });
  } catch (error) {
    if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Newsletter API error:", error);
    return NextResponse.json(
      { error: "Bültene kayıt sırasında bir hata oluştu." },
      { status: 500 }
    );
  }
}
