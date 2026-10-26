import { NextRequest, NextResponse } from "next/server";
import { CITIES } from "@/lib/cities";
import { CITY_IMAGE_MAP, getCityImage } from "@/lib/providers/images";

/** ?ids=roma,paris  →  { roma: "https://...", paris: "https://..." } */
export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean);
  const list = ids.length ? CITIES.filter((c) => ids.includes(c.id)) : CITIES;
  const entries = await Promise.all(
    list.map(async (c) => [c.id, CITY_IMAGE_MAP[c.id] || (await getCityImage(c.wiki))] as const)
  );
  return NextResponse.json(Object.fromEntries(entries), {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
