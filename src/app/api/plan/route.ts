import { NextRequest, NextResponse } from "next/server";
import { buildPlan } from "@/lib/planner";
import { parseSearch } from "@/lib/search";
import { getCity } from "@/lib/cities";
import { cached } from "@/lib/server-utils";
import { planIdentity } from "@/lib/saved-plans";
import { limitSearchRequest } from "@/lib/search-security";
import { bookingDevice } from "@/lib/booking-context";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const input = parseSearch(Object.fromEntries(req.nextUrl.searchParams));
  if (!input.destination) return NextResponse.json({ error: "Hedef şehir seçilmedi" }, { status: 400 });
  if (!getCity(input.destination)) return NextResponse.json({ error: "Şehir bulunamadı" }, { status: 404 });
  try {
    const limited = limitSearchRequest(req, "plan");
    if (limited) return limited;
    const ttl = process.env.HOTEL_PRICE_PROVIDER === "booking-serpapi" ? 0 : 5 * 60_000;
    const device = bookingDevice(req.headers.get("user-agent"));
    return NextResponse.json(await cached(`plan:${planIdentity(input)}:${process.env.HOTEL_PRICE_PROVIDER || "default"}:${device}`, ttl, () => buildPlan(input, { device })), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[plan] Plan oluşturulamadı:", e);
    return NextResponse.json({ error: "Plan oluşturulamadı. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
