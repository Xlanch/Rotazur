import { NextRequest, NextResponse } from "next/server";
import { discover } from "@/lib/planner";
import { parseSearch } from "@/lib/search";
import { limitSearchRequest } from "@/lib/search-security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const input = parseSearch(Object.fromEntries(req.nextUrl.searchParams));
  try {
    const limited = limitSearchRequest(req, "discover");
    if (limited) return limited;
    return NextResponse.json({ input, items: await discover(input) });
  } catch (e) {
    console.error("[discover] Şehirler yüklenemedi:", e);
    return NextResponse.json({ error: "Şehirler yüklenemedi. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
