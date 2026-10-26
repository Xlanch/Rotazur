import { NextRequest, NextResponse } from "next/server";
import { sendItineraryEmail, type ItineraryEmailPayload } from "@/lib/email";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest, readJsonObject, RequestError } from "@/lib/request-security";

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "E-posta göndermek için giriş yapın." }, { status: 401 });
  if (!checkRateLimit(`plan-email:${user.id}`, 3, 10 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "E-posta gönderim sınırına ulaştınız. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
  }
  try {
    const body = await readJsonObject(req, 64 * 1024) as unknown as ItineraryEmailPayload;
    if (typeof body.toEmail !== "string" || body.toEmail.length > 254 || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(body.toEmail)) {
      return NextResponse.json({ error: "Geçerli bir e-posta adresi giriniz." }, { status: 400 });
    }

    const res = await sendItineraryEmail(body);
    if (!res.ok) {
      return NextResponse.json({ error: res.error || "E-posta gönderilemedi." }, { status: 400 });
    }

    return NextResponse.json(res);
  } catch (e) {
    if (e instanceof RequestError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "E-posta isteği işlenemedi." }, { status: 500 });
  }
}
