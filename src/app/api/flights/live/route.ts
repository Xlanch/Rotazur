import { NextRequest, NextResponse } from "next/server";
import { getCity, getOrigin } from "@/lib/cities";
import { searchFlights } from "@/lib/providers/flights";
import { getRates } from "@/lib/providers/currency";
import { isIsoDate, nightsBetween } from "@/lib/travel-utils";
import { limitSearchRequest } from "@/lib/search-security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const originParam = (searchParams.get("origin") || "IST").toUpperCase();
    const destinationParam = searchParams.get("destination") || searchParams.get("dest") || "atina";
    const start = searchParams.get("start") || searchParams.get("departureDate") || "";
    const end = searchParams.get("end") || searchParams.get("returnDate") || "";

    if (!isIsoDate(start) || !isIsoDate(end) || end <= start || nightsBetween(start, end) > 14) {
      return NextResponse.json(
        { error: "Lütfen 'start' (gidiş) ve 'end' (dönüş) tarihlerini YYYY-AA-GG formatında belirtin." },
        { status: 400 },
      );
    }

    const city = getCity(destinationParam);
    if (!city) {
      return NextResponse.json(
        { error: `Hedef şehir veya havalimanı ('${destinationParam}') bulunamadı.` },
        { status: 404 },
      );
    }

    const origin = getOrigin(originParam);
    const limited = limitSearchRequest(req, "flights");
    if (limited) return limited;
    const rates = await getRates();
    const travelers = Math.min(9, Math.max(1, Math.trunc(Number(searchParams.get("travelers"))) || 1));
    const result = await searchFlights(city, origin, start, end, rates.EUR, travelers);

    return NextResponse.json({
      success: true,
      origin: origin.code,
      destination: city.iata,
      destinationCity: city.name,
      start,
      end,
      live: result.live,
      count: result.flights.length,
      flights: result.flights,
    });
  } catch (error) {
    console.error("[flights] Uçuş araması başarısız:", error);
    return NextResponse.json(
      { success: false, error: "Uçuş araması sırasında hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 },
    );
  }
}
