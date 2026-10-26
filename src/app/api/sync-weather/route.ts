import { NextResponse } from "next/server";
import { isAuthorizedSyncRequest } from "@/lib/request-security";
import {
  getLatestSyncedWeather,
  isWeatherSyncStale,
  syncAllDailyWeather,
  getNext0400AmIso,
} from "@/lib/automation/weather-sync-engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";
  const trigger = url.searchParams.get("trigger") === "true";
  if ((force || trigger) && !isAuthorizedSyncRequest(request)) {
    return NextResponse.json({ error: "Yetkisiz senkronizasyon isteği." }, { status: 401 });
  }

  const cached = getLatestSyncedWeather();
  const stale = isWeatherSyncStale();

  // Eğer force=true veya trigger=true istendiyse ya da veri 04:00 itibarıyla eskiyse senkronize et
  if (force || trigger || stale || !cached) {
    if (force || !cached) {
      try {
        const result = await syncAllDailyWeather(force);
        return NextResponse.json({
          status: "success",
          message: "Tüm ülke ve şehirlerin hava durumu başarıyla senkronize edildi.",
          lastSync: result.lastSync,
          nextScheduledSync: result.nextScheduledSync,
          totalCities: result.totalCities,
        });
      } catch (err) {
        return NextResponse.json(
          { status: "error", message: (err as Error).message },
          { status: 500 },
        );
      }
    } else {
      // Arka planda çalıştır
      syncAllDailyWeather(false).catch((e) =>
        console.error("[api/sync-weather] Arka plan senkronizasyon hatası:", e),
      );
    }
  }

  return NextResponse.json({
    status: "ok",
    lastSync: cached?.lastSync ?? null,
    nextScheduledSync: cached?.nextScheduledSync ?? getNext0400AmIso(),
    isStale: stale,
    totalCities: cached?.totalCities ?? 0,
  });
}

export async function POST(request: Request) {
  if (!isAuthorizedSyncRequest(request)) {
    return NextResponse.json({ error: "Yetkisiz senkronizasyon isteği." }, { status: 401 });
  }
  try {
    const result = await syncAllDailyWeather(true);
    return NextResponse.json({
      status: "success",
      message: "Tüm şehirlerin hava durumu ve iklim rehberi sıfırdan güncellendi.",
      lastSync: result.lastSync,
      nextScheduledSync: result.nextScheduledSync,
      totalCities: result.totalCities,
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: (err as Error).message },
      { status: 500 },
    );
  }
}
