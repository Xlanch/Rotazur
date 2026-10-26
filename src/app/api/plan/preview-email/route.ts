import { NextRequest, NextResponse } from "next/server";
import { renderItineraryHtml, type ItineraryEmailPayload } from "@/lib/email";
import { isSameOriginRequest, readJsonObject, RequestError } from "@/lib/request-security";
import { limitPublicRequest } from "@/lib/public-request";

export async function POST(req: NextRequest) {
  try {
    if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
    const limited = limitPublicRequest(req, "guide-preview", 10, 60);
    if (limited) return limited;
    const raw = await readJsonObject(req, 64 * 1024);
    const textFields = ["toEmail", "cityName", "country", "flag", "datesText", "budgetTier", "totalCostText", "flightSummary", "hotelSummary", "planUrl"];
    const strings = (value: unknown, max: number) => Array.isArray(value) && value.length <= max && value.every((item) => typeof item === "string" && item.length <= 4000);
    if (!textFields.every((key) => typeof raw[key] === "string" && (raw[key] as string).length <= 4000)
      || !Number.isInteger(raw.travelers) || Number(raw.travelers) < 1 || Number(raw.travelers) > 9
      || !strings(raw.restaurantsSummary, 20) || !Array.isArray(raw.daysSummary) || raw.daysSummary.length > 15
      || !raw.daysSummary.every((day) => day && typeof day === "object" && typeof day.dayTitle === "string" && day.dayTitle.length <= 500 && strings(day.items, 60))) {
      return NextResponse.json({ error: "Önizleme verisi eksik veya geçersiz." }, { status: 400 });
    }
    const body = raw as unknown as ItineraryEmailPayload;
    const html = renderItineraryHtml(body);

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof RequestError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Önizleme oluşturulamadı." }, { status: 500 });
  }
}
