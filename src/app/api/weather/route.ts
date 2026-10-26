import { NextResponse } from "next/server";
import { CITIES } from "@/lib/cities";
import { ensureCityWeather, getLatestSyncedWeather, getCityWeather, syncAllDailyWeather } from "@/lib/automation/weather-sync-engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cityId = new URL(request.url).searchParams.get("city")?.toLowerCase().trim();
  if (cityId && !CITIES.some((city) => city.id === cityId)) {
    return NextResponse.json({ status: "error", message: "Şehir bulunamadı." }, { status: 404 });
  }
  try {
    if (cityId) {
      const city = await ensureCityWeather(cityId);
      if (!city) return NextResponse.json({ status: "error", message: "Hava durumu şu an alınamıyor." }, { status: 503 });
      return NextResponse.json({ status: "ok", city, isStale: city.expiresAt <= Date.now(), lastSync: city.current.updatedAt });
    }
    await syncAllDailyWeather();
    const cached = getLatestSyncedWeather();
    const cities = Object.fromEntries(CITIES.map((city) => [city.id, getCityWeather(city.id)]).filter(([, value]) => value));
    return NextResponse.json({ status: "ok", lastSync: cached?.lastSync, nextScheduledSync: cached?.nextScheduledSync, totalCities: Object.keys(cities).length, cities });
  } catch {
    return NextResponse.json({ status: "error", message: "Hava durumu şu an alınamıyor." }, { status: 503 });
  }
}
