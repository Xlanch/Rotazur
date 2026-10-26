import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { getCity, ORIGINS } from "@/lib/cities";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest, readJsonObject, RequestError } from "@/lib/request-security";
import { getAlertStore, type StoredPriceAlert } from "@/lib/alert-store.cjs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Alarmlarınızı görmek için giriş yapın." }, { status: 401 });
  try {
    const alerts = getAlertStore(process.cwd()).list(user.id);
    return NextResponse.json({ alerts, count: alerts.length }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Alarmlar yüklenemedi." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Fiyat alarmı kurmak için giriş yapın." }, { status: 401 });
  if (!checkRateLimit("alerts:" + user.id, 10, 10 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Çok sık alarm isteği. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
  }
  try {
    const { cityId, targetPriceTry, currentPriceTry, origin = "IST" } = await readJsonObject(req);
    const city = typeof cityId === "string" ? getCity(cityId) : undefined;
    if (!city || typeof origin !== "string" || !ORIGINS.some((item) => item.code === origin)
      || typeof targetPriceTry !== "number" || !Number.isFinite(targetPriceTry) || targetPriceTry <= 0 || targetPriceTry > 10_000_000
      || typeof currentPriceTry !== "number" || !Number.isFinite(currentPriceTry) || currentPriceTry <= 0 || currentPriceTry > 10_000_000) {
      return NextResponse.json({ error: "Geçerli şehir, kalkış noktası ve pozitif fiyat bilgisi gereklidir." }, { status: 400 });
    }
    const alert: StoredPriceAlert = {
      id: crypto.randomUUID(), userId: user.id, cityId: city.id, cityName: city.name,
      origin, targetPriceTry, currentPriceTry, email: user.email,
      createdAt: new Date().toISOString(), triggered: false,
    };
    getAlertStore(process.cwd()).save(alert);
    return NextResponse.json({ ok: true, alert });
  } catch (error) {
    if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Fiyat alarmı kaydedilemedi." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Alarmlarınızı yönetmek için giriş yapın." }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id || id.length > 200) return NextResponse.json({ error: "Geçerli alarm kimliği gereklidir." }, { status: 400 });
  try {
    const store = getAlertStore(process.cwd());
    if (!store.remove(user.id, id)) return NextResponse.json({ error: "Alarm bulunamadı." }, { status: 404 });
    return NextResponse.json({ ok: true, count: store.list(user.id).length });
  } catch {
    return NextResponse.json({ error: "Alarm silinemedi." }, { status: 500 });
  }
}
