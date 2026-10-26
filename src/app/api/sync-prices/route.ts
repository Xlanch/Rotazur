import { NextResponse } from "next/server";
import { getLatestSyncedPrices, isSyncStale, syncAllDailyPrices } from "@/lib/automation/sync-engine";
import { isAuthorizedSyncRequest } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";
  const trigger = url.searchParams.get("trigger") === "true";
  if ((force || trigger) && !isAuthorizedSyncRequest(request)) {
    return NextResponse.json({ error: "Yetkisiz senkronizasyon isteği." }, { status: 401 });
  }

  const cached = getLatestSyncedPrices();
  const stale = isSyncStale();

  // Eğer force=true veya trigger=true istendiyse ya da veri 24 saatten eskiyse arka planda başlat
  if (force || trigger) {
    if (force || trigger) {
      // Senkron bekle ve sonucu dön
      try {
        const result = await syncAllDailyPrices(force);
        return NextResponse.json({
          status: "success",
          message: "Günlük fiyatlar başarıyla senkronize edildi.",
          lastSync: result.lastSync,
          totalRoutes: result.totalRoutes,
          rates: result.rates,
        });
      } catch (err) {
        return NextResponse.json(
          { status: "error", message: "Güncelleme tamamlanamadı." },
          { status: 500 },
        );
      }
    } else {
      // Arka planda asenkron çalıştır, kullanıcıyı bekletme
      syncAllDailyPrices(false).catch((e) => console.error("[api/sync-prices] Güncelleme tamamlanamadı."));
    }
  }

  return NextResponse.json({
    status: "ok",
    lastSync: cached?.lastSync ?? null,
    isStale: stale,
    totalRoutes: cached?.totalRoutes ?? 0,
    rates: cached?.rates ?? null,
    provider: cached?.provider ?? "travelpayouts-data-api",
    priceKind: "indicative",
    nextScheduledSync: cached?.nextScheduledSync ?? null,
    timeZone: "Europe/Istanbul",
    coverage: cached?.stats ?? null,
  });
}

export async function POST(request: Request) {
  if (!isAuthorizedSyncRequest(request)) {
    return NextResponse.json({ error: "Yetkisiz senkronizasyon isteği." }, { status: 401 });
  }
  try {
    const result = await syncAllDailyPrices(true);
    return NextResponse.json({
      status: "success",
      message: "Tüm fiyatlar güncellendi.",
      lastSync: result.lastSync,
      totalRoutes: result.totalRoutes,
      rates: result.rates,
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: "Güncelleme tamamlanamadı." },
      { status: 500 },
    );
  }
}
