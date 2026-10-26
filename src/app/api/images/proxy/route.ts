import { NextRequest, NextResponse } from "next/server";
import { cityImageUrl } from "@/lib/providers/images";
import { cached, readResponseBytes } from "@/lib/server-utils";

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get("city")?.toLowerCase() || "";
  const imageUrl = cityImageUrl(city);
  try {
    const image = await cached(`city-image:${imageUrl}`, 86400_000, async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(imageUrl, {
          headers: { "User-Agent": "RotaCanvas/2.0" },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) {
          await res.body?.cancel();
          throw new Error("Image unavailable");
        }
        const contentType = res.headers.get("content-type")?.split(";")[0].trim().toLowerCase() || "";
        if (!["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"].includes(contentType)) {
          await res.body?.cancel();
          throw new Error("Invalid image response");
        }
        const buffer = new Uint8Array(await readResponseBytes(res, 4 * 1024 * 1024)).buffer;
        return { buffer, contentType };
      } finally { clearTimeout(timeout); controller.abort(); }
    });

    return new Response(image.buffer, {
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Şehir görseli yüklenemedi." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
