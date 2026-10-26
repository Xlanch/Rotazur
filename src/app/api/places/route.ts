import { NextRequest, NextResponse } from "next/server";
import { getCity } from "@/lib/cities";
import { getCheapPlaces } from "@/lib/providers/places";
import { limitSearchRequest } from "@/lib/search-security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const city = getCity(req.nextUrl.searchParams.get("city") ?? "");
  if (!city) return NextResponse.json({ error: "Şehir bulunamadı" }, { status: 404 });
  try {
    const limited = limitSearchRequest(req, "places");
    if (limited) return limited;
    return NextResponse.json(await getCheapPlaces(city));
  } catch (error) {
    console.error("[places] Mekanlar yüklenemedi:", error);
    return NextResponse.json({ error: "Mekanlar yüklenemedi. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
